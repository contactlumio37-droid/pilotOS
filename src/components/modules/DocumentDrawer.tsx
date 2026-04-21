import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, ExternalLink, FileText, Save, Upload, X } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import { useUploadDocument, useUpdateDocument, useDocumentUrl, DOC_STATUS_LABEL, DOC_STATUS_CLASS, DOC_TYPE_LABEL } from '@/hooks/useDocuments'
import { useIsAtLeast } from '@/hooks/useRole'
import type { Document, DocumentFolder, DocType, DocStatus } from '@/types/database'

const schema = z.object({
  title:     z.string().min(1, 'Titre requis'),
  doc_type:  z.string().nullable().optional(),
  folder_id: z.string().nullable().optional(),
  status:    z.enum(['draft', 'in_review', 'approved', 'active', 'archived', 'obsolete'] as const),
})
type FormData = z.infer<typeof schema>

const STATUS_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  draft:     ['in_review', 'archived'],
  in_review: ['approved', 'draft'],
  approved:  ['active', 'in_review'],
  active:    ['archived'],
  archived:  ['obsolete'],
  obsolete:  [],
}

interface Props {
  open: boolean
  onClose: () => void
  document?: Document | null
  folders?: DocumentFolder[]
  defaultFolderId?: string | null
}

export default function DocumentDrawer({ open, onClose, document, folders = [], defaultFolderId }: Props) {
  const isEdit    = !!document
  const canEdit   = useIsAtLeast('contributor')
  const canAdvance = useIsAtLeast('manager')
  const fileRef   = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const upload       = useUploadDocument()
  const updateDoc    = useUpdateDocument()
  const { data: signedUrl } = useDocumentUrl(document?.file_path ?? null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', doc_type: null, folder_id: defaultFolderId ?? null, status: 'draft' },
  })

  useEffect(() => {
    if (open) {
      setFile(null)
      reset(document ? {
        title:     document.title,
        doc_type:  document.doc_type ?? null,
        folder_id: document.folder_id ?? null,
        status:    document.status,
      } : {
        title: '', doc_type: null,
        folder_id: defaultFolderId ?? null,
        status: 'draft',
      })
    }
  }, [open, document, defaultFolderId, reset])

  async function onSubmit(data: FormData) {
    try {
      if (isEdit && document) {
        await updateDoc.mutateAsync({
          id: document.id,
          title: data.title,
          doc_type: (data.doc_type as DocType) || null,
          folder_id: data.folder_id || null,
          status: data.status,
        })
      } else {
        if (!file) return
        await upload.mutateAsync({
          file,
          title: data.title,
          folderId: data.folder_id || null,
          docType: (data.doc_type as DocType) || null,
        })
      }
      onClose()
    } catch { /* mutation error handled by React Query state */ }
  }

  const isPending = upload.isPending || updateDoc.isPending
  const nextStatuses = isEdit ? STATUS_TRANSITIONS[document!.status] : []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? document!.title : 'Déposer un document'}
      footer={
        canEdit ? (
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary flex items-center gap-1.5">
              <X className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              form="doc-form"
              disabled={isPending || (!isEdit && !file)}
              className="btn-primary flex items-center gap-1.5"
            >
              {isEdit ? <Save className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Déposer'}
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Status + download (view mode) */}
      {isEdit && (
        <div className="flex items-center justify-between mb-4">
          <span className={`badge ${DOC_STATUS_CLASS[document!.status]}`}>
            {DOC_STATUS_LABEL[document!.status]}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">{document!.version_label}</span>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Télécharger
              </a>
            )}
          </div>
        </div>
      )}

      {/* Workflow status transitions (manager+) */}
      {isEdit && canAdvance && nextStatuses.length > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-2">Faire avancer le statut :</p>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => updateDoc.mutate({ id: document!.id, status: s })}
                className="btn-secondary text-xs"
              >
                → {DOC_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      <form id="doc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Titre *</label>
          <input {...register('title')} className="input" placeholder="Ex : Procédure d'accueil" />
          {errors.title && <p className="text-xs text-danger-500 mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select {...register('doc_type')} className="input">
              <option value="">— Sélectionner —</option>
              {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dossier</label>
            <select {...register('folder_id')} className="input">
              <option value="">— Racine —</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File input (upload only) */}
        {!isEdit && (
          <div>
            <label className="label">Fichier *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-brand-700">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-brand-400">({(file.size / 1024).toFixed(0)} Ko)</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, images…</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {/* Status selector (edit only, shown for reference) */}
        {isEdit && (
          <div>
            <label className="label">Statut</label>
            <select {...register('status')} className="input" disabled={!canAdvance}>
              {(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map(s => (
                <option key={s} value={s}>{DOC_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        )}

        {/* File link (if existing doc has file) */}
        {isEdit && document?.file_name && (
          <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1">{document.file_name}</span>
            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noreferrer" className="shrink-0 text-brand-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </form>

      {/* Upload error */}
      {upload.isError && (
        <p className="text-sm text-danger-500 mt-3">
          Erreur lors du dépôt. Vérifiez que le bucket "documents" existe dans Supabase Storage.
        </p>
      )}
    </Drawer>
  )
}
