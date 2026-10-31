import type { FinancialProfile } from '../types';

/** Validate all engine inputs before calculating or accepting a JSON import. */
export function validateProfile(p: FinancialProfile): string[] {
  const errors: string[] = [];
  const range = (value: number, min: number, max: number, label: string) => {
    if (!Number.isFinite(value) || value < min || value > max) errors.push(`${label} must be between ${min} and ${max}.`);
  };
  const money = (value: number, label: string) => range(value, 0, 1e12, label);
  const rate = (value: number, label: string) => {
    if (!Number.isFinite(value) || value <= -1 || value > 1) errors.push(`${label} must be greater than -100% and at most 100%.`);
  };
  const uniqueIds = (items: { id: string }[], label: string) => {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item.id.trim() || ids.has(item.id)) errors.push(`${label} IDs must be unique and nonempty.`);
      ids.add(item.id);
    }
  };
  range(p.currentAge, 0, 110, 'Current age'); range(p.lifeExpectancy, p.currentAge + 1 / 12, 120, 'Planning age');
  range(p.currentYear, 1900, 2200, 'Current year'); range(p.inflation, -0.1, 0.5, 'Inflation');
  money(p.monthlyIncome, 'Monthly income'); money(p.monthlyExpenses, 'Monthly expenses'); money(p.monthlySavings, 'Monthly savings');
  range(p.savingsPercent, 0, 1, 'Savings percentage'); rate(p.annualIncomeGrowth, 'Income growth'); rate(p.annualSavingsGrowth, 'Savings growth');
  if (p.savingsMode !== 'fixed' && p.savingsMode !== 'percentage') errors.push('Savings mode is invalid.');
  if (p.savingsMode === 'percentage' && p.monthlyIncome <= 0) errors.push('Percentage savings requires monthly income.');
  if (p.targetRetirementAge !== undefined) range(p.targetRetirementAge, p.currentAge, p.lifeExpectancy, 'Target retirement age');
  if (p.accounts.length > 50 || p.children.length > 30 || p.liabilities.length > 50) errors.push('Use at most 50 accounts, 30 children and 50 liabilities.');
  uniqueIds(p.accounts, 'Account'); uniqueIds(p.children, 'Child'); uniqueIds(p.liabilities, 'Liability');
  for (const a of p.accounts) {
    money(a.balance, `${a.name}: balance`); money(a.monthlyContribution, `${a.name}: contribution`); rate(a.annualReturn, `${a.name}: return`);
    range(a.annualFee, 0, 0.99, `${a.name}: fee`); range(a.taxRate, 0, 1, `${a.name}: tax`); rate(a.contributionGrowth, `${a.name}: contribution growth`);
    range(a.accessibleAge, 0, 120, `${a.name}: access age`); range(a.withdrawalPriority, 0, 999, `${a.name}: withdrawal priority`);
    if (a.volatility !== undefined) range(a.volatility, 0, 2, `${a.name}: volatility`);
    if (a.type === 'property' && !a.property) errors.push(`${a.name}: property details are required.`);
    if (a.property) {
      money(a.property.mortgageBalance, `${a.name}: mortgage`); range(a.property.mortgageAnnualRate, 0, 1, `${a.name}: mortgage rate`);
      money(a.property.mortgageMonthlyPayment, `${a.name}: mortgage payment`); money(a.property.rentalMonthlyIncome, `${a.name}: rent`);
      money(a.property.monthlyCosts, `${a.name}: property costs`); range(a.property.saleCostsRate, 0, 1, `${a.name}: sale costs`);
      if (a.property.saleAge !== undefined) range(a.property.saleAge, p.currentAge, p.lifeExpectancy, `${a.name}: sale age`);
    }
  }
  for (const l of p.liabilities) { money(l.balance, `${l.name}: debt`); money(l.monthlyPayment, `${l.name}: debt payment`); range(l.annualRate, 0, 1, `${l.name}: debt interest`); }
  for (const c of p.children) {
    range(c.currentAge, 0, 100, `${c.name}: current age`); range(c.supportEndAge, 0, 100, `${c.name}: support end age`);
    if (c.plannedBirthYear !== undefined) range(c.plannedBirthYear, p.currentYear, p.currentYear + 100, `${c.name}: birth year`);
    money(c.monthlySupport, `${c.name}: support`); money(c.annualEducationCost, `${c.name}: education`); money(c.universityAmount, `${c.name}: university`);
    range(c.educationStartAge, 0, 100, `${c.name}: education start`); range(c.educationEndAge, c.educationStartAge, 100, `${c.name}: education end`);
    range(c.universityStartAge, 0, 100, `${c.name}: university age`); range(c.educationInflation, -0.1, 0.5, `${c.name}: education inflation`);
    if (c.gifts.length > 100) errors.push(`${c.name}: use at most 100 gifts.`);
    uniqueIds(c.gifts, `${c.name}: gift`);
    for (const g of c.gifts) { range(g.age, 0, 100, `${c.name}: gift age`); money(g.amount, `${c.name}: gift`); }
  }
  const r = p.retirement;
  for (const key of ['monthlySpending', 'annualTravel', 'annualHealthcare', 'emergencyReserve', 'oneTimePurchase'] as const) money(r[key], key);
  if (r.spendingChanges.length > 100) errors.push('Use at most 100 spending changes.');
  for (const s of r.spendingChanges) { range(s.age, p.currentAge, p.lifeExpectancy, 'Spending change age'); range(s.monthlyChange, -1e12, 1e12, 'Spending change'); }
  const l = p.legacy;
  for (const key of ['perChild', 'totalAmount', 'otherBeneficiaries', 'charity'] as const) money(l[key], `Inheritance ${key}`);
  range(l.distributionAge, p.currentAge, p.lifeExpectancy, 'Inheritance distribution age');
  const s = p.customScenario;
  range(s.returnAdjustment, -0.5, 0.5, 'Scenario return adjustment'); range(s.inflationAdjustment, -0.1, 0.5, 'Scenario inflation adjustment');
  range(s.contributionGrowthAdjustment, -0.5, 0.5, 'Scenario contribution growth'); range(s.spendingMultiplier, 0, 3, 'Scenario spending multiplier'); range(s.feeAdjustment, -0.5, 0.5, 'Scenario fee adjustment');
  return errors;
}

const record = (v: unknown, label: string): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${label} must be an object.`);
  return v as Record<string, unknown>;
};
function shape(value: unknown, fields: Record<string, 'number' | 'string' | 'boolean'>, label: string) {
  const object = record(value, label);
  for (const [key, type] of Object.entries(fields)) {
    if (typeof object[key] !== type || (type === 'number' && !Number.isFinite(object[key]))) throw new Error(`${label}.${key} must be a ${type}.`);
    if (type === 'string' && (object[key] as string).length > 300) throw new Error(`${label}.${key} is too long.`);
  }
  return object;
}
function list(object: Record<string, unknown>, key: string, max: number): unknown[] {
  if (!Array.isArray(object[key]) || object[key].length > max) throw new Error(`${key} must be an array with at most ${max} items.`);
  return object[key];
}
/** Strict structural checks protect the UI as well as the numerical model. */
export function parseProfile(data: unknown): FinancialProfile {
  const p = shape(data, { currentAge: 'number', currentYear: 'number', lifeExpectancy: 'number', monthlyIncome: 'number', annualIncomeGrowth: 'number', monthlyExpenses: 'number', monthlySavings: 'number', savingsMode: 'string', savingsPercent: 'number', annualSavingsGrowth: 'number', inflation: 'number' }, 'Profile');
  if (p.targetRetirementAge !== undefined && typeof p.targetRetirementAge !== 'number') throw new Error('Target age must be a number.');
  for (const item of list(p, 'accounts', 50)) {
    const a = shape(item, { id: 'string', name: 'string', type: 'string', balance: 'number', monthlyContribution: 'number', annualReturn: 'number', annualFee: 'number', contributionGrowth: 'number', accessibleAge: 'number', withdrawalPriority: 'number', taxRate: 'number' }, 'Account');
    if (!['epf', 'asb', 'bank', 'fixed-deposit', 'stocks-my', 'stocks-us', 'etf', 'bonds', 'unit-trust', 'cash', 'property', 'other', 'custom'].includes(a.type as string)) throw new Error('Unknown account type.');
    if (a.volatility !== undefined && typeof a.volatility !== 'number') throw new Error('Volatility must be a number.');
    if (a.property !== undefined) {
      const prop = shape(a.property, { mortgageBalance: 'number', mortgageAnnualRate: 'number', mortgageMonthlyPayment: 'number', rentalMonthlyIncome: 'number', monthlyCosts: 'number', saleCostsRate: 'number', paymentsIncludedInExpenses: 'boolean' }, 'Property');
      if (prop.saleAge !== undefined && typeof prop.saleAge !== 'number') throw new Error('Property sale age must be a number.');
    }
  }
  for (const item of list(p, 'liabilities', 50)) shape(item, { id: 'string', name: 'string', balance: 'number', annualRate: 'number', monthlyPayment: 'number', paymentIncludedInExpenses: 'boolean' }, 'Liability');
  for (const item of list(p, 'children', 30)) {
    const c = shape(item, { id: 'string', name: 'string', currentAge: 'number', monthlySupport: 'number', supportEndAge: 'number', annualEducationCost: 'number', educationStartAge: 'number', educationEndAge: 'number', universityAmount: 'number', universityStartAge: 'number', educationInflation: 'number', costsIncludedInHousehold: 'boolean' }, 'Child');
    if (c.plannedBirthYear !== undefined && typeof c.plannedBirthYear !== 'number') throw new Error('Birth year must be a number.');
    for (const gift of list(c, 'gifts', 100)) shape(gift, { id: 'string', age: 'number', amount: 'number' }, 'Gift');
  }
  const retirement = shape(p.retirement, { monthlySpending: 'number', annualTravel: 'number', annualHealthcare: 'number', emergencyReserve: 'number', oneTimePurchase: 'number', valuesInTodaysMoney: 'boolean' }, 'Retirement');
  for (const change of list(retirement, 'spendingChanges', 100)) shape(change, { age: 'number', monthlyChange: 'number' }, 'Spending change');
  shape(p.legacy, { perChild: 'number', totalAmount: 'number', otherBeneficiaries: 'number', charity: 'number', distributionAge: 'number', valuesInTodaysMoney: 'boolean' }, 'Legacy');
  shape(p.customScenario, { returnAdjustment: 'number', inflationAdjustment: 'number', contributionGrowthAdjustment: 'number', spendingMultiplier: 'number', feeAdjustment: 'number' }, 'Custom scenario');
  const parsed = structuredClone(p) as unknown as FinancialProfile;
  const errors = validateProfile(parsed);
  if (errors.length) throw new Error(errors[0]);
  return parsed;
}
