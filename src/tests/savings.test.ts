import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../data';
import { additionalSavingsForTarget, compareScenarios, findRetirement, monthlySavingsBudget, optimizeRetirement, parseProfile, simulate } from '../engine';
import type { FinancialProfile } from '../types';

function percentagePlan(): FinancialProfile {
  const p = structuredClone(defaultProfile);
  return {
    ...p, currentAge: 40, lifeExpectancy: 41, targetRetirementAge: undefined,
    monthlyIncome: 1000, annualIncomeGrowth: 0, monthlyExpenses: 0,
    savingsMode: 'percentage', savingsPercent: 0.1,
    // A previously entered fixed amount must never override percentage savings.
    monthlySavings: 99999, annualSavingsGrowth: 0.8, inflation: 0,
    accounts: [
      { ...p.accounts[0], balance: 0, monthlyContribution: 80, annualReturn: 0, annualFee: 0, taxRate: 0, contributionGrowth: 0 },
      { ...p.accounts[1], balance: 0, monthlyContribution: 80, annualReturn: 0, annualFee: 0, taxRate: 0, contributionGrowth: 0 },
    ],
    children: [], liabilities: [],
    retirement: { monthlySpending: 100, annualTravel: 0, annualHealthcare: 0, emergencyReserve: 0, oneTimePurchase: 0, spendingChanges: [], valuesInTodaysMoney: true },
    legacy: { ...p.legacy, distributionAge: 41, totalAmount: 0, perChild: 0, otherBeneficiaries: 0, charity: 0 },
  };
}

describe('one authoritative savings budget', () => {
  it('uses the selected method and recomputes from income without updating fixed input state', () => {
    const p = percentagePlan();
    expect(monthlySavingsBudget(p)).toBe(100);
    p.monthlyIncome = 8000; p.savingsPercent = 0.25;
    expect(monthlySavingsBudget(p)).toBe(2000);
    expect(p.monthlySavings).toBe(99999);
    p.monthlySavings = 750; p.savingsMode = 'fixed';
    expect(monthlySavingsBudget(p)).toBe(750);
    expect(p.savingsPercent).toBe(0.25);
  });

  it('retains fractional savings and handles zero income or a zero percentage without NaN', () => {
    const p = percentagePlan();
    p.monthlyIncome = 1234.56; p.savingsPercent = 0.125;
    expect(monthlySavingsBudget(p)).toBeCloseTo(154.32, 10);
    p.savingsPercent = 0;
    expect(monthlySavingsBudget(p)).toBe(0);
    p.monthlyIncome = 0; p.savingsPercent = 1;
    expect(monthlySavingsBudget(p)).toBe(0);
  });

  it('uses income growth for percentage savings and savings growth for fixed savings', () => {
    const p = percentagePlan(); p.annualIncomeGrowth = 0.21;
    expect(monthlySavingsBudget(p, 1)).toBeCloseTo(121, 10);
    p.savingsMode = 'fixed'; p.monthlySavings = 200; p.annualSavingsGrowth = 0.5;
    expect(monthlySavingsBudget(p, 1)).toBeCloseTo(300, 10);
  });

  it('caps account allocations at the derived percentage budget without adding contributions twice', () => {
    const result = simulate(percentagePlan(), 41);
    expect(result.totalContributions).toBeCloseTo(1200, 8);
    expect(result.endingAssets).toBeCloseTo(1200, 8);
    expect(result.points.at(-1)?.cash).toBeCloseTo(600, 8);
    expect(result.points.at(-1)?.stocks).toBeCloseTo(600, 8);
  });

  it('puts the unallocated part of the percentage budget into accessible cash', () => {
    const p = percentagePlan(); p.accounts[0].monthlyContribution = 20; p.accounts[1].monthlyContribution = 30;
    const result = simulate(p, 41);
    expect(result.totalContributions).toBeCloseTo(1200, 8);
    expect(result.points.at(-1)?.cash).toBeCloseTo(840, 8);
    expect(result.points.at(-1)?.stocks).toBeCloseTo(360, 8);
    p.accounts = [];
    expect(simulate(p, 41).endingAssets).toBeCloseTo(1200, 8);
  });

  it('uses the same budget throughout retirement search, all scenarios and optimization', () => {
    const percentage = percentagePlan();
    const fixed: FinancialProfile = { ...structuredClone(percentage), savingsMode: 'fixed', monthlySavings: 100, annualSavingsGrowth: 0 };
    expect(simulate(percentage, 40.5)).toEqual(simulate(fixed, 40.5));
    expect(findRetirement(percentage).retirementAge).toBeCloseTo(40.5, 8);
    expect(findRetirement(percentage)).toEqual(findRetirement(fixed));
    expect(compareScenarios(percentage).map(s => s.result)).toEqual(compareScenarios(fixed).map(s => s.result));
    expect(optimizeRetirement(percentage)).toEqual(optimizeRetirement(fixed));
    expect(additionalSavingsForTarget(percentage, 40.25)).toBeCloseTo(200, 1);
  });

  it('preserves existing saved method inputs while deriving the active budget on import', () => {
    const p = percentagePlan();
    const imported = parseProfile(JSON.parse(JSON.stringify(p)));
    expect(imported).toEqual(p);
    expect(monthlySavingsBudget(imported)).toBe(100);
  });
});
