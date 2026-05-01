import React, { useState, useRef } from 'react'
import { X, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useCreateAction } from '@/hooks/useActions'
import type { ActionInsertPayload } from '@/hooks/useActions'
import type { ActionPriority, ActionStatus, ActionOrigin } from '@/types/database'

type Step = 'upload' | 'validate' | 'import'

interface CsvRow {
  title: string
  description?: string
  priority: ActionPriority
  status: ActionStatus
  origin: ActionOrigin
  due_date?: string
  error?: string
}

const VALID_PRIORITIES = new Set<ActionPriority>(['low', 'medium', 'high', 'critical'])
const VALID_STATUSES = new Set<ActionStatus>(['todo', 'in_progress', 'late', 'done', 'cancelled'])
const VALID_ORIGINS = new Set<ActionOrigin>(['manual', 'terrain', 'codir', 'process_review', 'audit', 'incident', 'kaizen'])

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''))
    const get = (key: string) => cols[header.indexOf(key)] ?? ''

    const title = get('titre') || get('title')
    const rawPriority = (get('priorité') || get('priorite') || get('priority') || 'medium').toLowerCase()
    const rawStatus = (get('statut') || get('status') || 'todo').toLowerCase()
    const rawOrigin = (get('origine') || get('origin') || 'manual').toLowerCase()
    const due_date = get('échéance') || get('echeance') || get('due_date') || get('date') || undefined

    const priority = VALID_PRIORITIES.has(rawPriority as ActionPriority) ? rawPriority as ActionPriority : 'medium'
    const status = VALID_STATUSES.has(rawStatus as ActionStatus) ? rawStatus as ActionStatus : 'todo'
    const origin = VALID_ORIGINS.has(rawOrigin as ActionOrigin) ? rawOrigin as ActionOrigin : 'manual'

    const error = !title ? 'Titre manquant' : undefined

    return {
      title,
      description: get('description') || undefined,
      priority,
      status,
      origin,
      due_date: due_date || undefined,
      error,
    }
  })
}

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function ImportActionsModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(0)
  const [failed, setFailed] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutateAsync: createAction } = useCreateAction()

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCsv(text)
      setRows(parsed)
      setStep('validate')
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    setStep('import')
    setProgress(0)
    setDone(0)
    setFailed(0)
    const valid = rows.filter((r: CsvRow) => !r.error)
    let d = 0, f = 0
    for (let i = 0; i < valid.length; i++) {
      const row = valid[i]
      try {
        const payload: ActionInsertPayload = {
          title: row.title,
          description: row.description,
          priority: row.priority,
          status: row.status,
          origin: row.origin,
          due_date: row.due_date,
        }
        await createAction(payload)
        d++
      } catch { f++ }
      setProgress(Math.round(((i + 1) / valid.length) * 100))
      setDone(d)
      setFailed(f)
    }
    onImported()
  }

  const validRows = rows.filter((r: CsvRow) => !r.error)
  const errorRows = rows.filter((r: CsvRow) => r.error)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Import CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">Glissez un fichier CSV ici</p>
                <p className="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-600 mb-1.5">Format attendu (colonnes) :</p>
                <p><span className="font-mono bg-white px-1 rounded border">titre</span> · <span className="font-mono bg-white px-1 rounded border">description</span> · <span className="font-mono bg-white px-1 rounded border">priorité</span> · <span className="font-mono bg-white px-1 rounded border">statut</span> · <span className="font-mono bg-white px-1 rounded border">origine</span> · <span className="font-mono bg-white px-1 rounded border">échéance</span></p>
                <p>Séparateur virgule ou point-virgule. Encodage UTF-8.</p>
              </div>
            </div>
          )}

          {/* Step 2 — Validate */}
          {step === 'validate' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-success-700">
                  <CheckCircle2 className="w-4 h-4" />
                  {validRows.length} ligne{validRows.length !== 1 ? 's' : ''} valide{validRows.length !== 1 ? 's' : ''}
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-danger">
                    <AlertCircle className="w-4 h-4" />
                    {errorRows.length} erreur{errorRows.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {rows.length > 0 && (
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-500 font-medium">Titre</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-medium">Priorité</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-medium">Statut</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((row, i) => (
                        <tr key={i} className={row.error ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[180px]">{row.title || '—'}</td>
                          <td className="px-3 py-2 text-slate-500">{row.priority}</td>
                          <td className="px-3 py-2 text-slate-500">{row.status}</td>
                          <td className="px-3 py-2">
                            {row.error && <span className="text-danger">{row.error}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {rows.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Aucune ligne détectée. Vérifiez le format du fichier.</p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('upload')} className="btn-secondary flex-1">Retour</button>
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="btn-primary flex-1"
                >
                  Importer {validRows.length} action{validRows.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Import progress */}
          {step === 'import' && (
            <div className="space-y-5 py-2">
              {progress < 100 ? (
                <>
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                    <p className="text-sm text-slate-700">Import en cours… {done}/{validRows.length}</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-brand-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-10 h-10 text-success-600 mx-auto mb-3" />
                    <p className="font-semibold text-slate-900">{done} action{done !== 1 ? 's' : ''} importée{done !== 1 ? 's' : ''}</p>
                    {failed > 0 && <p className="text-sm text-danger mt-1">{failed} échec{failed !== 1 ? 's' : ''}</p>}
                  </div>
                  <button onClick={onClose} className="btn-primary w-full">Fermer</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
