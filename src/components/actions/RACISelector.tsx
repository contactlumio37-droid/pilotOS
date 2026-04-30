import type { RACIValue, RACIMember } from '@/components/actions/raci-types'

interface ChipSelectorProps {
  members: RACIMember[]
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

function ChipSelector({ members, selected, onChange, disabled }: ChipSelectorProps) {
  function toggle(id: string) {
    if (disabled) return
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  if (!members.length) {
    return <span className="text-xs text-slate-400">Aucun membre disponible</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map(m => {
        const active = selected.includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            disabled={disabled}
            className={`min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors
              ${active
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {m.full_name ?? '?'}
          </button>
        )
      })}
    </div>
  )
}

interface RACISelectorProps {
  members: RACIMember[]
  value: RACIValue
  onChange: (v: RACIValue) => void
  disabled?: boolean
  responsibleError?: string
}

export default function RACISelector({
  members,
  value,
  onChange,
  disabled,
  responsibleError,
}: RACISelectorProps) {
  const sorted = [...members].sort((a, b) =>
    (a.full_name ?? '').localeCompare(b.full_name ?? '', 'fr'),
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">RACI</h3>

      <div>
        <label className="label">Responsable *</label>
        <select
          value={value.responsible_id ?? ''}
          onChange={e => onChange({ ...value, responsible_id: e.target.value || null })}
          disabled={disabled}
          className="input"
          style={{ minHeight: '44px' }}
        >
          <option value="">— Non assigné —</option>
          {sorted.map(m => (
            <option key={m.id} value={m.id}>{m.full_name ?? '?'}</option>
          ))}
        </select>
        {responsibleError && (
          <p className="text-xs text-danger mt-1">{responsibleError}</p>
        )}
      </div>

      <div>
        <label className="label">Approbateur</label>
        <select
          value={value.accountable_id ?? ''}
          onChange={e => onChange({ ...value, accountable_id: e.target.value || null })}
          disabled={disabled}
          className="input"
          style={{ minHeight: '44px' }}
        >
          <option value="">— Non assigné —</option>
          {sorted.map(m => (
            <option key={m.id} value={m.id}>{m.full_name ?? '?'}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Consultés</label>
        <ChipSelector
          members={sorted}
          selected={value.consulted_ids}
          onChange={ids => onChange({ ...value, consulted_ids: ids })}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="label">Informés</label>
        <ChipSelector
          members={sorted}
          selected={value.informed_ids}
          onChange={ids => onChange({ ...value, informed_ids: ids })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
