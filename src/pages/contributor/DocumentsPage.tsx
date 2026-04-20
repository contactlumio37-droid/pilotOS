import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FolderOpen, FileText, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from '@/hooks/useOrganisation'
import type { Document, DocumentFolder } from '@/types/database'

export default function DocumentsPage() {
  const { organisation } = useOrganisation()

  const { data: folders = [] } = useQuery({
    queryKey: ['document_folders', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data } = await supabase
        .from('document_folders')
        .select('*')
        .eq('organisation_id', organisation.id)
        .is('parent_id', null)
        .order('sort_order')
      return (data ?? []) as DocumentFolder[]
    },
    enabled: !!organisation,
  })

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', organisation?.id],
    queryFn: async () => {
      if (!organisation) return []
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('organisation_id', organisation.id)
        .eq('status', 'active')
        .order('title')
      return (data ?? []) as Document[]
    },
    enabled: !!organisation,
  })

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <button className="btn-primary">
            <Upload className="w-4 h-4" />
            Déposer un document
          </button>
        </div>

        {folders.length === 0 && documents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-3" />
            <p className="text-lg font-medium mb-2">Aucun document</p>
            <p className="text-sm">Déposez vos premiers documents ou créez-en depuis un template.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {folders.map((folder) => {
              const folderDocs = documents.filter((d) => d.folder_id === folder.id)
              return (
                <div key={folder.id} className="card-hover cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <FolderOpen className="w-5 h-5 text-brand-500" />
                    <h3 className="font-semibold text-slate-900">{folder.name}</h3>
                    <span className="badge badge-neutral ml-auto">{folderDocs.length}</span>
                  </div>
                  <div className="space-y-1">
                    {folderDocs.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{doc.title}</span>
                        <span className="text-slate-400 shrink-0">{doc.version_label}</span>
                      </div>
                    ))}
                    {folderDocs.length > 3 && (
                      <p className="text-xs text-slate-400 pl-5">
                        +{folderDocs.length - 3} documents
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
