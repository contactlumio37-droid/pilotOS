import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, GripVertical, Pencil, Trash2, X, Check, Tag } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useActionCategories,
  useCreateActionCategory,
  useUpdateActionCategory,
  useDeleteActionCategory,
  useReorderActionCategories,
  type ActionCategory,
} from '@/hooks/useActionCategories'

// ── Preset colors ─────────────────────────────────────────────
const COLORS = [
  { hex: '#7c3aed', label: 'Violet' },
  { hex: '#0ea5e9', label: 'Bleu' },
  { hex: '#10b981', label: 'Vert' },
  { hex: '#f59e0b', label: 'Ambre' },
  { hex: '#ef4444', label: 'Rouge' },
  { hex: '#6b7280', label: 'Gris' },
]

// ── Preset icons (lucide names) ───────────────────────────────
const ICONS = [
  'tag', 'landmark', 'folder', 'refresh-cw', 'clipboard-check',
  'alert-triangle', 'target', 'zap', 'star', 'shield',
]

// ── Sortable row ──────────────────────────────────────────────

interface RowProps {
  category: ActionCategory
  onEdit: (c: ActionCategory) => void
  onDelete: (c: ActionCategory) => void
}

function SortableRow({ category, onEdit, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Réordonner"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Badge couleur */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: category.color + '22', color: category.color }}
      >
        <Tag className="w-3.5 h-3.5" />
      </span>

      <span className="flex-1 text-sm font-medium text-slate-800">{category.name}</span>

      <span className="text-xs font-mono text-slate-400 hidden sm:block">{category.color}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          aria-label="Modifier"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!category.is_default && (
          <button
            onClick={() => onDelete(category)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger hover:bg-danger-light transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Category form ─────────────────────────────────────────────

interface FormState {
  name: string
  color: string
  icon: string
}

interface CategoryFormProps {
  initial?: FormState
  onSave: (data: FormState) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function CategoryForm({ initial, onSave, onCancel, saving }: CategoryFormProps) {
  const [form, setForm] = useState<FormState>(
    initial ?? { name: '', color: '#6b7280', icon: 'tag' },
  )

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="label">Nom *</label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          className="input"
          placeholder="Ex : Formation, Conformité…"
          autoFocus
        />
      </div>

      <div>
        <label className="label">Couleur</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onClick={() => set('color', c.hex)}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c.hex,
                borderColor: form.color === c.hex ? '#1e293b' : 'transparent',
              }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={e => set('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border border-slate-200"
            title="Couleur personnalisée"
          />
        </div>
      </div>

      <div>
        <label className="label">Icône</label>
        <div className="flex gap-2 flex-wrap">
          {ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              onClick={() => set('icon', ic)}
              className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                form.icon === ic
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || saving}
          className="btn-primary text-sm py-1.5"
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement…
            </span>
          ) : (
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Enregistrer</span>
          )}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Confirmation modale suppression ──────────────────────────

interface DeleteModalProps {
  category: ActionCategory
  onConfirm: () => void
  onCancel: () => void
  error: string | null
  loading: boolean
}

function DeleteModal({ category, onConfirm, onCancel, error, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
      >
        <h3 className="font-semibold text-slate-900 mb-2">Supprimer la catégorie</h3>
        <p className="text-sm text-slate-500 mb-4">
          Voulez-vous supprimer <strong>"{category.name}"</strong> ? Cette action est irréversible.
        </p>
        {error && (
          <div className="bg-danger-light text-danger text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function ActionCategories() {
  const { data: categories = [], isLoading } = useActionCategories()
  const createCategory  = useCreateActionCategory()
  const updateCategory  = useUpdateActionCategory()
  const deleteCategory  = useDeleteActionCategory()
  const reorderCategories = useReorderActionCategories()

  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<ActionCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActionCategory | null>(null)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)
    reorderCategories.mutate(reordered.map(c => c.id))
  }

  async function handleCreate(data: { name: string; color: string; icon: string }) {
    await createCategory.mutateAsync(data)
    setShowAdd(false)
  }

  async function handleUpdate(data: { name: string; color: string; icon: string }) {
    if (!editTarget) return
    await updateCategory.mutateAsync({ id: editTarget.id, ...data })
    setEditTarget(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError((e as Error).message)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Catégories d'actions</h2>
          <p className="text-sm text-slate-500">Glissez-déposez pour réordonner.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditTarget(null) }}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <AnimatePresence>
        {showAdd && !editTarget && (
          <motion.div key="add-form" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CategoryForm
              onSave={handleCreate}
              onCancel={() => setShowAdd(false)}
              saving={createCategory.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {categories.map(cat =>
              editTarget?.id === cat.id ? (
                <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CategoryForm
                    initial={{ name: cat.name, color: cat.color, icon: cat.icon }}
                    onSave={handleUpdate}
                    onCancel={() => setEditTarget(null)}
                    saving={updateCategory.isPending}
                  />
                </motion.div>
              ) : (
                <SortableRow
                  key={cat.id}
                  category={cat}
                  onEdit={c => { setEditTarget(c); setShowAdd(false) }}
                  onDelete={c => { setDeleteTarget(c); setDeleteError(null) }}
                />
              ),
            )}
          </div>
        </SortableContext>
      </DndContext>

      {categories.length === 0 && !showAdd && (
        <div className="card text-center py-10">
          <Tag className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucune catégorie définie</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 text-sm">
            Créer la première
          </button>
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
          error={deleteError}
          loading={deleteCategory.isPending}
        />
      )}
    </div>
  )
}
