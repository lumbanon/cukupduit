import type { FinancialProfile } from '../types';

export const defaultProfile: FinancialProfile = {
  currentAge: 30, currentYear: new Date().getFullYear(), lifeExpectancy: 90,
  monthlyIncome: 8500, annualIncomeGrowth: 0.03, monthlyExpenses: 4200,
  monthlySavings: 2500, savingsMode: 'fixed', savingsPercent: 0.3,
  annualSavingsGrowth: 0.03, inflation: 0.025, targetRetirementAge: 50,
  accounts: [
    { id: 'cash', name: 'Everyday savings', type: 'bank', balance: 50000, monthlyContribution: 500, annualReturn: 0.025, annualFee: 0, contributionGrowth: 0.03, accessibleAge: 0, withdrawalPriority: 1, taxRate: 0 },
    { id: 'investments', name: 'Global index portfolio', type: 'etf', balance: 120000, monthlyContribution: 1500, annualReturn: 0.065, annualFee: 0.002, contributionGrowth: 0.03, accessibleAge: 0, withdrawalPriority: 2, taxRate: 0 },
    { id: 'epf', name: 'EPF / KWSP', type: 'epf', balance: 100000, monthlyContribution: 500, annualReturn: 0.055, annualFee: 0, contributionGrowth: 0.03, accessibleAge: 55, withdrawalPriority: 3, taxRate: 0 },
  ], liabilities: [], children: [],
  retirement: { monthlySpending: 4000, annualTravel: 6000, annualHealthcare: 2400, emergencyReserve: 30000, oneTimePurchase: 0, valuesInTodaysMoney: true, spendingChanges: [] },
  legacy: { perChild: 0, totalAmount: 100000, otherBeneficiaries: 0, charity: 0, distributionAge: 90, valuesInTodaysMoney: true },
  customScenario: { returnAdjustment: 0, inflationAdjustment: 0, contributionGrowthAdjustment: 0, spendingMultiplier: 1, feeAdjustment: 0 },
};
