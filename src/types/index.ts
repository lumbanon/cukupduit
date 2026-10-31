export type AccountType = 'epf' | 'asb' | 'bank' | 'fixed-deposit' | 'stocks-my' | 'stocks-us' | 'etf' | 'bonds' | 'unit-trust' | 'cash' | 'property' | 'other' | 'custom';
export interface InvestmentAccount {
  id: string; name: string; type: AccountType; balance: number;
  monthlyContribution: number; annualReturn: number; annualFee: number;
  contributionGrowth: number; accessibleAge: number; withdrawalPriority: number;
  taxRate: number; volatility?: number;
  /** Property balance is its gross value. Mortgage is tracked separately here. */
  property?: { mortgageBalance: number; mortgageAnnualRate: number; mortgageMonthlyPayment: number; rentalMonthlyIncome: number; monthlyCosts: number; saleAge?: number; saleCostsRate: number; paymentsIncludedInExpenses: boolean };
}
export interface Liability { id: string; name: string; balance: number; annualRate: number; monthlyPayment: number; paymentIncludedInExpenses: boolean }
export interface FinancialGift { id: string; age: number; amount: number }
export interface Child {
  id: string; name: string; currentAge: number; plannedBirthYear?: number;
  monthlySupport: number; supportEndAge: number; annualEducationCost: number;
  educationStartAge: number; educationEndAge: number; universityAmount: number;
  universityStartAge: number; educationInflation: number; gifts: FinancialGift[];
  /** Exclude these costs when they are already in the household spending/savings budget. */
  costsIncludedInHousehold: boolean;
}
export interface RetirementLifestyle {
  monthlySpending: number; annualTravel: number; annualHealthcare: number;
  emergencyReserve: number; oneTimePurchase: number; valuesInTodaysMoney: boolean;
  spendingChanges: { age: number; monthlyChange: number }[];
}
export interface LegacyGoal { perChild: number; totalAmount: number; otherBeneficiaries: number; charity: number; distributionAge: number; valuesInTodaysMoney: boolean }
export interface ScenarioAssumptions { returnAdjustment: number; inflationAdjustment: number; contributionGrowthAdjustment: number; spendingMultiplier: number; feeAdjustment: number }
export interface FinancialProfile {
  currentAge: number; currentYear: number; lifeExpectancy: number;
  monthlyIncome: number; annualIncomeGrowth: number; monthlyExpenses: number;
  /** User-entered fixed amount, inactive in percentage mode; not a derived total. */
  monthlySavings: number;
  savingsMode: 'fixed' | 'percentage';
  /** User-entered fraction of income (0.25 = 25%), inactive in fixed mode. */
  savingsPercent: number;
  annualSavingsGrowth: number; inflation: number; targetRetirementAge?: number;
  accounts: InvestmentAccount[]; liabilities: Liability[]; children: Child[];
  retirement: RetirementLifestyle; legacy: LegacyGoal; customScenario: ScenarioAssumptions;
}
export interface ValidationIssue { field: string; message: string }
export interface ProjectionPoint {
  age: number; year: number; month: number; totalAssets: number; investableAssets: number;
  accessibleAssets: number; restrictedAssets: number; illiquidAssets: number; liabilities: number;
  netWorth: number; realNetWorth: number; epf: number; asb: number; stocks: number;
  cash: number; other: number; contributions: number; investmentGrowth: number;
  spending: number; withdrawals: number; childSupport: number; education: number;
  gifts: number; inheritance: number; unfunded: number;
  milestones: string[];
}
export interface SimulationResult {
  retirementAge: number; feasible: boolean; points: ProjectionPoint[];
  retirementAssets: number; retirementAccessibleAssets: number; retirementNetWorth: number;
  requiredCapital: number; endingAssets: number; endingNetWorth: number;
  inheritanceTarget: number; inheritanceFunded: number; inheritanceMet: boolean;
  shortfall: number; firstDepletionAge: number | null; monthlyRetirementSpending: number;
  childCosts: number; totalContributions: number; warnings: string[];
}
export interface RetirementResult {
  retirementAge: number | null; yearsUntilRetirement: number | null; retirementYear: number | null;
  simulation: SimulationResult; targetSimulation?: SimulationResult; explanation: string;
}
export interface ScenarioResult { id: string; name: string; assumptions: ScenarioAssumptions; result: RetirementResult }
export interface OptimizationResult {
  id: string; title: string; description: string; uncertain: boolean;
  additionalMonthlySavings: number; retirementAge: number | null; yearsSaved: number;
  improves: boolean; inheritanceMet: boolean; sustainable: boolean;
}
