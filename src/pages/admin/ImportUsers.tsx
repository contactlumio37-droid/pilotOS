import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/layout/PageHeader'

const VALID_ROLES = ['admin', 'manager', 'director', 'contributor', 'terrain', 'reader']

interface ParsedRow {
  email: string
  prenom: string
  nom: string
  role: string
  site: string
  _line: number
  _status: 'valid' | 'warn' | 'error'
  _message: string
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function downloadTemplate() {
  const csv = 'email,prenom,nom,role,site\nalice@exemple.fr,Alice,Martin,manager,\nbob@exemple.fr,Bob,Durand,contributor,Site Nord\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template_import_utilisateurs.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ImportUsers() {
  const { organisation } = useOrganisation()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows, setRows]           = useState<ParsedRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState<{ created: number; errors: number } | null>(null)
  const [dragOver, setDragOver]   = useState(false)

  function parseFile(file: File) {
    setResult(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const parsed: ParsedRow[] = (results.data as Record<string, string>[]).map((row, i) => {
          const email = (row.email ?? '').trim().toLowerCase()
          const role  = (row.role ?? '').trim().toLowerCase()
          let status: ParsedRow['_status'] = 'valid'
          let message = '✅ Valide'

          if (!validateEmail(email)) {
            status  = 'error'
            message = '❌ Email invalide'
          } else if (!VALID_ROLES.includes(role)) {
            status  = 'error'
            message = `❌ Rôle inconnu : "${role}"`
          }

          return {
            email,
            prenom: (row.prenom ?? '').trim(),
            nom:    (row.nom ?? '').trim(),
            role,
            site:   (row.site ?? '').trim(),
            _line:    i + 2,
            _status:  status,
            _message: message,
          }
        })
        setRows(parsed)
      },
    })
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.name.endsWith('.csv')) return
    parseFile(file)
  }

  async function handleSubmit() {
    if (!organisation || !user) return
    const validRows = rows.filter(r => r._status === 'valid')
    if (!validRows.length) return

    setSubmitting(true)
    let created = 0
    let errors  = 0

    for (const row of validRows) {
      const { error } = await supabase.from('invitations').insert({
        organisation_id: organisation.id,
        email:           row.email,
        role:            row.role,
        mode:            'csv_import',
        invited_by:      user.id,
      })
      if (error) errors++
      else created++
    }

    setResult({ created, errors })
    setSubmitting(false)

    // Marque les lignes traitées comme envoyées
    setRows(prev => prev.map(r =>
      r._status === 'valid'
        ? { ...r, _status: 'warn', _message: '⚠️ Email déjà invité' }
        : r,
    ))
  }

  const validCount = rows.filter(r => r._status === 'valid').length

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Import CSV"
        subtitle="Importer des utilisateurs en masse via fichier CSV"
        actions={
          <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" />
            Télécharger le template
          </button>
        }
      />

      {/* Zone de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current?.click()}
        className={`card cursor-pointer flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed transition-colors ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}
      >
        <Upload className={`w-8 h-8 ${dragOver ? 'text-brand-500' : 'text-slate-300'}`} />
        <div className="text-center">
          <p className="font-medium text-slate-600">Glissez un fichier CSV ici</p>
          <p className="text-xs text-slate-400 mt-1">ou cliquez pour choisir un fichier</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* Format attendu */}
      {!rows.length && (
        <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500 font-mono">
          <p className="text-slate-400 font-sans text-xs mb-1">Format attendu :</p>
          email,prenom,nom,role,site<br />
          alice@exemple.fr,Alice,Martin,manager,<br />
          bob@exemple.fr,Bob,Durand,contributor,Site Nord
        </div>
      )}

      {/* Prévisualisation */}
      {rows.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">
              {rows.length} ligne{rows.length > 1 ? 's' : ''} — {validCount} valide{validCount > 1 ? 's' : ''}
            </p>
            {validCount > 0 && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary text-sm"
              >
                {submitting ? 'Envoi en cours…' : `Envoyer ${validCount} invitation${validCount > 1 ? 's' : ''}`}
              </button>
            )}
          </div>

          {result && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${result.errors > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {result.created} invitation{result.created > 1 ? 's' : ''} créée{result.created > 1 ? 's' : ''}
              {result.errors > 0 && `, ${result.errors} erreur${result.errors > 1 ? 's' : ''}`}.
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Prénom / Nom</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rôle</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(row => (
                  <tr key={row._line} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{row._line}</td>
                    <td className="px-4 py-2.5 text-slate-700 truncate max-w-[180px]">{row.email}</td>
                    <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">
                      {[row.prenom, row.nom].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{row.role}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        {row._status === 'valid'  && <CheckCircle2  className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {row._status === 'warn'   && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {row._status === 'error'  && <XCircle       className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        <span className={
                          row._status === 'valid' ? 'text-emerald-600' :
                          row._status === 'warn'  ? 'text-amber-600'  :
                          'text-red-600'
                        }>{row._message}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
