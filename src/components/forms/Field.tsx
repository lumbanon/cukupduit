import { useId, useState, type ReactNode } from 'react'

interface FieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  wide?: boolean
}

export function Field({ label, value, onChange, hint, prefix, suffix, min = 0, max, step = 1, wide }: FieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const validValue = Number.isFinite(value) ? value : 0
  const draftValue = draft === null || draft.trim() === '' ? undefined : Number(draft)
  const invalid = draftValue !== undefined && (!Number.isFinite(draftValue) || draftValue < min || draftValue > (max ?? Number.MAX_SAFE_INTEGER))
  return <div className={`field${wide ? ' field-wide' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="input-wrap">
      {prefix && <span className="input-prefix" aria-hidden="true">{prefix}</span>}
      <input id={id} type="number" inputMode="decimal" value={draft ?? validValue} min={min} max={max} step={step} aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onFocus={event => setDraft(event.currentTarget.value)}
        onChange={event => {
          setDraft(event.target.value)
          const parsed = event.target.valueAsNumber
          if (Number.isFinite(parsed) && parsed >= min && parsed <= (max ?? Number.MAX_SAFE_INTEGER)) onChange(parsed)
        }}
        onBlur={event => {
          const parsed = event.target.value.trim() === '' ? min : event.target.valueAsNumber
          onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, Number.isFinite(parsed) ? parsed : validValue)))
          setDraft(null)
        }} />
      {suffix && <span className="input-suffix" aria-hidden="true">{suffix}</span>}
    </div>
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
  </div>
}

export function SliderField({ label, value, onChange, hint, min = 0, max = 100, step = 1, prefix, suffix }: FieldProps) {
  const id = useId()
  return <div className="field slider-field">
    <div className="slider-label"><label htmlFor={id}>{label}</label><span>{prefix}{Number(value.toFixed(2)).toLocaleString('en-MY')}{suffix}</span></div>
    <input id={id} type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))}
      aria-describedby={hint ? `${id}-hint` : undefined} onChange={event => onChange(Number(event.target.value))} />
    <div className="range-endpoints" aria-hidden="true"><span>{prefix}{min}{suffix}</span><span>{prefix}{max}{suffix}</span></div>
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
  </div>
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} type="text" maxLength={80} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></div>
}

export function SelectField({ label, value, onChange, children, hint }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; hint?: string }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={event => onChange(event.target.value)} aria-describedby={hint ? `${id}-hint` : undefined}>{children}</select>{hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}</div>
}

export function ToggleField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  const id = useId()
  return <div className="switch-row"><div><label htmlFor={id}>{label}</label>{hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}</div><input id={id} type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} /></div>
}
