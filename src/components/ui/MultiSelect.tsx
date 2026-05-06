import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
  avatar?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  maxDisplay?: number
  error?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  label,
  disabled = false,
  maxDisplay = 2,
  error,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    onChange(
      value.includes(id)
        ? value.filter(v => v !== id)
        : [...value, id]
    )
  }

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== id))
  }

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const selected = options.filter(o => value.includes(o.value))
  const displayed = selected.slice(0, maxDisplay)
  const overflow = selected.length - maxDisplay

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="label mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setOpen(o => !o)
          }
          if (e.key === 'Escape') {
            setOpen(false)
            setSearch('')
          }
        }}
        onClick={() => !disabled && setOpen(o => !o)}
        className={[
          'input flex min-h-[2.5rem] flex-wrap items-center gap-1 py-1.5 pr-8',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          open ? 'ring-2 ring-brand-600 border-brand-600' : '',
          error ? 'border-danger-DEFAULT' : '',
        ].join(' ')}
      >
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm select-none">{placeholder}</span>
        )}

        {displayed.map(opt => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
          >
            {opt.avatar && (
              <img
                src={opt.avatar}
                alt=""
                className="h-4 w-4 rounded-full object-cover"
              />
            )}
            <span className="max-w-[7rem] truncate">{opt.label}</span>
            <button
              type="button"
              onClick={e => remove(opt.value, e)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-brand-200"
              aria-label={`Retirer ${opt.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {overflow > 0 && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            +{overflow}
          </span>
        )}

        <ChevronDown
          className={[
            'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform duration-150',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-danger-DEFAULT">{error}</p>
      )}

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {/* Search bar */}
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="input w-full py-1.5 text-sm"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* List */}
          <ul className="max-h-60 overflow-y-auto py-1" role="group">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400 text-center">
                Aucun résultat pour « {search} »
              </li>
            )}
            {filtered.map(opt => {
              const checked = value.includes(opt.value)
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(opt.value)}
                  className={[
                    'flex cursor-pointer select-none items-center gap-3 px-3 py-2 text-sm transition-colors',
                    'hover:bg-slate-50 active:bg-slate-100',
                    checked ? 'text-brand-700' : 'text-slate-700',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                      checked
                        ? 'border-brand-600 bg-brand-600'
                        : 'border-slate-300 bg-white',
                    ].join(' ')}
                  >
                    {checked && (
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    )}
                  </span>

                  {opt.avatar ? (
                    <img
                      src={opt.avatar}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
                    >
                      {opt.label.charAt(0).toUpperCase()}
                    </span>
                  )}

                  <span className="truncate font-medium">{opt.label}</span>
                </li>
              )
            })}
          </ul>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5">
              <span className="text-xs text-slate-400">
                {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange([]) }}
                className="text-xs text-slate-400 hover:text-danger-DEFAULT transition-colors"
              >
                Tout désélectionner
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
