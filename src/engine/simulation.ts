import type { FinancialProfile, InvestmentAccount, ProjectionPoint, SimulationResult } from '../types';
import { annualToMonthly, inflationFactor } from './inflation';
import { validateProfile } from './validation';
import { monthlySavingsBudget } from './savings';

const EPS = 0.01;
interface MutableAccount { config: InvestmentAccount; balance: number; mortgage: number; sold: boolean; monthlyRate: number; monthlyFeeFactor: number; mortgageRate: number }
interface RunOptions { capture?: boolean; retirementCapital?: number; capitalCalculation?: boolean }
interface Flow { contributions: number; investmentGrowth: number; spending: number; withdrawals: number; childSupport: number; education: number; gifts: number; inheritance: number; milestones: string[] }
const freshFlow = (): Flow => ({ contributions: 0, investmentGrowth: 0, spending: 0, withdrawals: 0, childSupport: 0, education: 0, gifts: 0, inheritance: 0, milestones: [] });

/**
 * Monthly convention: boundary events; start-of-month contributions; investment
 * growth, fees and gain taxes; end-of-month expenses and withdrawals. Effective
 * annual rates are converted geometrically. Debt interest uses the same rule.
 * Savings are a total budget, already net of ordinary working-life expenses.
 * Restricted accounts never fund a withdrawal before the configured access age.
 */
export function runSimulation(p: FinancialProfile, retirementAge: number, options: RunOptions = {}): SimulationResult {
  const months = Math.round((p.lifeExpectancy - p.currentAge) * 12);
  const retirementMonth = Math.round((retirementAge - p.currentAge) * 12);
  const legacyMonth = Math.round((p.legacy.distributionAge - p.currentAge) * 12);
  const accounts: MutableAccount[] = p.accounts.map(config => ({ config, balance: config.balance, mortgage: config.property?.mortgageBalance ?? 0, sold: false, monthlyRate: annualToMonthly(config.annualReturn), monthlyFeeFactor: Math.pow(1 - config.annualFee, 1 / 12), mortgageRate: annualToMonthly(config.property?.mortgageAnnualRate ?? 0) }));
  const debts = p.liabilities.map(config => ({ config, balance: config.balance, monthlyRate: annualToMonthly(config.annualRate) }));
  const withdrawalOrder = accounts.filter(a => a.config.type !== 'property').sort((a, b) => a.config.withdrawalPriority - b.config.withdrawalPriority);
  const cashAccount = accounts.find(a => ['cash', 'bank'].includes(a.config.type) && a.config.accessibleAge <= p.currentAge);
  let cash = 0; let cumulativeUnfunded = 0; let reserveGap = 0; let firstDepletionAge: number | null = null;
  let retirementAssets = 0; let retirementAccessibleAssets = 0; let retirementNetWorth = 0;
  let inheritanceTarget = 0; let inheritanceFunded = 0; let childCosts = 0; let totalContributions = 0;
  let flow = freshFlow();
  const points: ProjectionPoint[] = [];
  const warnings: string[] = [];
  const factor = (month: number, rate = p.inflation) => inflationFactor(rate, month / 12);
  const dueMonth = (age: number) => Math.round((age - p.currentAge) * 12);
  const accessible = (age: number) => cash + accounts.reduce((sum, a) => sum + (a.config.type !== 'property' && a.config.accessibleAge <= age + 1e-8 ? a.balance : 0), 0);
  const inventory = (age: number) => {
    const illiquid = accounts.reduce((sum, a) => sum + (a.config.type === 'property' ? a.balance : 0), 0);
    const totalAssets = cash + accounts.reduce((sum, a) => sum + a.balance, 0);
    const liabilities = accounts.reduce((sum, a) => sum + a.mortgage, 0) + debts.reduce((sum, d) => sum + d.balance, 0);
    const accessibleAssets = accessible(age);
    return { totalAssets, investableAssets: totalAssets - illiquid, accessibleAssets, restrictedAssets: Math.max(0, totalAssets - illiquid - accessibleAssets), illiquidAssets: illiquid, liabilities, netWorth: totalAssets - liabilities };
  };
  const creditCash = (amount: number) => {
    if (cashAccount) cashAccount.balance += amount; else cash += amount;
  };
  const withdraw = (amount: number, age: number) => {
    let remaining = Math.max(0, amount);
    const fromCash = Math.min(cash, remaining); cash -= fromCash; remaining -= fromCash;
    for (const a of withdrawalOrder) {
      if (remaining <= 1e-9) break;
      if (a.config.accessibleAge > age + 1e-8) continue;
      const take = Math.min(a.balance, remaining); a.balance -= take; remaining -= take;
    }
    const funded = Math.max(0, amount - remaining);
    flow.withdrawals += funded;
    if (remaining > 1e-8) { cumulativeUnfunded += remaining; if (firstDepletionAge === null) firstDepletionAge = age; }
    return funded;
  };
  const checkReserve = (month: number) => {
    if (month < retirementMonth) return;
    const reserve = p.retirement.emergencyReserve * (p.retirement.valuesInTodaysMoney ? factor(month) : 1);
    reserveGap = Math.max(reserveGap, reserve - accessible(p.currentAge + month / 12));
  };
  for (let m = 0; m <= months; m++) {
    const age = p.currentAge + m / 12;
    let saleDeficit = 0;
    // A sale configured for the retirement boundary is already liquid in the
    // opening retirement snapshot. A later sale remains a future cash flow.
    for (const a of accounts) {
      const prop = a.config.property;
      if (a.config.type !== 'property' || !prop || a.sold || prop.saleAge === undefined || m !== dueMonth(prop.saleAge)) continue;
      const proceeds = a.balance * (1 - prop.saleCostsRate) - a.mortgage;
      a.balance = 0; a.mortgage = 0; a.sold = true;
      if (proceeds >= 0) creditCash(proceeds); else saleDeficit += -proceeds;
      flow.milestones.push(`${a.config.name} sale`);
    }
    if (m === retirementMonth) {
      const opening = inventory(age);
      retirementAssets = opening.investableAssets; retirementAccessibleAssets = opening.accessibleAssets; retirementNetWorth = opening.netWorth - saleDeficit;
      if (options.retirementCapital !== undefined) {
        const eligible = accounts.filter(a => a.config.type !== 'property' && a.config.accessibleAge <= age + 1e-8);
        if (opening.accessibleAssets > 0) {
          const ratio = options.retirementCapital / opening.accessibleAssets;
          cash *= ratio; for (const a of eligible) a.balance *= ratio;
        } else cash = options.retirementCapital;
      }
      if (options.capitalCalculation) {
        cumulativeUnfunded = 0; reserveGap = 0; firstDepletionAge = null;
        if (legacyMonth < retirementMonth) inheritanceFunded = inheritanceTarget;
      }
      flow.milestones.push('Retirement begins');
    }
    if (saleDeficit > 0) withdraw(saleDeficit, age);
    let childOneTime = 0;
    for (const c of p.children) {
      const birthMonth = c.plannedBirthYear === undefined ? -Math.round(c.currentAge * 12) : Math.round((c.plannedBirthYear - p.currentYear) * 12);
      if (m === birthMonth && birthMonth >= 0) flow.milestones.push(`${c.name || 'Child'} birth`);
      if (c.costsIncludedInHousehold) continue;
      if (m === birthMonth + Math.round(c.universityStartAge * 12)) {
        const cost = c.universityAmount * factor(m, c.educationInflation);
        childOneTime += cost; flow.education += cost;
        if (cost) flow.milestones.push(`${c.name || 'Child'} university`);
      }
      for (const gift of c.gifts) if (m === birthMonth + Math.round(gift.age * 12)) {
        const cost = gift.amount * factor(m); childOneTime += cost; flow.gifts += cost;
        if (cost) flow.milestones.push(`${c.name || 'Child'} gift`);
      }
    }
    // One-time family costs consume this month's savings first while working.
    let pendingOneTime = childOneTime;
    childCosts += childOneTime;
    if (m === retirementMonth && p.retirement.oneTimePurchase > 0) {
      const purchase = p.retirement.oneTimePurchase * (p.retirement.valuesInTodaysMoney ? factor(m) : 1);
      withdraw(purchase, age); flow.spending += purchase; flow.milestones.push('Retirement purchase');
    }
    if (m === legacyMonth) {
      const l = p.legacy;
      inheritanceTarget = (l.totalAmount + l.perChild * p.children.length + l.otherBeneficiaries + l.charity) * (l.valuesInTodaysMoney ? factor(m) : 1);
      inheritanceFunded = withdraw(inheritanceTarget, age); flow.inheritance += inheritanceFunded;
      if (inheritanceTarget) flow.milestones.push('Legacy distribution');
    }
    if (m >= retirementMonth || m === months) { withdraw(pendingOneTime, age); pendingOneTime = 0; }
    checkReserve(m);
    if (options.capture !== false) {
      const state = inventory(age);
      const categories = { epf: 0, asb: 0, stocks: 0, cash, other: 0 };
      for (const a of accounts) {
        if (a.config.type === 'epf') categories.epf += a.balance;
        else if (a.config.type === 'asb') categories.asb += a.balance;
        else if (['stocks-my', 'stocks-us', 'etf'].includes(a.config.type)) categories.stocks += a.balance;
        else if (['cash', 'bank', 'fixed-deposit'].includes(a.config.type)) categories.cash += a.balance;
        else categories.other += a.balance;
      }
      points.push({ age, year: p.currentYear + m / 12, month: m, ...state, realNetWorth: state.netWorth / factor(m), ...categories, ...flow, unfunded: cumulativeUnfunded });
    }
    flow = freshFlow();
    if (m === months) break;
    const retired = m >= retirementMonth;
    const nextAge = p.currentAge + (m + 1) / 12;
    let support = 0; let education = 0;
    for (const c of p.children) {
      if (c.costsIncludedInHousehold) continue;
      const childAge = c.plannedBirthYear === undefined ? c.currentAge + m / 12 : (p.currentYear - c.plannedBirthYear) + m / 12;
      if (childAge < -1e-8) continue;
      if (childAge < c.supportEndAge - 1e-8) support += c.monthlySupport * factor(m);
      if (childAge >= c.educationStartAge - 1e-8 && childAge < c.educationEndAge - 1e-8) education += c.annualEducationCost / 12 * factor(m, c.educationInflation);
    }
    flow.childSupport += support; flow.education += education; childCosts += support + education;
    let extraDebtPayments = 0;
    for (const d of debts) {
      d.balance *= 1 + d.monthlyRate;
      const payment = Math.min(d.balance, d.config.monthlyPayment); d.balance = Math.max(0, d.balance - payment);
      if (!d.config.paymentIncludedInExpenses) extraDebtPayments += payment;
    }
    let propertyNet = 0;
    for (const a of accounts) {
      const prop = a.config.property;
      if (a.config.type !== 'property' || !prop || a.sold) continue;
      a.mortgage *= 1 + a.mortgageRate;
      const payment = Math.min(a.mortgage, prop.mortgageMonthlyPayment); a.mortgage = Math.max(0, a.mortgage - payment);
      propertyNet += prop.rentalMonthlyIncome * factor(m);
      if (!prop.paymentsIncludedInExpenses) propertyNet -= payment + prop.monthlyCosts * factor(m);
    }
    const retirementFactor = p.retirement.valuesInTodaysMoney ? factor(m) : 1;
    const spendingChange = p.retirement.spendingChanges.reduce((sum, s) => sum + (s.age <= age + 1e-8 ? s.monthlyChange : 0), 0);
    const lifestyle = retired ? Math.max(0, p.retirement.monthlySpending + spendingChange + (p.retirement.annualTravel + p.retirement.annualHealthcare) / 12) * retirementFactor : 0;
    flow.spending += lifestyle;
    const extras = support + education + extraDebtPayments - propertyNet + pendingOneTime;
    let cashFlow = -lifestyle - extras;
    if (!retired) {
      cashFlow += monthlySavingsBudget(p, m / 12);
    }
    if (cashFlow >= 0) {
      if (!retired) {
        const requests = accounts.filter(a => a.config.type !== 'property').map(a => ({ a, amount: a.config.monthlyContribution * factor(m, a.config.contributionGrowth) }));
        const requestedTotal = requests.reduce((sum, r) => sum + r.amount, 0);
        const scale = requestedTotal > cashFlow && requestedTotal > 0 ? cashFlow / requestedTotal : 1;
        let allocated = 0;
        for (const r of requests) { const contribution = r.amount * scale; r.a.balance += contribution; allocated += contribution; }
        creditCash(Math.max(0, cashFlow - allocated)); flow.contributions = cashFlow; totalContributions += cashFlow;
      } else creditCash(cashFlow);
    }
    // Returns are applied after contributions and before end-of-month withdrawals.
    for (const a of accounts) {
      if (a.sold) continue;
      const gross = a.balance * (1 + a.monthlyRate);
      const afterFees = a.config.type === 'property' ? gross : gross * a.monthlyFeeFactor;
      const growth = afterFees - a.balance;
      const tax = a.config.type === 'property' ? 0 : Math.max(0, growth) * a.config.taxRate;
      a.balance = Math.max(0, afterFees - tax); flow.investmentGrowth += growth - tax;
    }
    if (cashFlow < 0) withdraw(-cashFlow, nextAge);
    checkReserve(m + 1);
  }
  const end = inventory(p.lifeExpectancy);
  const shortfall = Math.max(cumulativeUnfunded, 0) + Math.max(reserveGap, 0) + Math.max(-end.netWorth, 0);
  const inheritanceMet = inheritanceFunded + EPS >= inheritanceTarget;
  if (accounts.some(a => a.config.type === 'epf')) warnings.push('EPF access age and dividend assumptions are configurable estimates, not a statement of current withdrawal rules.');
  if (p.accounts.some(a => (a.volatility ?? 0) > 0)) warnings.push('Volatility is recorded for context; this deterministic model uses the expected return, without random market paths.');
  if (p.accounts.some(a => a.type === 'property')) warnings.push('Property is illiquid until its configured sale; property is not transferred as an in-kind legacy. Do not also enter its mortgage as a separate liability.');
  if (p.accounts.some(a => a.type === 'property' && a.monthlyContribution > 0)) warnings.push('Property account contributions are ignored; enter mortgage payments in property details.');
  if (p.liabilities.some(l => l.monthlyPayment < l.balance * annualToMonthly(l.annualRate))) warnings.push('At least one debt payment is below initial monthly interest; its balance can increase.');
  if (reserveGap > EPS) warnings.push('The accessible emergency reserve cannot be maintained throughout retirement.');
  if (cumulativeUnfunded > EPS) warnings.push('At least one cash flow cannot be met using eligible accessible assets.');
  const initialSpendingChange = p.retirement.spendingChanges.reduce((sum, s) => sum + (s.age <= retirementAge + 1e-8 ? s.monthlyChange : 0), 0);
  const monthlyRetirementSpending = Math.max(0, p.retirement.monthlySpending + initialSpendingChange + (p.retirement.annualTravel + p.retirement.annualHealthcare) / 12) * (p.retirement.valuesInTodaysMoney ? factor(retirementMonth) : 1);
  return { retirementAge, feasible: shortfall <= EPS && inheritanceMet, points, retirementAssets, retirementAccessibleAssets, retirementNetWorth, requiredCapital: 0, endingAssets: end.investableAssets, endingNetWorth: end.netWorth, inheritanceTarget, inheritanceFunded, inheritanceMet, shortfall, firstDepletionAge, monthlyRetirementSpending, childCosts, totalContributions, warnings };
}

/** Minimum accessible capital at retirement, conditional on existing restricted
 * assets unlocking later and reaching retirement. Trial runs replace only the
 * opening accessible balances. Earlier missed payments cannot be repaired by a
 * retirement-date top-up and are still reported by the main simulation. */
export function requiredRetirementCapital(p: FinancialProfile, retirementAge: number): number {
  const trial = (capital: number) => runSimulation(p, retirementAge, { capture: false, retirementCapital: capital, capitalCalculation: true }).feasible;
  if (trial(0)) return 0;
  let high = Math.max(1, p.retirement.monthlySpending * 12 * (p.lifeExpectancy - retirementAge), p.retirement.emergencyReserve);
  while (high < 1e15 && !trial(high)) high *= 2;
  high = Math.min(high, 1e15);
  // Validated inputs are bounded; extreme assumptions can require over RM1e15.
  if (!trial(high)) return high;
  let low = 0;
  for (let i = 0; i < 38; i++) { const mid = (low + high) / 2; if (trial(mid)) high = mid; else low = mid; }
  return high;
}

export function simulate(p: FinancialProfile, retirementAge: number): SimulationResult {
  const errors = validateProfile(p);
  if (errors.length) throw new Error(errors[0]);
  if (!Number.isFinite(retirementAge) || retirementAge < p.currentAge || retirementAge > p.lifeExpectancy) throw new Error('Retirement age must be within the planning horizon.');
  const result = runSimulation(p, retirementAge);
  result.requiredCapital = requiredRetirementCapital(p, retirementAge);
  if (result.requiredCapital >= 1e15) result.warnings.push('Required accessible capital exceeds the supported RM1 quadrillion calculation range.');
  return result;
}
