import { useState } from 'react'

type Props = {
  label: string
  value: number
  min?: number
  max?: number
  change: (value: number) => void
}

export function Measure({ label, value, min = 1, max = 3000, change }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return <label className="measure">
    <span>{label}</span>
    <span className="input-shell">
      <input type="number" value={draft ?? value} min={min} max={max} step={1}
        onChange={event => {
          const next = event.target.value
          setDraft(next)
          const number = event.target.valueAsNumber
          if (Number.isInteger(number) && number >= min && number <= max) change(number)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
      <span aria-hidden="true">cm</span>
    </span>
  </label>
}
