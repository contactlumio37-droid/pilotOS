import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, FileText, Plus, Upload, ChevronRight, Home, Search, X } from 'lucide-react'
import { useFolders, useDocuments, DOC_STATUS_CLASS, DOC_STATUS_LABEL, DOC_TYPE_LABEL } from '@/hooks/useDocuments'
import { useIsAtLeast } from '@/hooks/useRole'
import { useCreateFolder } from '@/hooks/useDocuments'
import DocumentDrawer from '@/components/modules/DocumentDrawer'
import type { Document, DocumentFolder } from '@/types/database'

function FolderCard({ folder, count, onClick }: { folder: DocumentFolder; count: number; onClick: () => void }) {
  return (
    <div onClick={onClick} className="card-hover cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <FolderOpen className="w-5 h-5 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{folder.name}</p>
          <p className="text-xs text-slate-400">{count} document{count !== 1 ? 's' : ''}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
      </div>
    </div>
  )
}

function DocumentRow({ doc, onClick }: { doc: Document; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
    >
      <FileText className="w-5 h-5 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
        <p className="text-xs text-slate-400">{doc.file_name ?? '—'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {doc.doc_type && (
          <span className="text-xs text-slate-500">{DOC_TYPE_LABEL[doc.doc_type] ?? doc.doc_type}</span>
        )}
        <span className={`badge ${DOC_STATUS_CLASS[doc.status]}`}>{DOC_STATUS_LABEL[doc.status]}</span>
        <span className="text-xs font-mono text-slate-400">{doc.version_label}</span>
      </div>
    </div>
  )
}

interface CreateFolderFormProps {
  onConfirm: (name: string) => void
  onCancel: () => void
}

function CreateFolderForm({ onConfirm, onCancel }: CreateFolderFormProps) {
  const [name, setName] = useState('')
  return (
    <div className="flex items-center gap-2 mb-4">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(name.trim()); if (e.key === 'Escape') onCancel() }}
        placeholder="Nom du dossier"
        className="input flex-1"
      />
      <button onClick={() => onConfirm(name.trim())} disabled={!name.trim()} className="btn-primary">
        Créer
      </button>
      <button onClick={onCancel} className="btn-secondary">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function DocumentsPage() {
  const canEdit = useIsAtLeast('contributor')
  const canManage = useIsAtLeast('manager')

  const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  const { data: folders = [] } = useFolders()
  const { data: documents = [], isLoading } = useDocuments(activeFolderId)
  const createFolder = useCreateFolder()

  const rootFolders = folders.filter(f => f.parent_id === null)

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.file_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setSelectedDoc(null)
    setDrawerOpen(true)
  }

  function openEdit(doc: Document) {
    setSelectedDoc(doc)
    setDrawerOpen(true)
  }

  async function handleCreateFolder(name: string) {
    if (!name) return
    await createFolder.mutateAsync({ name, parent_id: activeFolderId ?? null })
    setShowNewFolder(false)
  }

  const currentFolder = folders.find(f => f.id === activeFolderId)
  const subFolders = folders.filter(f => f.parent_id === activeFolderId)

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
            {/* Breadcrumb */}
            {activeFolderId !== undefined && (
              <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                <button onClick={() => setActiveFolderId(undefined)} className="flex items-center gap-1 hover:text-brand-600 transition-colors">
                  <Home className="w-3.5 h-3.5" />
                  Racine
                </button>
                {currentFolder && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-700 font-medium">{currentFolder.name}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canManage && activeFolderId !== undefined && (
              <button onClick={() => setShowNewFolder(true)} className="btn-secondary flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Dossier
              </button>
            )}
            {canManage && activeFolderId === undefined && (
              <button onClick={() => setShowNewFolder(true)} className="btn-secondary flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Dossier
              </button>
            )}
            {canEdit && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Déposer
              </button>
            )}
          </div>
        </div>

        {/* New folder form */}
        {showNewFolder && (
          <CreateFolderForm
            onConfirm={handleCreateFolder}
            onCancel={() => setShowNewFolder(false)}
          />
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un document…"
            className="input pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Root view: show folders */}
        {activeFolderId === undefined && !search && (
          <>
            {rootFolders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {rootFolders.map(f => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    count={documents.filter(d => d.folder_id === f.id).length}
                    onClick={() => setActiveFolderId(f.id)}
                  />
                ))}
              </div>
            )}

            {/* Root-level documents */}
            {filtered.length > 0 && (
              <div className="card overflow-hidden p-0">
                {filtered.map(doc => (
                  <DocumentRow key={doc.id} doc={doc} onClick={() => openEdit(doc)} />
                ))}
              </div>
            )}

            {rootFolders.length === 0 && filtered.length === 0 && !isLoading && (
              <div className="text-center py-20 text-slate-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium mb-2 text-slate-600">Aucun document</p>
                <p className="text-sm">Déposez vos premiers documents ou créez un dossier pour les organiser.</p>
                {canEdit && (
                  <button onClick={openCreate} className="btn-primary mt-4 mx-auto flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> Déposer un document
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Folder view: show sub-folders + docs */}
        {(activeFolderId !== undefined || search) && (
          <>
            {subFolders.length > 0 && !search && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {subFolders.map(f => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    count={documents.filter(d => d.folder_id === f.id).length}
                    onClick={() => setActiveFolderId(f.id)}
                  />
                ))}
              </div>
            )}

            {filtered.length > 0 ? (
              <div className="card overflow-hidden p-0">
                {filtered.map(doc => (
                  <DocumentRow key={doc.id} doc={doc} onClick={() => openEdit(doc)} />
                ))}
              </div>
            ) : !isLoading && (
              <div className="text-center py-16 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-slate-600">
                  {search ? 'Aucun résultat' : 'Ce dossier est vide'}
                </p>
                {!search && canEdit && (
                  <button onClick={openCreate} className="btn-secondary mt-3 mx-auto flex items-center gap-1.5 text-sm">
                    <Upload className="w-4 h-4" /> Déposer un document ici
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>

      <DocumentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        document={selectedDoc}
        folders={folders}
        defaultFolderId={typeof activeFolderId === 'string' ? activeFolderId : null}
      />
    </div>
  )
}
