import type { FinancialProfile, ScenarioAssumptions, ScenarioResult } from '../types';
import { findRetirement } from './retirementSearch';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const minAnnualRate = -1 + Number.EPSILON;
export const baseAssumptions: ScenarioAssumptions = { returnAdjustment: 0, inflationAdjustment: 0, contributionGrowthAdjustment: 0, spendingMultiplier: 1, feeAdjustment: 0 };

export function applyScenario(profile: FinancialProfile, assumptions: ScenarioAssumptions): FinancialProfile {
  const p = structuredClone(profile);
  p.inflation = clamp(p.inflation + assumptions.inflationAdjustment, -0.1, 0.5);
  p.annualSavingsGrowth = clamp(p.annualSavingsGrowth + assumptions.contributionGrowthAdjustment, minAnnualRate, 1);
  if (p.savingsMode === 'percentage') p.annualIncomeGrowth = clamp(p.annualIncomeGrowth + assumptions.contributionGrowthAdjustment, minAnnualRate, 1);
  p.retirement.monthlySpending = clamp(p.retirement.monthlySpending * assumptions.spendingMultiplier, 0, 1e12);
  p.retirement.annualTravel = clamp(p.retirement.annualTravel * assumptions.spendingMultiplier, 0, 1e12);
  p.retirement.annualHealthcare = clamp(p.retirement.annualHealthcare * assumptions.spendingMultiplier, 0, 1e12);
  for (const a of p.accounts) {
    a.annualReturn = clamp(a.annualReturn + assumptions.returnAdjustment, minAnnualRate, 1);
    a.annualFee = clamp(a.annualFee + assumptions.feeAdjustment, 0, 0.99);
    a.contributionGrowth = clamp(a.contributionGrowth + assumptions.contributionGrowthAdjustment, minAnnualRate, 1);
  }
  return p;
}

export function compareScenarios(profile: FinancialProfile): ScenarioResult[] {
  const configurations: { id: string; name: string; assumptions: ScenarioAssumptions }[] = [
    { id: 'conservative', name: 'Conservative', assumptions: { returnAdjustment: -0.02, inflationAdjustment: 0.01, contributionGrowthAdjustment: -0.01, spendingMultiplier: 1.05, feeAdjustment: 0.002 } },
    { id: 'base', name: 'Base', assumptions: baseAssumptions },
    { id: 'optimistic', name: 'Optimistic', assumptions: { returnAdjustment: 0.015, inflationAdjustment: -0.005, contributionGrowthAdjustment: 0.005, spendingMultiplier: 0.95, feeAdjustment: -0.001 } },
    { id: 'custom', name: 'Custom', assumptions: profile.customScenario },
  ];
  return configurations.map(c => ({ ...c, result: findRetirement(applyScenario(profile, c.assumptions)) }));
}
