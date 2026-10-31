import { expect, it } from 'vitest';
import { defaultProfile } from '../data';
import { compareScenarios, findRetirement, optimizeRetirement } from '../engine';

it('calculates finite, solvent default projections, full scenarios and optimizer recommendations', () => {
  const result = findRetirement(defaultProfile);
  expect(result.retirementAge).not.toBeNull();
  expect(result.simulation.feasible).toBe(true);
  expect(result.simulation.requiredCapital).toBeGreaterThan(0);
  expect(result.simulation.points).toHaveLength((defaultProfile.lifeExpectancy - defaultProfile.currentAge) * 12 + 1);
  expect(result.simulation.points.every(p => Number.isFinite(p.totalAssets) && Number.isFinite(p.realNetWorth))).toBe(true);
  const scenarios = compareScenarios(defaultProfile);
  expect(scenarios).toHaveLength(4);
  expect(scenarios.every(s => Number.isFinite(s.result.simulation.requiredCapital))).toBe(true);
  const recommendations = optimizeRetirement(defaultProfile);
  expect(recommendations.filter(r => r.improves).length).toBeGreaterThan(0);
  expect(recommendations.filter(r => r.improves).every(r => r.retirementAge !== null && r.retirementAge < result.retirementAge!)).toBe(true);
}, 60000);
