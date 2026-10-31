import { useId } from 'react';
import type { FinancialProfile } from '../../types';
import { monthlySavingsBudget } from '../../engine/savings';
import { Field, SelectField } from './Field';

const currency = (value: number) => new Intl.NumberFormat('en-MY', {
  style: 'currency', currency: 'MYR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);
const percentageText = (value: number) => new Intl.NumberFormat('en-MY', { maximumFractionDigits: 2 }).format(value);

export function SavingsFields({ profile, onChange, advanced }: {
  profile: FinancialProfile;
  onChange: (profile: FinancialProfile) => void;
  advanced: boolean;
}) {
  const headingId = useId();
  const budget = monthlySavingsBudget(profile);
  const percentage = profile.savingsMode === 'percentage';
  const equivalent = profile.monthlyIncome > 0 ? budget / profile.monthlyIncome * 100 : undefined;
  const set = (patch: Partial<FinancialProfile>) => onChange({ ...profile, ...patch });

  return <section className="savings-fields" aria-labelledby={headingId}>
    <div className="section-heading"><div><h3 id={headingId}>Your monthly savings</h3><p>Choose one savings method. Investment account contributions come from this total budget.</p></div></div>
    <div className="form-grid">
      <SelectField label="How do you save?" value={profile.savingsMode} onChange={value => set({ savingsMode: value as FinancialProfile['savingsMode'] })}>
        <option value="fixed">A fixed monthly amount</option><option value="percentage">A percentage of income</option>
      </SelectField>
      {percentage
        ? <Field label="Income saved each month" value={profile.savingsPercent * 100} onChange={value => set({ savingsPercent: value / 100 })} max={100} step={0.1} suffix="%" hint="Applied to the monthly take-home income entered in Profile." />
        : <Field label="Monthly savings" value={profile.monthlySavings} onChange={monthlySavings => set({ monthlySavings })} prefix="RM" step={100} max={10000000} hint={equivalent !== undefined && Number.isFinite(equivalent) ? `Equivalent to ${percentageText(equivalent)}% of your monthly take-home income. Includes all investment account contributions.` : 'Total monthly investment budget, including account contributions.'} />}
      {advanced && !percentage && <Field label="Annual savings growth" value={profile.annualSavingsGrowth * 100} onChange={value => set({ annualSavingsGrowth: value / 100 })} min={-50} max={50} step={0.1} suffix="%" hint="Growth of your overall savings budget. Account allocations have their own growth settings." />}
    </div>
    {percentage && <div className="form-note savings-summary">
      <span className="field-label">Calculated monthly savings</span>
      <output aria-label="Calculated monthly savings" aria-live="polite">{currency(budget)} per month</output>
      <p className="field-hint">{currency(profile.monthlyIncome)} take-home income × {percentageText(profile.savingsPercent * 100)}%. Update income in Profile or the percentage above to change this amount. Future savings follow your annual income growth assumption.</p>
    </div>}
  </section>;
}
