import type { FinancialProfile, RetirementResult } from '../types';
import { runSimulation, simulate } from './simulation';
import { validateProfile } from './validation';

/** Scan every candidate month. Access dates, distributions and property sales can
 * make feasibility nonmonotonic, so binary search on retirement age is unsafe. */
export function findRetirement(p: FinancialProfile): RetirementResult {
  const errors = validateProfile(p);
  if (errors.length) throw new Error(errors[0]);
  const months = Math.round((p.lifeExpectancy - p.currentAge) * 12);
  let age: number | null = null;
  // Retiring exactly at the horizon has no retirement months and would make an
  // empty, unfunded plan look feasible. Require at least one funded month.
  for (let month = 0; month < months; month++) {
    const candidate = p.currentAge + month / 12;
    if (runSimulation(p, candidate, { capture: false }).feasible) { age = candidate; break; }
  }
  const displayAge = age ?? p.targetRetirementAge ?? p.currentAge;
  const simulation = simulate(p, displayAge);
  const targetSimulation = p.targetRetirementAge !== undefined && Math.abs(p.targetRetirementAge - displayAge) > 1e-8 ? simulate(p, p.targetRetirementAge) : undefined;
  return {
    retirementAge: age, yearsUntilRetirement: age === null ? null : age - p.currentAge,
    retirementYear: age === null ? null : p.currentYear + Math.floor(age - p.currentAge),
    simulation, targetSimulation,
    explanation: age === null ? `No feasible retirement date was found within your planning horizon. Adjust savings, spending, account access or legacy goals; the displayed projection evaluates retirement at age ${displayAge}.` : `The earliest feasible retirement date is age ${age.toFixed(1)}, using monthly cash flows through age ${p.lifeExpectancy}.`,
  };
}
