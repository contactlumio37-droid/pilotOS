import type { RACIValue, RACIMember } from '@/components/actions/raci-types'

interface ChipSelectorProps {
  members: RACIMember[]
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  activeColor?: string
}

function ChipSelector({ members, selected, onChange, disabled, activeColor = 'bg-brand-600' }: ChipSelectorProps) {
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
                ? `${activeColor} text-white`
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

function SingleChipSelector({
  members,
  selected,
  onChange,
  disabled,
  activeColor = 'bg-brand-600',
}: {
  members: RACIMember[]
  selected: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  activeColor?: string
}) {
  if (!members.length) {
    return <span className="text-xs text-slate-400">Aucun membre disponible</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map(m => {
        const active = m.id === selected
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(active ? null : m.id)}
            disabled={disabled}
            className={`min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors
              ${active
                ? `${activeColor} text-white`
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
        <p className="text-xs text-slate-400 mb-2">Personne qui exécute la tâche</p>
        <SingleChipSelector
          members={sorted}
          selected={value.responsible_id ?? null}
          onChange={id => onChange({ ...value, responsible_id: id })}
          disabled={disabled}
          activeColor="bg-brand-600"
        />
        {responsibleError && (
          <p className="text-xs text-danger mt-1">{responsibleError}</p>
        )}
      </div>

      <div>
        <label className="label">Approbateur</label>
        <p className="text-xs text-slate-400 mb-2">Personne qui valide et rend compte</p>
        <SingleChipSelector
          members={sorted}
          selected={value.accountable_id ?? null}
          onChange={id => onChange({ ...value, accountable_id: id })}
          disabled={disabled}
          activeColor="bg-amber-500"
        />
      </div>

      <div>
        <label className="label">
          Consultés
          <span className="ml-1 text-xs text-slate-400 font-normal">— Sollicités pour avis</span>
        </label>
        <ChipSelector
          members={sorted}
          selected={value.consulted_ids}
          onChange={ids => onChange({ ...value, consulted_ids: ids })}
          disabled={disabled}
          activeColor="bg-slate-500"
        />
      </div>

      <div>
        <label className="label">
          Informés
          <span className="ml-1 text-xs text-slate-400 font-normal">— Tenus informés uniquement</span>
        </label>
        <ChipSelector
          members={sorted}
          selected={value.informed_ids}
          onChange={ids => onChange({ ...value, informed_ids: ids })}
          disabled={disabled}
          activeColor="bg-slate-400"
        />
      </div>
    </div>
  )
}
