import type { FinancialProfile } from '../types';
import { inflationFactor } from './inflation';

type SavingsInputs = Pick<FinancialProfile, 'savingsMode' | 'monthlySavings' | 'monthlyIncome' | 'savingsPercent' | 'annualSavingsGrowth' | 'annualIncomeGrowth'>;

/** The sole monthly savings budget. Percentage inputs are stored as fractions
 * (25% = 0.25). Never cache the calculated amount back into profile state:
 * monthlySavings retains only the user's fixed-mode entry. */
export function monthlySavingsBudget(profile: SavingsInputs, years = 0): number {
  const percentage = profile.savingsMode === 'percentage';
  const amount = percentage ? profile.monthlyIncome * profile.savingsPercent : profile.monthlySavings;
  const growth = percentage ? profile.annualIncomeGrowth : profile.annualSavingsGrowth;
  return amount * inflationFactor(growth, years);
}
