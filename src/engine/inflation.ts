/** Rates are effective annual decimals. Cash flows are never rounded internally. */
export function annualToMonthly(annualRate: number): number {
  if (!Number.isFinite(annualRate) || annualRate <= -1) throw new Error('Annual rate must be finite and greater than -100%.');
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}
export function inflationFactor(inflation: number, years: number): number { return Math.pow(1 + inflation, years); }
export function toReal(nominal: number, inflation: number, years: number): number { return nominal / inflationFactor(inflation, years); }
