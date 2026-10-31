import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CircleHelp, Gift, GraduationCap, Heart, House, Landmark, Plus, Sparkles, Trash2, UserRound, UsersRound, Wallet } from 'lucide-react'
import type { AccountType, Child, FinancialProfile, InvestmentAccount, Liability } from '../../types'
import { Field, SelectField, SliderField, TextField, ToggleField } from './Field'

export interface PlannerProps {
  profile: FinancialProfile
  onChange: (profile: FinancialProfile) => void
  mode: 'quick' | 'advanced'
  step: number
  onStepChange: (step: number) => void
  onResults: () => void
}

const steps = [
  { title: 'Your profile', short: 'Profile', icon: UserRound, description: 'A little about where you are today.' },
  { title: 'Assets & savings', short: 'Assets', icon: Wallet, description: 'Give your money a starting point.' },
  { title: 'Your retirement lifestyle', short: 'Lifestyle', icon: House, description: 'Make room for the life you want to live.' },
  { title: 'Family & children', short: 'Family', icon: UsersRound, description: 'Plan for the people who matter most.' },
  { title: 'Inheritance & legacy', short: 'Legacy', icon: Gift, description: 'Choose what you would like to leave behind.' },
]

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'epf', label: 'EPF / KWSP' }, { value: 'asb', label: 'ASB / ASNB' },
  { value: 'bank', label: 'Bank savings' }, { value: 'fixed-deposit', label: 'Fixed deposit' },
  { value: 'stocks-my', label: 'Malaysian stocks' }, { value: 'stocks-us', label: 'US stocks' },
  { value: 'etf', label: 'ETFs' }, { value: 'bonds', label: 'Bonds' }, { value: 'unit-trust', label: 'Unit trusts' },
  { value: 'cash', label: 'Cash' }, { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other investment' }, { value: 'custom', label: 'Custom account' },
]

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const newProperty = (): NonNullable<InvestmentAccount['property']> => ({ mortgageBalance: 0, mortgageAnnualRate: 0.04, mortgageMonthlyPayment: 0, rentalMonthlyIncome: 0, monthlyCosts: 0, saleCostsRate: 0.03, paymentsIncludedInExpenses: false })
const newAccount = (index: number): InvestmentAccount => ({ id: newId(), name: `Investment ${index + 1}`, type: 'etf', balance: 0, monthlyContribution: 0, annualReturn: 0.05, annualFee: 0, contributionGrowth: 0, accessibleAge: 0, withdrawalPriority: index + 1, taxRate: 0, volatility: 0.15 })
const money = (value: number) => `RM ${Math.round(value).toLocaleString('en-MY')}`

export function Planner({ profile, onChange, mode, step, onStepChange, onResults }: PlannerProps) {
  const activeStep = Math.max(0, Math.min(4, step))
  const active = steps[activeStep]
  const advanced = mode === 'advanced'
  const set = (patch: Partial<FinancialProfile>) => onChange({ ...profile, ...patch })
  const setRetirement = (patch: Partial<FinancialProfile['retirement']>) => set({ retirement: { ...profile.retirement, ...patch } })
  const setLegacy = (patch: Partial<FinancialProfile['legacy']>) => set({ legacy: { ...profile.legacy, ...patch } })
  const updateAccount = (id: string, patch: Partial<InvestmentAccount>) => set({ accounts: profile.accounts.map(account => account.id === id ? { ...account, ...patch } : account) })
  const updateLiability = (id: string, patch: Partial<Liability>) => set({ liabilities: profile.liabilities.map(liability => liability.id === id ? { ...liability, ...patch } : liability) })
  const updateChild = (id: string, patch: Partial<Child>) => set({ children: profile.children.map(child => child.id === id ? { ...child, ...patch } : child) })
  const investmentAccounts = profile.accounts.filter(account => account.type !== 'property')
  const investmentBalance = investmentAccounts.reduce((sum, account) => sum + account.balance, 0)
  const weightedReturn = investmentBalance > 0 ? investmentAccounts.reduce((sum, account) => sum + account.balance * account.annualReturn, 0) / investmentBalance : investmentAccounts[0]?.annualReturn ?? 0.05
  const savings = profile.savingsMode === 'fixed' ? profile.monthlySavings : profile.monthlyIncome * profile.savingsPercent
  const allocated = investmentAccounts.reduce((sum, account) => sum + account.monthlyContribution, 0)
  const updateTimeline = (currentAge: number, lifeExpectancy: number) => {
    const withinPlan = (age: number) => Math.max(currentAge, Math.min(lifeExpectancy, age))
    set({
      currentAge,
      lifeExpectancy,
      targetRetirementAge: profile.targetRetirementAge === undefined ? undefined : withinPlan(profile.targetRetirementAge),
      legacy: { ...profile.legacy, distributionAge: withinPlan(profile.legacy.distributionAge) },
      retirement: { ...profile.retirement, spendingChanges: profile.retirement.spendingChanges.map(change => ({ ...change, age: withinPlan(change.age) })) },
      accounts: profile.accounts.map(account => account.property?.saleAge === undefined ? account : { ...account, property: { ...account.property, saleAge: withinPlan(account.property.saleAge) } }),
    })
  }
  const setTotalBalance = (balance: number) => {
    if (investmentAccounts.length === 0) set({ accounts: [...profile.accounts, { ...newAccount(profile.accounts.length), name: 'My investments', balance, monthlyContribution: savings }] })
    else set({ accounts: profile.accounts.map(account => account.type === 'property' ? account : { ...account, balance: investmentBalance > 0 ? account.balance / investmentBalance * balance : account.id === investmentAccounts[0].id ? balance : 0 }) })
  }
  const setReturn = (rate: number) => {
    if (investmentAccounts.length === 0) set({ accounts: [...profile.accounts, { ...newAccount(profile.accounts.length), name: 'My investments', annualReturn: rate, monthlyContribution: savings }] })
    else set({ accounts: profile.accounts.map(account => account.type === 'property' ? account : { ...account, annualReturn: Math.max(-0.9999, Math.min(1, account.annualReturn + rate - weightedReturn)) }) })
  }

  return <section className="planner-content" aria-labelledby="planner-title">
    <nav className="planner-steps" aria-label="Planning steps"><ol className="stepper">
      {steps.map((item, index) => <li key={item.short}><button type="button" className={`planner-step${index === activeStep ? ' active' : ''}${index < activeStep ? ' complete' : ''}`} aria-label={`Step ${index + 1}: ${item.short}${index < activeStep ? ', completed' : ''}`} aria-current={index === activeStep ? 'step' : undefined} onClick={() => onStepChange(index)}>
        <span className="step-number" aria-hidden="true">{index < activeStep ? <BadgeCheck size={16} /> : index + 1}</span><span className="step-label"><item.icon className="step-icon" size={20} aria-hidden="true" /><span>{item.short}</span></span>
      </button></li>)}
    </ol></nav>
    <div className="planner-heading planner-intro"><div><span className="eyebrow">STEP {activeStep + 1} OF 5 <span className="step-divider">/</span> {advanced ? 'ADVANCED PLAN' : 'QUICK PLAN'}</span><h2 id="planner-title">{active.title}</h2><p>{active.description}</p></div></div>

    {activeStep === 0 && <div className="form-section">
      <div className="form-grid">
        <Field label="Your current age" value={profile.currentAge} onChange={currentAge => updateTimeline(currentAge, Math.max(currentAge + 1, profile.lifeExpectancy))} min={18} max={100} suffix="years" />
        <Field label="Plan until age" value={profile.lifeExpectancy} onChange={lifeExpectancy => updateTimeline(profile.currentAge, lifeExpectancy)} min={profile.currentAge + 1} max={120} suffix="years" hint="Your planning horizon, rather than a prediction. Scheduled events are kept within this horizon." />
        <SelectField label="How do you save?" value={profile.savingsMode} onChange={value => set({ savingsMode: value as FinancialProfile['savingsMode'] })}>
          <option value="fixed">A fixed monthly amount</option><option value="percentage">A percentage of income</option>
        </SelectField>
        {profile.savingsMode === 'fixed' ? <Field label="Monthly savings" value={profile.monthlySavings} onChange={monthlySavings => set({ monthlySavings })} prefix="RM" step={100} max={10000000} hint="Total monthly investment budget, including account contributions." /> : <Field label="Income saved each month" value={profile.savingsPercent * 100} onChange={value => set({ savingsPercent: value / 100 })} max={100} step={1} suffix="%" />}
        {(advanced || profile.savingsMode === 'percentage') && <Field label="Monthly take-home income" value={profile.monthlyIncome} onChange={monthlyIncome => set({ monthlyIncome })} prefix="RM" step={100} max={10000000} />}
        {advanced && <>
          <Field label="Current monthly household expenses" value={profile.monthlyExpenses} onChange={monthlyExpenses => set({ monthlyExpenses })} prefix="RM" step={100} max={10000000} hint="Used for budget insights; savings are your amount after these expenses." />
          <Field label="Annual income growth" value={profile.annualIncomeGrowth * 100} onChange={value => set({ annualIncomeGrowth: value / 100 })} min={-50} max={50} step={0.1} suffix="%" />
          <Field label="Annual savings growth" value={profile.annualSavingsGrowth * 100} onChange={value => set({ annualSavingsGrowth: value / 100 })} min={-50} max={50} step={0.1} suffix="%" hint="Growth of your overall savings budget. Account allocations have their own growth settings." />
        </>}
        <Field label="Expected annual inflation" value={profile.inflation * 100} onChange={value => set({ inflation: value / 100 })} min={-5} max={30} step={0.1} suffix="%" hint="An assumption you can change, not a forecast." />
        <SliderField label="Inflation assumption" value={profile.inflation * 100} onChange={value => set({ inflation: value / 100 })} min={Math.min(0, Math.floor(profile.inflation * 100))} max={Math.max(10, Math.ceil(profile.inflation * 100))} step={0.1} suffix="%" />
      </div>
      <div className="form-divider" />
      <ToggleField label="I have a retirement age in mind" checked={profile.targetRetirementAge !== undefined} onChange={enabled => set({ targetRetirementAge: enabled ? Math.min(profile.lifeExpectancy, Math.max(profile.currentAge, 50)) : undefined })} hint="We'll still calculate your earliest feasible age and compare it with your target." />
      {profile.targetRetirementAge !== undefined && <div className="form-grid"><Field label="Your target retirement age" value={profile.targetRetirementAge} onChange={targetRetirementAge => set({ targetRetirementAge })} min={profile.currentAge} max={profile.lifeExpectancy} suffix="years" /><SliderField label="Your ideal timeline" value={profile.targetRetirementAge} onChange={targetRetirementAge => set({ targetRetirementAge })} min={profile.currentAge} max={profile.lifeExpectancy} suffix=" years" /></div>}
      <div className="form-note"><CircleHelp size={17} /><span>Everything stays in this browser session. No account, tracking, or automatic saving.</span></div>
    </div>}

    {activeStep === 1 && <div className="form-section">
      {!advanced && <>
        <div className="form-grid"><Field label="Current investable savings" value={Math.round(investmentBalance)} onChange={setTotalBalance} prefix="RM" step={1000} max={1000000000} hint="Cash and investments, excluding property. Editing this total preserves your account mix." /><Field label="Expected annual investment return" value={Number((weightedReturn * 100).toFixed(2))} onChange={value => setReturn(value / 100)} min={-99.99} max={100} step={0.1} suffix="%" hint="Gross balance-weighted return; account fees and taxes are deducted separately." /><SliderField label="Investment return assumption" value={weightedReturn * 100} onChange={value => setReturn(value / 100)} min={Math.min(0, Math.floor(weightedReturn * 100))} max={Math.max(12, Math.ceil(weightedReturn * 100))} step={0.1} suffix="%" /><Field label="Monthly savings" value={savings} onChange={monthlySavings => set({ monthlySavings, savingsMode: 'fixed' })} prefix="RM" step={100} max={10000000} /></div>
        <div className="form-note"><Landmark size={18} /><span>Your {profile.accounts.length} account{profile.accounts.length === 1 ? '' : 's'}, fees, and withdrawal restrictions stay in your plan. Use Advanced mode to edit each account.</span></div>
      </>}
      {advanced && <>
        <div className="section-heading"><div><h3>Your investment accounts</h3><p>Different pots. One complete picture.</p></div><button type="button" className="subtle-button" disabled={profile.accounts.length >= 50} onClick={() => set({ accounts: [...profile.accounts, newAccount(profile.accounts.length)] })}><Plus size={16} /> Add account</button></div>
        {profile.accounts.length === 0 && <div className="empty-state"><Wallet size={28} /><p>No investment accounts yet. Add one to model savings and investment growth.</p></div>}
        {profile.accounts.map((account, index) => <div className="sub-card" key={account.id}>
          <div className="card-heading"><h4>{account.type === 'property' ? <Building2 size={18} /> : <Wallet size={18} />} {account.name || `Account ${index + 1}`}</h4><button type="button" className="icon-button" aria-label={`Remove ${account.name || 'account'}`} onClick={() => set({ accounts: profile.accounts.filter(item => item.id !== account.id) })}><Trash2 size={16} /></button></div>
          <div className="form-grid">
            <TextField label="Account name" value={account.name} onChange={name => updateAccount(account.id, { name })} />
            <SelectField label="Account type" value={account.type} onChange={value => updateAccount(account.id, { type: value as AccountType, ...(value === 'epf' && account.type !== 'epf' && account.accessibleAge === 0 ? { accessibleAge: 55 } : {}), ...(value === 'property' && !account.property ? { property: newProperty() } : {}) })}>{accountTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</SelectField>
            <Field label={account.type === 'property' ? 'Current property value' : 'Current balance'} value={account.balance} onChange={balance => updateAccount(account.id, { balance })} prefix="RM" step={1000} max={1000000000} />
            <Field label={account.type === 'property' ? 'Annual property appreciation' : account.type === 'asb' ? 'Annual distribution assumption' : 'Expected annual return'} value={account.annualReturn * 100} onChange={value => updateAccount(account.id, { annualReturn: value / 100 })} min={-99.99} max={100} step={0.1} suffix="%" />
            {account.type !== 'property' && <>
              <Field label="Monthly contribution allocation" value={account.monthlyContribution} onChange={monthlyContribution => updateAccount(account.id, { monthlyContribution })} prefix="RM" step={100} max={10000000} />
              <Field label="Annual contribution growth" value={account.contributionGrowth * 100} onChange={value => updateAccount(account.id, { contributionGrowth: value / 100 })} min={-50} max={50} step={0.1} suffix="%" />
              <Field label="Annual account fee" value={account.annualFee * 100} onChange={value => updateAccount(account.id, { annualFee: value / 100 })} max={30} step={0.05} suffix="%" />
              <Field label="Tax on positive investment gains" value={account.taxRate * 100} onChange={value => updateAccount(account.id, { taxRate: value / 100 })} max={100} step={0.1} suffix="%" hint="Simplified tax assumption, not tax advice." />
              <Field label="Withdrawals available from age" value={account.accessibleAge} onChange={accessibleAge => updateAccount(account.id, { accessibleAge })} max={120} suffix="years" hint="Set 0 for unrestricted access. Set your own eligibility assumption." />
              <Field label="Withdrawal priority" value={account.withdrawalPriority} onChange={withdrawalPriority => updateAccount(account.id, { withdrawalPriority })} min={1} max={100} hint="Lower numbers are withdrawn first when accessible." />
              <Field label="Annual volatility assumption" value={(account.volatility ?? 0) * 100} onChange={value => updateAccount(account.id, { volatility: value / 100 })} max={100} step={1} suffix="%" hint="Recorded for your plan; deterministic projections use the expected return." />
            </>}
          </div>
          {account.type === 'epf' && <p className="field-hint">EPF is restricted until your configured age. Dividends and withdrawal eligibility are assumptions; verify your applicable rules separately.</p>}
          {account.type === 'asb' && <p className="field-hint">ASNB products have different eligibility and distribution rules. Configure assumptions for your specific product.</p>}
          {account.type === 'property' && <PropertyFields account={account} currentAge={profile.currentAge} horizon={profile.lifeExpectancy} onChange={property => updateAccount(account.id, { property })} />}
        </div>)}
        <div className="form-note"><CircleHelp size={18} /><span>{money(allocated)} allocated from your {money(savings)} monthly savings budget. Allocations are part of savings, rather than added on top. Additional family and debt costs reduce available savings; remaining unallocated savings go into accessible cash.</span></div>
        {allocated > savings && <p className="validation-note" role="status">Account allocations exceed your savings budget. The model limits them to available savings.</p>}
        <div className="section-heading"><div><h3>Debts & liabilities</h3><p>Add non-property debt here; mortgages belong with the property above.</p></div><button type="button" className="subtle-button" disabled={profile.liabilities.length >= 50} onClick={() => set({ liabilities: [...profile.liabilities, { id: newId(), name: 'Personal loan', balance: 0, annualRate: 0.05, monthlyPayment: 0, paymentIncludedInExpenses: false }] })}><Plus size={16} /> Add debt</button></div>
        {profile.liabilities.map(liability => <div className="sub-card" key={liability.id}><div className="card-heading"><h4>{liability.name || 'Debt'}</h4><button type="button" className="icon-button" aria-label={`Remove ${liability.name}`} onClick={() => set({ liabilities: profile.liabilities.filter(item => item.id !== liability.id) })}><Trash2 size={16} /></button></div><div className="form-grid"><TextField label="Debt name" value={liability.name} onChange={name => updateLiability(liability.id, { name })} /><Field label="Outstanding balance" value={liability.balance} onChange={balance => updateLiability(liability.id, { balance })} prefix="RM" step={100} max={1000000000} /><Field label="Annual interest rate" value={liability.annualRate * 100} onChange={value => updateLiability(liability.id, { annualRate: value / 100 })} max={100} step={0.1} suffix="%" /><Field label="Monthly repayment" value={liability.monthlyPayment} onChange={monthlyPayment => updateLiability(liability.id, { monthlyPayment })} prefix="RM" step={50} max={10000000} /></div><ToggleField label="Repayment already included in my household budget" checked={liability.paymentIncludedInExpenses} onChange={paymentIncludedInExpenses => updateLiability(liability.id, { paymentIncludedInExpenses })} hint="Prevents counting this payment twice in your cash flow." /></div>)}
      </>}
    </div>}

    {activeStep === 2 && <div className="form-section">
      <div className="basis-control"><span className="field-label">Enter retirement budgets in</span><div className="segmented" aria-label="Retirement value basis"><button type="button" aria-pressed={profile.retirement.valuesInTodaysMoney} className={profile.retirement.valuesInTodaysMoney ? 'active' : ''} onClick={() => setRetirement({ valuesInTodaysMoney: true })}>Today's money</button><button type="button" aria-pressed={!profile.retirement.valuesInTodaysMoney} className={!profile.retirement.valuesInTodaysMoney ? 'active' : ''} onClick={() => setRetirement({ valuesInTodaysMoney: false })}>Future MYR</button></div><p className="field-hint">{profile.retirement.valuesInTodaysMoney ? 'We increase these amounts with inflation to preserve today’s purchasing power.' : 'These are future nominal MYR amounts. We use them without inflation adjustment.'}</p></div>
      <div className="form-grid">
        <Field label="Monthly retirement living expenses" value={profile.retirement.monthlySpending} onChange={monthlySpending => setRetirement({ monthlySpending })} prefix="RM" step={100} max={10000000} hint="Everyday living costs. Enter only additional travel and healthcare below." />
        <SliderField label="Your monthly lifestyle" value={profile.retirement.monthlySpending} onChange={monthlySpending => setRetirement({ monthlySpending })} min={0} max={Math.max(20000, Math.ceil(profile.retirement.monthlySpending / 1000) * 1000)} step={100} prefix="RM " />
        <Field label="Additional annual travel budget" value={profile.retirement.annualTravel} onChange={annualTravel => setRetirement({ annualTravel })} prefix="RM" step={500} max={10000000} hint="Set to zero if already included in monthly spending." />
        <Field label="Additional annual healthcare budget" value={profile.retirement.annualHealthcare} onChange={annualHealthcare => setRetirement({ annualHealthcare })} prefix="RM" step={500} max={10000000} hint="Set to zero if already included in monthly spending." />
        <Field label="Emergency reserve" value={profile.retirement.emergencyReserve} onChange={emergencyReserve => setRetirement({ emergencyReserve })} prefix="RM" step={1000} max={100000000} hint="Protected capital to keep available throughout retirement." />
        <Field label="One-time retirement purchase" value={profile.retirement.oneTimePurchase} onChange={oneTimePurchase => setRetirement({ oneTimePurchase })} prefix="RM" step={1000} max={100000000} hint="An additional purchase at retirement, such as a car or renovation." />
      </div>
      {advanced && <><div className="section-heading"><div><h3>How might your spending change?</h3><p>Monthly changes start at the age you choose and continue afterwards.</p></div><button type="button" className="subtle-button" onClick={() => setRetirement({ spendingChanges: [...profile.retirement.spendingChanges, { age: Math.min(profile.lifeExpectancy, Math.max(profile.currentAge, 70)), monthlyChange: 0 }] })}><Plus size={16} /> Add change</button></div>{profile.retirement.spendingChanges.map((change, index) => <div className="sub-card" key={index}><div className="card-heading"><h4>Spending change {index + 1}</h4><button type="button" className="icon-button" aria-label={`Remove spending change ${index + 1}`} onClick={() => setRetirement({ spendingChanges: profile.retirement.spendingChanges.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div><div className="form-grid"><Field label="Starting at age" value={change.age} onChange={age => setRetirement({ spendingChanges: profile.retirement.spendingChanges.map((item, i) => i === index ? { ...item, age } : item) })} min={profile.currentAge} max={profile.lifeExpectancy} /><Field label="Change in monthly spending" value={change.monthlyChange} onChange={monthlyChange => setRetirement({ spendingChanges: profile.retirement.spendingChanges.map((item, i) => i === index ? { ...item, monthlyChange } : item) })} min={-10000000} max={10000000} step={100} prefix="RM" hint="Use a negative amount to reduce spending." /></div></div>)}</>}
      <div className="form-note"><Sparkles size={18} /><span>A comfortable retirement is personal. Start with your best estimate, then explore how a little more or less changes your timeline.</span></div>
    </div>}

    {activeStep === 3 && <div className="form-section">
      <div className="section-heading"><div><h3>{profile.children.length === 0 ? 'A little planning for their big future.' : `${profile.children.length} child${profile.children.length === 1 ? '' : 'ren'} in your plan`}</h3><p>Include existing children or a future addition to your family.</p></div><button type="button" className="subtle-button" disabled={profile.children.length >= 30} onClick={() => set({ children: [...profile.children, { id: newId(), name: `Child ${profile.children.length + 1}`, currentAge: 5, monthlySupport: 800, supportEndAge: 21, annualEducationCost: 3000, educationStartAge: 6, educationEndAge: 17, universityAmount: 100000, universityStartAge: 18, educationInflation: 0.04, gifts: [], costsIncludedInHousehold: false }] })}><Plus size={16} /> Add child</button></div>
      {profile.children.length === 0 && <div className="empty-state"><Heart size={32} /><h4>Every family looks different.</h4><p>No children in your plan. You can continue, or add a child to include their own support and education timeline.</p></div>}
      {profile.children.map(child => <div className="sub-card" key={child.id}><div className="card-heading"><h4><GraduationCap size={19} /> {child.name || 'Child'}</h4><button type="button" className="icon-button" aria-label={`Remove ${child.name || 'child'}`} onClick={() => set({ children: profile.children.filter(item => item.id !== child.id) })}><Trash2 size={16} /></button></div>
        <div className="form-grid"><TextField label="Name or label" value={child.name} onChange={name => updateChild(child.id, { name })} /><SelectField label="Planning for" value={child.plannedBirthYear === undefined ? 'existing' : 'future'} onChange={value => updateChild(child.id, { plannedBirthYear: value === 'future' ? profile.currentYear + 2 : undefined })}><option value="existing">An existing child</option><option value="future">A future child</option></SelectField>
          {child.plannedBirthYear === undefined ? <Field label="Child's current age" value={child.currentAge} onChange={currentAge => updateChild(child.id, { currentAge })} max={70} suffix="years" /> : <Field label="Planned birth year" value={child.plannedBirthYear} onChange={plannedBirthYear => updateChild(child.id, { plannedBirthYear })} min={profile.currentYear} max={profile.currentYear + 60} hint="No expenses are charged before the planned birth." />}
          <Field label="Monthly support" value={child.monthlySupport} onChange={monthlySupport => updateChild(child.id, { monthlySupport })} prefix="RM" step={100} max={1000000} /><Field label="Support until child reaches" value={child.supportEndAge} onChange={supportEndAge => updateChild(child.id, { supportEndAge })} max={70} suffix="years" /><Field label="Annual school / education costs" value={child.annualEducationCost} onChange={annualEducationCost => updateChild(child.id, { annualEducationCost })} prefix="RM" step={500} max={1000000} /><Field label="Education starts at child age" value={child.educationStartAge} onChange={educationStartAge => updateChild(child.id, { educationStartAge, educationEndAge: Math.max(educationStartAge, child.educationEndAge) })} max={70} suffix="years" /><Field label="Education ends at child age" value={child.educationEndAge} onChange={educationEndAge => updateChild(child.id, { educationEndAge })} min={child.educationStartAge} max={70} suffix="years" /><Field label="University funding goal" value={child.universityAmount} onChange={universityAmount => updateChild(child.id, { universityAmount })} prefix="RM" step={1000} max={10000000} /><Field label="University starts at child age" value={child.universityStartAge} onChange={universityStartAge => updateChild(child.id, { universityStartAge })} max={70} suffix="years" /><Field label="Annual education inflation" value={child.educationInflation * 100} onChange={value => updateChild(child.id, { educationInflation: value / 100 })} min={-5} max={30} step={0.1} suffix="%" /></div>
        <ToggleField label="All costs for this child are already in my household budget" checked={child.costsIncludedInHousehold} onChange={costsIncludedInHousehold => updateChild(child.id, { costsIncludedInHousehold })} hint="Excludes all support, education, university funding and gifts from additional cash flows. To exclude only selected costs, set those amounts to zero instead." />
        <div className="section-heading compact"><div><h4>One-time gifts & assistance</h4><p>For a home, wedding, or another important milestone.</p></div><button type="button" className="subtle-button" onClick={() => updateChild(child.id, { gifts: [...child.gifts, { id: newId(), age: 25, amount: 0 }] })}><Plus size={15} /> Add gift</button></div>{child.gifts.map(gift => <div className="gift-row" key={gift.id}><Field label="Child's age at gift" value={gift.age} onChange={age => updateChild(child.id, { gifts: child.gifts.map(item => item.id === gift.id ? { ...item, age } : item) })} max={100} /><Field label="Gift in today's money" value={gift.amount} onChange={amount => updateChild(child.id, { gifts: child.gifts.map(item => item.id === gift.id ? { ...item, amount } : item) })} prefix="RM" step={1000} max={100000000} /><button type="button" className="icon-button" aria-label={`Remove gift for ${child.name} at age ${gift.age}`} onClick={() => updateChild(child.id, { gifts: child.gifts.filter(item => item.id !== gift.id) })}><Trash2 size={16} /></button></div>)}
      </div>)}
      <div className="form-note"><CircleHelp size={18} /><span>Enter children's costs in today's money. Each child has an independent timeline; university funding is charged at their configured start age.</span></div>
    </div>}

    {activeStep === 4 && <div className="form-section">
      <div className="basis-control"><span className="field-label">Enter your legacy goals in</span><div className="segmented" aria-label="Legacy value basis"><button type="button" aria-pressed={profile.legacy.valuesInTodaysMoney} className={profile.legacy.valuesInTodaysMoney ? 'active' : ''} onClick={() => setLegacy({ valuesInTodaysMoney: true })}>Today's money</button><button type="button" aria-pressed={!profile.legacy.valuesInTodaysMoney} className={!profile.legacy.valuesInTodaysMoney ? 'active' : ''} onClick={() => setLegacy({ valuesInTodaysMoney: false })}>Future MYR</button></div><p className="field-hint">{profile.legacy.valuesInTodaysMoney ? 'Your target grows with inflation until the distribution date.' : 'Your target is a fixed future MYR amount at the distribution date.'}</p></div>
      <div className="form-grid"><Field label="Total inheritance target" value={profile.legacy.totalAmount} onChange={totalAmount => setLegacy({ totalAmount })} prefix="RM" step={10000} max={1000000000} hint="A shared target, in addition to any per-child amounts below." /><Field label="Additional inheritance per child" value={profile.legacy.perChild} onChange={perChild => setLegacy({ perChild })} prefix="RM" step={10000} max={1000000000} hint={`${profile.children.length} ${profile.children.length === 1 ? 'child' : 'children'} currently in your plan.`} /><Field label="Other beneficiaries (total amount)" value={profile.legacy.otherBeneficiaries} onChange={otherBeneficiaries => setLegacy({ otherBeneficiaries })} prefix="RM" step={10000} max={1000000000} /><Field label="Charitable donations" value={profile.legacy.charity} onChange={charity => setLegacy({ charity })} prefix="RM" step={10000} max={1000000000} /><Field label="Distribute legacy when you reach age" value={profile.legacy.distributionAge} onChange={distributionAge => setLegacy({ distributionAge })} min={profile.currentAge} max={profile.lifeExpectancy} suffix="years" hint="Your goal is evaluated at this age, rather than required in full at retirement." /></div>
      <div className="legacy-total"><span>Combined legacy goal</span><strong>{money(profile.legacy.totalAmount + profile.legacy.perChild * profile.children.length + profile.legacy.otherBeneficiaries + profile.legacy.charity)}</strong><span>{profile.legacy.valuesInTodaysMoney ? 'in today’s purchasing power' : 'in future nominal MYR'}</span></div>
      <div className="form-note"><Heart size={18} /><span>Set all targets to zero if leaving a fixed amount is not part of your plan. Financial estate projections do not replace legal estate planning.</span></div>
    </div>}

    <div className="step-actions"><button type="button" className="subtle-button" onClick={() => onStepChange(Math.max(0, activeStep - 1))} disabled={activeStep === 0}><ArrowLeft size={17} /> Back</button><span className="step-save-note">Your changes update the plan live</span><button type="button" className="primary-button" onClick={() => activeStep === 4 ? onResults() : onStepChange(activeStep + 1)}>{activeStep === 4 ? 'See my CukupDuit age' : 'Continue'}<ArrowRight size={17} /></button></div>
  </section>
}

function PropertyFields({ account, currentAge, horizon, onChange }: { account: InvestmentAccount; currentAge: number; horizon: number; onChange: (property: NonNullable<InvestmentAccount['property']>) => void }) {
  const property = account.property ?? newProperty()
  const set = (patch: Partial<NonNullable<InvestmentAccount['property']>>) => onChange({ ...property, ...patch })
  return <div className="property-fields"><div className="form-grid"><Field label="Outstanding mortgage" value={property.mortgageBalance} onChange={mortgageBalance => set({ mortgageBalance })} prefix="RM" step={1000} max={1000000000} /><Field label="Mortgage interest rate" value={property.mortgageAnnualRate * 100} onChange={value => set({ mortgageAnnualRate: value / 100 })} max={50} step={0.1} suffix="%" /><Field label="Monthly mortgage payment" value={property.mortgageMonthlyPayment} onChange={mortgageMonthlyPayment => set({ mortgageMonthlyPayment })} prefix="RM" step={100} max={1000000} /><Field label="Monthly rental income" value={property.rentalMonthlyIncome} onChange={rentalMonthlyIncome => set({ rentalMonthlyIncome })} prefix="RM" step={100} max={1000000} /><Field label="Additional monthly property costs" value={property.monthlyCosts} onChange={monthlyCosts => set({ monthlyCosts })} prefix="RM" step={100} max={1000000} hint="Maintenance and other costs excluded from household spending." /></div><ToggleField label="Mortgage payments already included in household budget" checked={property.paymentsIncludedInExpenses} onChange={paymentsIncludedInExpenses => set({ paymentsIncludedInExpenses })} /><ToggleField label="Plan to sell this property" checked={property.saleAge !== undefined} onChange={enabled => set({ saleAge: enabled ? Math.min(horizon, Math.max(currentAge, 60)) : undefined })} hint="Property is illiquid until an explicit sale; owner-occupied value cannot fund withdrawals." />{property.saleAge !== undefined && <div className="form-grid"><Field label="Your age at sale" value={property.saleAge} onChange={saleAge => set({ saleAge })} min={currentAge} max={horizon} suffix="years" /><Field label="Sale transaction costs" value={property.saleCostsRate * 100} onChange={value => set({ saleCostsRate: value / 100 })} max={100} step={0.1} suffix="%" /></div>}</div>
}
