import type { FinancialProfile, OptimizationResult } from '../types';
import { findRetirement } from './retirementSearch';
import { runSimulation } from './simulation';
export { compareScenarios } from './scenarios';

function increaseSavings(p: FinancialProfile, amount: number) {
  p.monthlySavings = Math.min(1e12, (p.savingsMode === 'percentage' ? p.monthlyIncome * p.savingsPercent : p.monthlySavings) + amount);
  // An explicit additional fixed contribution uses the same total-budget model.
  if (p.savingsMode === 'percentage') p.annualSavingsGrowth = p.annualIncomeGrowth;
  p.savingsMode = 'fixed';
}

export function additionalSavingsForTarget(profile: FinancialProfile, age: number): number | null {
  if (!Number.isFinite(age) || age < profile.currentAge || age > profile.lifeExpectancy) return null;
  if (runSimulation(profile, age, { capture: false }).feasible) return 0;
  if (age <= profile.currentAge) return null;
  const trial = (extra: number) => { const p = structuredClone(profile); increaseSavings(p, extra); return runSimulation(p, age, { capture: false }).feasible; };
  let high = 250;
  while (high < 1e8 && !trial(high)) high *= 2;
  if (!trial(high)) return null;
  let low = 0;
  for (let i = 0; i < 30; i++) { const mid = (low + high) / 2; if (trial(mid)) high = mid; else low = mid; }
  return high;
}

export function optimizeRetirement(profile: FinancialProfile): OptimizationResult[] {
  const baseline = findRetirement(profile);
  const changes: { id: string; title: string; description: string; uncertain: boolean; extra: number; change: (p: FinancialProfile) => void }[] = [
    ...[250, 500, 1000].map(amount => ({ id: `save-${amount}`, title: `Save RM${amount.toLocaleString('en-MY')} more each month`, description: 'Increase the total monthly savings budget while preserving account access rules.', uncertain: false, extra: amount, change: (p: FinancialProfile) => increaseSavings(p, amount) })),
    { id: 'grow-contributions', title: 'Grow savings by 5% each year', description: 'Raise annual total savings growth to at least 5%; contributions remain inside that total budget.', uncertain: false, extra: 0, change: p => { p.annualSavingsGrowth = Math.max(p.annualSavingsGrowth, 0.05); if (p.savingsMode === 'percentage') p.annualIncomeGrowth = Math.max(p.annualIncomeGrowth, 0.05); for (const a of p.accounts) a.contributionGrowth = Math.max(a.contributionGrowth, 0.05); } },
    ...[0.05, 0.1].map(reduction => ({ id: `spend-${reduction}`, title: `Spend ${reduction * 100}% less in retirement`, description: 'Reduce retirement living, travel and healthcare budgets; family and legacy promises remain funded.', uncertain: false, extra: 0, change: (p: FinancialProfile) => { p.retirement.monthlySpending *= 1 - reduction; p.retirement.annualTravel *= 1 - reduction; p.retirement.annualHealthcare *= 1 - reduction; } })),
    { id: 'lower-fees', title: 'Reduce investment fees', description: 'Reduce each investment account fee by 0.5 percentage points, with a zero floor.', uncertain: false, extra: 0, change: p => { for (const a of p.accounts) a.annualFee = Math.max(0, a.annualFee - 0.005); } },
    { id: 'trim-expenses', title: 'Redirect RM250 of recurring expenses', description: 'Reduce current expenses by up to RM250 and save the full difference each month.', uncertain: false, extra: Math.min(250, profile.monthlyExpenses), change: p => { const amount = Math.min(250, p.monthlyExpenses); p.monthlyExpenses -= amount; increaseSavings(p, amount); } },
    { id: 'higher-returns', title: 'Explore returns 1 percentage point higher', description: 'An uncertain market assumption to explore sensitivity, not a controllable improvement.', uncertain: true, extra: 0, change: p => { for (const a of p.accounts) a.annualReturn = Math.min(1, a.annualReturn + 0.01); } },
  ];
  return changes.map(change => {
    const p = structuredClone(profile); change.change(p); const result = findRetirement(p);
    const improves = result.retirementAge !== null && (baseline.retirementAge === null || result.retirementAge < baseline.retirementAge - 1e-8);
    const originalSavings = profile.savingsMode === 'percentage' ? profile.monthlyIncome * profile.savingsPercent : profile.monthlySavings;
    const changedSavings = p.savingsMode === 'percentage' ? p.monthlyIncome * p.savingsPercent : p.monthlySavings;
    return { id: change.id, title: change.title, description: change.description, uncertain: change.uncertain, additionalMonthlySavings: Math.max(0, changedSavings - originalSavings), retirementAge: result.retirementAge, yearsSaved: baseline.retirementAge !== null && result.retirementAge !== null ? Math.max(0, baseline.retirementAge - result.retirementAge) : 0, improves, inheritanceMet: result.simulation.inheritanceMet, sustainable: result.simulation.feasible };
  });
}
