import { describe, expect, it } from 'vitest';
import type { Child, FinancialProfile, InvestmentAccount } from '../types';
import { defaultProfile } from '../data';
import { annualToMonthly, toReal, simulate, findRetirement, compareScenarios, applyScenario, optimizeRetirement, additionalSavingsForTarget, validateProfile, parseProfile } from '../engine';

function account(patch: Partial<InvestmentAccount> = {}): InvestmentAccount {
  return { id: 'cash', name: 'Cash', type: 'bank', balance: 0, monthlyContribution: 0, annualReturn: 0, annualFee: 0, contributionGrowth: 0, accessibleAge: 0, withdrawalPriority: 1, taxRate: 0, ...patch };
}
function child(patch: Partial<Child> = {}): Child {
  return { id: 'child', name: 'Child', currentAge: 5, monthlySupport: 0, supportEndAge: 18, annualEducationCost: 0, educationStartAge: 6, educationEndAge: 18, universityAmount: 0, universityStartAge: 18, educationInflation: 0, gifts: [], costsIncludedInHousehold: false, ...patch };
}
function profile(patch: Partial<FinancialProfile> = {}): FinancialProfile {
  const p = structuredClone(defaultProfile);
  return { ...p, currentAge: 40, currentYear: 2026, lifeExpectancy: 41, monthlyIncome: 10000, monthlyExpenses: 0, monthlySavings: 0, annualSavingsGrowth: 0, annualIncomeGrowth: 0, inflation: 0, targetRetirementAge: undefined, accounts: [account()], children: [], liabilities: [], retirement: { monthlySpending: 0, annualTravel: 0, annualHealthcare: 0, emergencyReserve: 0, oneTimePurchase: 0, valuesInTodaysMoney: true, spendingChanges: [] }, legacy: { perChild: 0, totalAmount: 0, otherBeneficiaries: 0, charity: 0, distributionAge: 41, valuesInTodaysMoney: true }, ...patch };
}
const last = <T>(items: T[]) => items[items.length - 1];

describe('effective returns and savings cash flows', () => {
  it('converts effective annual rates geometrically, including zero and negative rates', () => {
    expect(Math.pow(1 + annualToMonthly(0.12), 12)).toBeCloseTo(1.12, 12);
    expect(annualToMonthly(0)).toBe(0);
    expect(Math.pow(1 + annualToMonthly(-0.5), 12)).toBeCloseTo(0.5, 12);
    expect(Math.pow(1 + annualToMonthly(-0.999), 12)).toBeCloseTo(0.001, 12);
    expect(() => annualToMonthly(-1)).toThrow();
    expect(() => annualToMonthly(Infinity)).toThrow();
  });
  it('compounds a known RM1,000 balance to RM1,120 after twelve months', () => {
    const p = profile({ accounts: [account({ balance: 1000, annualReturn: 0.12 })] });
    expect(simulate(p, 41).endingAssets).toBeCloseTo(1120, 8);
  });
  it('applies contributions before monthly growth using the independently derived annuity-due formula', () => {
    const p = profile({ monthlySavings: 100, accounts: [account({ annualReturn: 0.12, monthlyContribution: 100 })] });
    const r = Math.pow(1.12, 1 / 12) - 1;
    const expected = 100 * ((Math.pow(1 + r, 12) - 1) / r) * (1 + r);
    const result = simulate(p, 41);
    expect(result.endingAssets).toBeCloseTo(expected, 7);
    expect(result.totalContributions).toBeCloseTo(1200, 8);
  });
  it('never adds account allocations on top of the total savings budget', () => {
    const p = profile({ monthlySavings: 100, accounts: [account({ monthlyContribution: 80 }), account({ id: 'etf', type: 'etf', monthlyContribution: 80 })] });
    const result = simulate(p, 41);
    expect(result.endingAssets).toBeCloseTo(1200, 8);
    expect(last(result.points).cash).toBeCloseTo(600, 8);
    expect(last(result.points).stocks).toBeCloseTo(600, 8);
  });
  it('puts unallocated savings into accessible cash, including with no configured accounts', () => {
    expect(simulate(profile({ monthlySavings: 100, accounts: [] }), 41).endingAssets).toBeCloseTo(1200, 8);
  });
  it('supports percentage-of-income savings and annual income growth', () => {
    const p = profile({ monthlyIncome: 1000, savingsMode: 'percentage', savingsPercent: 0.1, annualIncomeGrowth: 0.12 });
    const ratio = Math.pow(1.12, 1 / 12);
    expect(simulate(p, 41).endingAssets).toBeCloseTo(100 * (Math.pow(ratio, 12) - 1) / (ratio - 1), 7);
  });
  it('tracks independent accounts and distinguishes restricted assets', () => {
    const p = profile({ lifeExpectancy: 42, accounts: [account({ balance: 1000, annualReturn: 0.1 }), account({ id: 'epf', type: 'epf', balance: 2000, annualReturn: 0.05, accessibleAge: 55 })] });
    const final = last(simulate(p, 42).points);
    expect(final.totalAssets).toBeCloseTo(1000 * 1.1 ** 2 + 2000 * 1.05 ** 2, 7);
    expect(final.accessibleAssets).toBeCloseTo(1210, 7);
    expect(final.restrictedAssets).toBeCloseTo(2205, 7);
  });
  it('deducts fees geometrically and taxes only positive growth after fees', () => {
    const p = profile({ accounts: [account({ balance: 1000, annualReturn: 0.12, annualFee: 0.02, taxRate: 0.2 })] });
    const monthlyAfterFeeReturn = Math.pow(1.12 * 0.98, 1 / 12) - 1;
    expect(simulate(p, 41).endingAssets).toBeCloseTo(1000 * Math.pow(1 + monthlyAfterFeeReturn * 0.8, 12), 7);
    p.accounts[0].annualReturn = -0.5;
    expect(simulate(p, 41).endingAssets).toBeCloseTo(490, 7);
  });
  it('never creates negative balances or charges losses as negative taxes', () => {
    const p = profile({ accounts: [account({ balance: 1000, annualReturn: -0.99, taxRate: 0.5 })] });
    p.retirement.monthlySpending = 1000;
    const result = simulate(p, 40);
    expect(result.feasible).toBe(false);
    expect(result.points.every(point => point.totalAssets >= 0 && Number.isFinite(point.netWorth))).toBe(true);
  });
  it('accepts effective returns and growth strictly above negative 100%, including negative 99.9%', () => {
    const p = profile({ annualIncomeGrowth: -0.999, annualSavingsGrowth: -0.999, accounts: [account({ balance: 1000, annualReturn: -0.999, contributionGrowth: -0.999 })] });
    expect(validateProfile(p)).toEqual([]);
    expect(parseProfile(p).accounts[0].annualReturn).toBe(-0.999);
    expect(simulate(p, 41).endingAssets).toBeCloseTo(1, 9);
    const changed = applyScenario(p, { returnAdjustment: -0.1, inflationAdjustment: 0, contributionGrowthAdjustment: -0.1, spendingMultiplier: 1, feeAdjustment: 0 });
    expect(changed.accounts[0].annualReturn).toBeGreaterThan(-1);
    expect(validateProfile(changed)).toEqual([]);
  });
});

describe('retirement, access, inflation and required capital', () => {
  it('funds exact twelve-month retirement expenses and detects depletion', () => {
    const p = profile({ accounts: [account({ balance: 1200 })] }); p.retirement.monthlySpending = 100;
    const exact = simulate(p, 40);
    expect(exact.feasible).toBe(true); expect(exact.endingAssets).toBeCloseTo(0, 8);
    p.accounts[0].balance = 1100;
    const short = simulate(p, 40);
    expect(short.feasible).toBe(false); expect(short.shortfall).toBeCloseTo(100, 8); expect(short.firstDepletionAge).toBeCloseTo(41, 8);
  });
  it('does not fund early retirement from inaccessible EPF even when net worth is high', () => {
    const p = profile({ accounts: [account({ type: 'epf', balance: 1000000, accessibleAge: 55 })] }); p.retirement.monthlySpending = 100;
    const result = simulate(p, 40);
    expect(result.feasible).toBe(false); expect(result.shortfall).toBeCloseTo(1200, 7);
    expect(result.retirementAccessibleAssets).toBe(0); expect(result.retirementAssets).toBe(1000000);
  });
  it('uses newly eligible balances at the configured monthly age', () => {
    const p = profile({ accounts: [account({ balance: 500 }), account({ id: 'epf', type: 'epf', balance: 700, accessibleAge: 40.5 })] }); p.retirement.monthlySpending = 100;
    const result = simulate(p, 40);
    expect(result.feasible).toBe(true); expect(result.endingAssets).toBeCloseTo(0, 7);
    expect(result.requiredCapital).toBeCloseTo(500, 1);
  });
  it('respects user withdrawal priorities', () => {
    const p = profile({ accounts: [account({ id: 'bank', balance: 1200, withdrawalPriority: 2 }), account({ id: 'epf', type: 'epf', balance: 1200, withdrawalPriority: 1 })] }); p.retirement.monthlySpending = 100;
    const final = last(simulate(p, 40).points);
    expect(final.epf).toBeCloseTo(0, 8); expect(final.cash).toBeCloseTo(1200, 8);
  });
  it('uses inflation from today for real-value spending and fixed nominal spending otherwise', () => {
    const p = profile({ inflation: 0.12, accounts: [account({ balance: 5000 })] }); p.retirement.monthlySpending = 100;
    const ratio = Math.pow(1.12, 1 / 12);
    expect(simulate(p, 40).endingAssets).toBeCloseTo(5000 - 100 * (Math.pow(ratio, 12) - 1) / (ratio - 1), 7);
    p.retirement.valuesInTodaysMoney = false;
    expect(simulate(p, 40).endingAssets).toBeCloseTo(3800, 8);
    expect(toReal(1120, 0.12, 1)).toBeCloseTo(1000, 10);
  });
  it('finds required accessible capital from withdrawals, legacy and retained reserve', () => {
    const p = profile({ accounts: [account({ balance: 5000 })] }); p.retirement.monthlySpending = 100; p.retirement.emergencyReserve = 500; p.legacy.totalAmount = 1000;
    const result = simulate(p, 40);
    expect(result.requiredCapital).toBeCloseTo(2700, 1);
    expect(result.retirementAccessibleAssets).toBe(5000);
    expect(result.endingAssets).toBeCloseTo(2800, 8);
  });
  it('maintains emergency reserve throughout retirement, not just at the end', () => {
    const p = profile({ accounts: [account({ balance: 1000, annualReturn: 1 })] }); p.retirement.emergencyReserve = 1100;
    const result = simulate(p, 40);
    expect(result.endingAssets).toBeCloseTo(2000, 7); expect(result.feasible).toBe(false);
    expect(result.warnings.some(w => w.includes('reserve'))).toBe(true);
  });
  it('applies spending changes and the retirement one-time purchase once', () => {
    const p = profile({ accounts: [account({ balance: 10000 })] }); p.retirement.monthlySpending = 100; p.retirement.oneTimePurchase = 500; p.retirement.spendingChanges = [{ age: 40.5, monthlyChange: -50 }];
    expect(simulate(p, 40).endingAssets).toBeCloseTo(8600, 8);
    expect(simulate(p, 40.5).monthlyRetirementSpending).toBe(50);
  });
  it('searches monthly instead of inventing an age for an unfundable plan', () => {
    const p = profile(); p.retirement.monthlySpending = 100;
    expect(findRetirement(p).retirementAge).toBeNull();
    p.monthlySavings = 100;
    expect(findRetirement(p).retirementAge).toBeCloseTo(40.5, 8);
  });
  it('does not assume retirement feasibility remains monotonic at later ages', () => {
    const p = profile({ lifeExpectancy: 42, accounts: [account({ balance: 5000, annualReturn: -0.5 })] }); p.retirement.oneTimePurchase = 4000;
    expect(simulate(p, 40).feasible).toBe(true);
    expect(simulate(p, 41).feasible).toBe(false);
    expect(findRetirement(p).retirementAge).toBe(40);
  });
});

describe('children and legacy timing', () => {
  it('charges each child independently and stops support at the child age limit', () => {
    const p = profile({ accounts: [account({ balance: 10000 })], children: [child({ monthlySupport: 100 }), child({ id: 'second', currentAge: 17.5, monthlySupport: 200 })] });
    const result = simulate(p, 40);
    expect(result.childCosts).toBeCloseTo(2400, 8); expect(result.endingAssets).toBeCloseTo(7600, 8);
  });
  it('never charges planned children before birth', () => {
    const p = profile({ lifeExpectancy: 42, accounts: [account({ balance: 10000 })], children: [child({ plannedBirthYear: 2027, monthlySupport: 100 })] });
    const result = simulate(p, 40);
    expect(result.childCosts).toBeCloseTo(1200, 8);
    expect(result.points.filter(point => point.age <= 41).reduce((sum, point) => sum + point.childSupport, 0)).toBe(0);
    expect(result.points.find(point => point.age === 41)?.milestones).toContain('Child birth');
  });
  it('charges annual education monthly, university once, and gifts at exact child ages', () => {
    const p = profile({ accounts: [account({ balance: 10000 })], children: [child({ currentAge: 17.5, annualEducationCost: 1200, educationStartAge: 6, educationEndAge: 18, universityAmount: 1000, gifts: [{ id: 'gift', age: 18, amount: 500 }] })] });
    const result = simulate(p, 40);
    expect(result.childCosts).toBeCloseTo(2100, 8);
    expect(result.points.reduce((sum, point) => sum + point.education, 0)).toBeCloseTo(1600, 8);
    expect(result.points.reduce((sum, point) => sum + point.gifts, 0)).toBeCloseTo(500, 8);
  });
  it('applies education inflation independently from household inflation', () => {
    const p = profile({ accounts: [account({ balance: 10000 })], children: [child({ currentAge: 17, universityAmount: 1000, educationInflation: 0.1 })] });
    expect(simulate(p, 40).childCosts).toBeCloseTo(1100, 8);
  });
  it('excludes child costs already in the household budget', () => {
    const p = profile({ accounts: [account({ balance: 10000 })], children: [child({ monthlySupport: 100, annualEducationCost: 1200, costsIncludedInHousehold: true })] });
    expect(simulate(p, 40).childCosts).toBe(0);
  });
  it('reduces working savings for family costs without counting the savings twice', () => {
    const p = profile({ monthlySavings: 200, accounts: [account({ monthlyContribution: 200 })], children: [child({ monthlySupport: 100 })] });
    const result = simulate(p, 41);
    expect(result.totalContributions).toBeCloseTo(1200, 8); expect(result.endingAssets).toBeCloseTo(1200, 8);
  });
  it('tests the legacy at the future distribution date after investment growth', () => {
    const p = profile({ accounts: [account({ balance: 1000, annualReturn: 0.12 })] }); p.legacy.totalAmount = 1120;
    const result = simulate(p, 40);
    expect(result.inheritanceMet).toBe(true); expect(result.inheritanceFunded).toBeCloseTo(1120, 8);
    expect(result.requiredCapital).toBeCloseTo(1000, 1); expect(result.endingAssets).toBeCloseTo(0, 8);
  });
  it('actually distributes inheritance and continues retirement with remaining assets', () => {
    const p = profile({ accounts: [account({ balance: 1800 })] }); p.retirement.monthlySpending = 100; p.legacy.distributionAge = 40.5; p.legacy.totalAmount = 600;
    const result = simulate(p, 40);
    expect(result.feasible).toBe(true); expect(result.endingAssets).toBeCloseTo(0, 8);
    p.accounts[0].balance = 1700;
    const underfunded = simulate(p, 40);
    expect(underfunded.inheritanceMet).toBe(true); expect(underfunded.feasible).toBe(false);
  });
  it('combines per-child, total, other beneficiaries and charity exactly once', () => {
    const p = profile({ accounts: [account({ balance: 10000 })], children: [child(), child({ id: 'second' })] });
    p.legacy = { ...p.legacy, perChild: 1000, totalAmount: 500, otherBeneficiaries: 300, charity: 200 };
    const result = simulate(p, 40);
    expect(result.inheritanceTarget).toBe(3000); expect(result.endingAssets).toBeCloseTo(7000, 8);
  });
  it('identifies an unreachable legacy without treating restricted investments as liquid', () => {
    const p = profile({ accounts: [account({ type: 'epf', balance: 10000, accessibleAge: 55 })] }); p.legacy.totalAmount = 5000;
    const result = simulate(p, 40);
    expect(result.inheritanceMet).toBe(false); expect(result.inheritanceFunded).toBe(0); expect(findRetirement(p).retirementAge).toBeNull();
  });
});

describe('liabilities and illiquid property', () => {
  it('deducts liabilities from net worth and services debts from eligible cash', () => {
    const p = profile({ accounts: [account({ balance: 2000 })], liabilities: [{ id: 'loan', name: 'Loan', balance: 1200, annualRate: 0, monthlyPayment: 100, paymentIncludedInExpenses: false }] });
    const result = simulate(p, 40);
    expect(result.retirementNetWorth).toBe(800); expect(result.endingAssets).toBeCloseTo(800, 8); expect(last(result.points).liabilities).toBeCloseTo(0, 8);
  });
  it('does not double charge loan payments included in lifestyle spending', () => {
    const p = profile({ accounts: [account({ balance: 2000 })], liabilities: [{ id: 'loan', name: 'Loan', balance: 1200, annualRate: 0, monthlyPayment: 100, paymentIncludedInExpenses: true }] }); p.retirement.monthlySpending = 100;
    expect(simulate(p, 40).endingAssets).toBeCloseTo(800, 8);
  });
  it('does not withdraw owner-occupied property to fund retirement', () => {
    const p = profile({ accounts: [account({ type: 'property', balance: 100000, property: { mortgageBalance: 0, mortgageAnnualRate: 0, mortgageMonthlyPayment: 0, rentalMonthlyIncome: 0, monthlyCosts: 0, saleCostsRate: 0, paymentsIncludedInExpenses: false } })] }); p.retirement.monthlySpending = 100;
    const result = simulate(p, 40);
    expect(result.retirementNetWorth).toBe(100000); expect(result.retirementAssets).toBe(0); expect(result.feasible).toBe(false);
  });
  it('sells property net of mortgage and sale costs at the configured boundary', () => {
    const p = profile({ accounts: [account({ type: 'property', balance: 100000, property: { mortgageBalance: 20000, mortgageAnnualRate: 0, mortgageMonthlyPayment: 0, rentalMonthlyIncome: 0, monthlyCosts: 0, saleCostsRate: 0.03, saleAge: 40, paymentsIncludedInExpenses: false } })] });
    const result = simulate(p, 40);
    expect(result.endingAssets).toBeCloseTo(77000, 8); expect(result.endingNetWorth).toBeCloseTo(77000, 8); expect(last(result.points).illiquidAssets).toBe(0);
    expect(result.retirementAccessibleAssets).toBeCloseTo(77000, 8);
    p.retirement.monthlySpending = 100;
    expect(simulate(p, 40).requiredCapital).toBeCloseTo(1200, 1);
  });
  it('includes an underwater sale settlement in retirement capital required', () => {
    const p = profile({ accounts: [account({ type: 'property', balance: 10000, property: { mortgageBalance: 12000, mortgageAnnualRate: 0, mortgageMonthlyPayment: 0, rentalMonthlyIncome: 0, monthlyCosts: 0, saleCostsRate: 0, saleAge: 40, paymentsIncludedInExpenses: false } })] });
    const result = simulate(p, 40);
    expect(result.retirementNetWorth).toBe(-2000); expect(result.shortfall).toBeCloseTo(2000, 8);
    expect(result.requiredCapital).toBeCloseTo(2000, 1);
  });
  it('models rental income, property costs and mortgage principal separately', () => {
    const p = profile({ accounts: [account({ balance: 20000 }), account({ id: 'home', type: 'property', balance: 100000, property: { mortgageBalance: 10000, mortgageAnnualRate: 0, mortgageMonthlyPayment: 1000, rentalMonthlyIncome: 200, monthlyCosts: 100, saleCostsRate: 0, paymentsIncludedInExpenses: false } })] });
    const result = simulate(p, 40);
    expect(result.endingAssets).toBeCloseTo(11200, 8); expect(result.endingNetWorth).toBeCloseTo(111200, 8); expect(last(result.points).liabilities).toBe(0);
  });
  it('handles negative net worth without NaN or invented feasible retirement', () => {
    const p = profile({ liabilities: [{ id: 'loan', name: 'Debt', balance: 10000, annualRate: 0.1, monthlyPayment: 0, paymentIncludedInExpenses: false }] });
    const result = simulate(p, 40);
    expect(result.feasible).toBe(false); expect(result.endingNetWorth).toBeLessThan(0); expect(Number.isFinite(result.requiredCapital)).toBe(true);
  });
});

describe('scenarios, optimization and import boundaries', () => {
  it('compares four scenarios using changed full simulation assumptions without mutating inputs', () => {
    const p = profile({ monthlySavings: 100, accounts: [account({ annualReturn: 0.05 })] }); p.retirement.monthlySpending = 100;
    const before = structuredClone(p); const scenarios = compareScenarios(p);
    expect(scenarios.map(s => s.id)).toEqual(['conservative', 'base', 'optimistic', 'custom']); expect(p).toEqual(before);
    expect(scenarios[1].result.retirementAge).toBe(findRetirement(p).retirementAge);
    const changed = applyScenario(p, { returnAdjustment: -0.02, inflationAdjustment: 0.01, contributionGrowthAdjustment: 0.01, spendingMultiplier: 1.1, feeAdjustment: 0.002 });
    expect(changed.accounts[0].annualReturn).toBeCloseTo(0.03, 10); expect(changed.retirement.monthlySpending).toBeCloseTo(110, 8);
  });
  it('reports optimizer improvements only when a changed full simulation supports them', () => {
    const p = profile({ monthlySavings: 100 }); p.retirement.monthlySpending = 100;
    const baseline = findRetirement(p); const changes = optimizeRetirement(p);
    expect(changes).toHaveLength(9);
    const saving = changes.find(c => c.id === 'save-1000')!;
    const changed = structuredClone(p); changed.monthlySavings += 1000;
    expect(saving.retirementAge).toBe(findRetirement(changed).retirementAge);
    expect(saving.yearsSaved).toBeCloseTo(baseline.retirementAge! - saving.retirementAge!, 8);
    expect(saving.improves).toBe(true); expect(changes.find(c => c.id === 'higher-returns')?.uncertain).toBe(true);
  });
  it('solves additional savings for an explicit retirement target', () => {
    const p = profile(); p.retirement.monthlySpending = 100;
    expect(additionalSavingsForTarget(p, 40.5)).toBeCloseTo(100, 1);
    expect(additionalSavingsForTarget(p, 40)).toBeNull();
  });
  it('keeps valid boundary inputs valid under synthetic scenarios and reports capped savings accurately', () => {
    const p = profile({ monthlySavings: 1e12 - 100 });
    p.retirement.monthlySpending = 1e12; p.retirement.annualTravel = 1e12; p.retirement.annualHealthcare = 1e12;
    p.customScenario.spendingMultiplier = 3;
    expect(validateProfile(p)).toEqual([]);
    const adjusted = applyScenario(p, p.customScenario);
    expect(adjusted.retirement.monthlySpending).toBe(1e12);
    expect(adjusted.retirement.annualTravel).toBe(1e12);
    expect(adjusted.retirement.annualHealthcare).toBe(1e12);
    expect(validateProfile(adjusted)).toEqual([]);
    expect(() => compareScenarios(p)).not.toThrow();
    const recommendations = optimizeRetirement(p);
    expect(recommendations.find(c => c.id === 'save-1000')?.additionalMonthlySavings).toBe(100);
    p.monthlySavings = 1e12;
    expect(optimizeRetirement(p).find(c => c.id === 'save-250')?.additionalMonthlySavings).toBe(0);
    expect(() => additionalSavingsForTarget(p, 40.5)).not.toThrow();
    p.savingsMode = 'percentage'; p.monthlyIncome = 1e12; p.savingsPercent = 1;
    expect(optimizeRetirement(p).find(c => c.id === 'save-500')?.additionalMonthlySavings).toBe(0);
  });
  it('accepts valid JSON profile imports and rejects missing nested keys, wrong types and oversized arrays', () => {
    const p = profile(); expect(parseProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(() => parseProfile({ ...p, retirement: {} })).toThrow();
    expect(() => parseProfile({ ...p, monthlySavings: '1000' })).toThrow();
    expect(() => parseProfile({ ...p, accounts: Array.from({ length: 51 }, () => account()) })).toThrow();
    expect(() => parseProfile({ ...p, accounts: [account({ type: 'property' })] })).toThrow();
    expect(() => parseProfile({ ...p, children: [{ ...child(), gifts: 'invalid' }] })).toThrow();
  });
  it('validates invalid age, return, inflation and income before simulation', () => {
    const p = profile({ currentAge: 42, lifeExpectancy: 41, inflation: NaN }); p.accounts[0].annualReturn = -1;
    expect(validateProfile(p).length).toBeGreaterThan(2); expect(() => simulate(p, 40)).toThrow();
    expect(() => simulate(profile(), 39)).toThrow();
    expect(validateProfile(profile({ savingsMode: 'percentage', monthlyIncome: 0 }))).toContain('Percentage savings requires monthly income.');
  });
  it('rejects imports with duplicate children or invalid IDs in editable nested lists', () => {
    const p = profile({ children: [child(), child({ name: 'Second child' })] });
    expect(() => parseProfile(JSON.parse(JSON.stringify(p)))).toThrow('Child IDs must be unique and nonempty.');
    p.children = [child({ id: '  ' })];
    expect(validateProfile(p)).toContain('Child IDs must be unique and nonempty.');
    p.children = [child({ gifts: [{ id: 'same', age: 18, amount: 100 }, { id: 'same', age: 20, amount: 200 }] })];
    expect(() => parseProfile(p)).toThrow('gift IDs must be unique and nonempty.');
    p.children = [];
    p.liabilities = [{ id: 'loan', name: 'Loan A', balance: 100, annualRate: 0, monthlyPayment: 10, paymentIncludedInExpenses: false }, { id: 'loan', name: 'Loan B', balance: 100, annualRate: 0, monthlyPayment: 10, paymentIncludedInExpenses: false }];
    expect(() => parseProfile(p)).toThrow('Liability IDs must be unique and nonempty.');
    p.liabilities[1].id = '';
    expect(validateProfile(p)).toContain('Liability IDs must be unique and nonempty.');
  });
  it('preserves all input data without mutation across a simulation', () => {
    const p = profile({ children: [child({ monthlySupport: 100 })] }); const before = structuredClone(p);
    simulate(p, 40); expect(p).toEqual(before);
  });
  it('conserves every monthly investment balance across reproducible varied cash-flow plans', () => {
    let seed = 781930;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let sample = 0; sample < 60; sample++) {
      const p = profile({ lifeExpectancy: 43, monthlySavings: random() * 500, inflation: random() * 0.08, accounts: [account({ balance: random() * 10000, annualReturn: random() * 0.4 - 0.2, annualFee: random() * 0.02, taxRate: random() * 0.3, monthlyContribution: 200 }), account({ id: 'epf', type: 'epf', balance: random() * 10000, annualReturn: random() * 0.2 - 0.1, accessibleAge: 41, monthlyContribution: 200 })], children: [child({ currentAge: 17, monthlySupport: random() * 100, universityAmount: random() * 500, gifts: [{ id: 'gift', age: 19, amount: random() * 200 }] })] });
      p.retirement.monthlySpending = random() * 500; p.retirement.oneTimePurchase = random() * 300;
      p.legacy.distributionAge = 42; p.legacy.totalAmount = random() * 1000;
      const initial = p.accounts.reduce((sum, a) => sum + a.balance, 0);
      let balance = initial; let previousUnfunded = 0;
      const result = simulate(p, 40 + Math.floor(random() * 24) / 12);
      for (const point of result.points) {
        balance += point.contributions + point.investmentGrowth - point.withdrawals;
        expect(point.totalAssets).toBeCloseTo(balance, 5);
        expect(point.accessibleAssets + point.restrictedAssets + point.illiquidAssets).toBeCloseTo(point.totalAssets, 5);
        expect(point.unfunded).toBeGreaterThanOrEqual(previousUnfunded - 1e-7); previousUnfunded = point.unfunded;
        expect(point.totalAssets).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
