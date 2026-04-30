import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Undo2, Redo2,
  Type, Heading, Image, Quote, List, Code2, Minus, AlertCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────

export type BlockType =
  | 'paragraph' | 'heading' | 'image' | 'quote'
  | 'list' | 'code' | 'divider' | 'callout'

interface BlockBase { id: string; type: BlockType }

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph'
  content: string
  align?: 'left' | 'center' | 'right'
}
export interface HeadingBlock extends BlockBase {
  type: 'heading'
  content: string
  level: 2 | 3 | 4
}
export interface ImageBlock extends BlockBase {
  type: 'image'
  url: string
  alt: string
  caption?: string
  width?: 'normal' | 'wide' | 'full'
}
export interface QuoteBlock extends BlockBase {
  type: 'quote'
  content: string
  author?: string
}
export interface ListBlock extends BlockBase {
  type: 'list'
  items: string[]
  ordered: boolean
}
export interface CodeBlock extends BlockBase {
  type: 'code'
  content: string
  language?: string
}
export interface DividerBlock extends BlockBase { type: 'divider' }
export interface CalloutBlock extends BlockBase {
  type: 'callout'
  content: string
  icon?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'slate'
}

export type Block =
  | ParagraphBlock | HeadingBlock | ImageBlock | QuoteBlock
  | ListBlock | CodeBlock | DividerBlock | CalloutBlock

// ── Helpers ───────────────────────────────────────────────────

function newId() { return crypto.randomUUID() }

function createBlock(type: BlockType): Block {
  switch (type) {
    case 'paragraph': return { id: newId(), type, content: '', align: 'left' }
    case 'heading':   return { id: newId(), type, content: '', level: 2 }
    case 'image':     return { id: newId(), type, url: '', alt: '', caption: '', width: 'normal' }
    case 'quote':     return { id: newId(), type, content: '', author: '' }
    case 'list':      return { id: newId(), type, items: [''], ordered: false }
    case 'code':      return { id: newId(), type, content: '', language: 'javascript' }
    case 'divider':   return { id: newId(), type }
    case 'callout':   return { id: newId(), type, content: '', icon: 'ℹ️', color: 'blue' }
  }
}

const CALLOUT_COLORS: Record<string, string> = {
  blue:   'bg-blue-950 border-blue-700 text-blue-200',
  green:  'bg-green-950 border-green-700 text-green-200',
  yellow: 'bg-yellow-950 border-yellow-700 text-yellow-200',
  red:    'bg-red-950 border-red-700 text-red-200',
  slate:  'bg-slate-800 border-slate-600 text-slate-200',
}

// ── Block type menu ───────────────────────────────────────────

const BLOCK_MENU: { type: BlockType; label: string; Icon: typeof Type }[] = [
  { type: 'paragraph', label: 'Paragraphe',  Icon: Type },
  { type: 'heading',   label: 'Titre',       Icon: Heading },
  { type: 'image',     label: 'Image',       Icon: Image },
  { type: 'quote',     label: 'Citation',    Icon: Quote },
  { type: 'list',      label: 'Liste',       Icon: List },
  { type: 'code',      label: 'Code',        Icon: Code2 },
  { type: 'divider',   label: 'Séparateur',  Icon: Minus },
  { type: 'callout',   label: 'Encadré',     Icon: AlertCircle },
]

function AddMenu({ onAdd, onClose }: { onAdd: (t: BlockType) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="relative z-10 grid grid-cols-4 gap-1 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-xl my-1"
    >
      {BLOCK_MENU.map(({ type, label, Icon }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs"
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

function AddBlockButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="group flex items-center gap-2 py-0.5">
      <div className="flex-1 h-px bg-slate-800 group-hover:bg-slate-700 transition-colors" />
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-xs text-slate-600 hover:text-brand-400 hover:bg-slate-800 px-2 py-0.5 rounded-full transition-colors"
      >
        <Plus className="w-3 h-3" />
        ajouter
      </button>
      <div className="flex-1 h-px bg-slate-800 group-hover:bg-slate-700 transition-colors" />
    </div>
  )
}

// ── Block editor forms ────────────────────────────────────────

const inputCls = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const textareaCls = `${inputCls} resize-none`
const labelCls = 'text-xs text-slate-400 mb-1 block'

function ParagraphEditor({ block, onUpdate }: { block: ParagraphBlock; onUpdate: (p: Partial<ParagraphBlock>) => void }) {
  return (
    <div className="space-y-2">
      <textarea
        value={block.content}
        onChange={e => onUpdate({ content: e.target.value })}
        rows={3}
        placeholder="Contenu du paragraphe…"
        className={textareaCls}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Alignement :</span>
        {(['left', 'center', 'right'] as const).map(a => (
          <button
            key={a}
            onClick={() => onUpdate({ align: a })}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              (block.align ?? 'left') === a
                ? 'border-brand-500 text-brand-400'
                : 'border-slate-600 text-slate-500 hover:border-slate-500'
            }`}
          >
            {a === 'left' ? 'Gauche' : a === 'center' ? 'Centre' : 'Droite'}
          </button>
        ))}
      </div>
    </div>
  )
}

function HeadingEditor({ block, onUpdate }: { block: HeadingBlock; onUpdate: (p: Partial<HeadingBlock>) => void }) {
  return (
    <div className="space-y-2">
      <input
        value={block.content}
        onChange={e => onUpdate({ content: e.target.value })}
        placeholder="Titre…"
        className={inputCls}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Niveau :</span>
        {([2, 3, 4] as const).map(l => (
          <button
            key={l}
            onClick={() => onUpdate({ level: l })}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              block.level === l
                ? 'border-brand-500 text-brand-400'
                : 'border-slate-600 text-slate-500 hover:border-slate-500'
            }`}
          >
            H{l}
          </button>
        ))}
      </div>
    </div>
  )
}

function ImageEditor({ block, onUpdate }: { block: ImageBlock; onUpdate: (p: Partial<ImageBlock>) => void }) {
  return (
    <div className="space-y-2">
      <div>
        <label className={labelCls}>URL de l'image *</label>
        <input value={block.url} onChange={e => onUpdate({ url: e.target.value })} placeholder="https://…" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Texte alternatif</label>
          <input value={block.alt} onChange={e => onUpdate({ alt: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Légende</label>
          <input value={block.caption ?? ''} onChange={e => onUpdate({ caption: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Largeur</label>
        <select
          value={block.width ?? 'normal'}
          onChange={e => onUpdate({ width: e.target.value as ImageBlock['width'] })}
          className={inputCls}
        >
          <option value="normal">Normale</option>
          <option value="wide">Large</option>
          <option value="full">Pleine largeur</option>
        </select>
      </div>
      {block.url && (
        <img src={block.url} alt={block.alt} className="max-h-32 rounded-lg object-cover mt-1" />
      )}
    </div>
  )
}

function QuoteEditor({ block, onUpdate }: { block: QuoteBlock; onUpdate: (p: Partial<QuoteBlock>) => void }) {
  return (
    <div className="space-y-2">
      <textarea
        value={block.content}
        onChange={e => onUpdate({ content: e.target.value })}
        rows={3}
        placeholder="Texte de la citation…"
        className={textareaCls}
      />
      <input
        value={block.author ?? ''}
        onChange={e => onUpdate({ author: e.target.value })}
        placeholder="Auteur (optionnel)"
        className={inputCls}
      />
    </div>
  )
}

function ListEditor({ block, onUpdate }: { block: ListBlock; onUpdate: (p: Partial<ListBlock>) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-slate-500">Type :</span>
        <button
          onClick={() => onUpdate({ ordered: false })}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${!block.ordered ? 'border-brand-500 text-brand-400' : 'border-slate-600 text-slate-500'}`}
        >
          • Liste
        </button>
        <button
          onClick={() => onUpdate({ ordered: true })}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${block.ordered ? 'border-brand-500 text-brand-400' : 'border-slate-600 text-slate-500'}`}
        >
          1. Numérotée
        </button>
      </div>
      {block.items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-500 text-xs w-4 shrink-0">{block.ordered ? `${i + 1}.` : '•'}</span>
          <input
            value={item}
            onChange={e => {
              const items = [...block.items]
              items[i] = e.target.value
              onUpdate({ items })
            }}
            placeholder={`Élément ${i + 1}…`}
            className={inputCls}
          />
          {block.items.length > 1 && (
            <button
              onClick={() => onUpdate({ items: block.items.filter((_, j) => j !== i) })}
              className="text-slate-600 hover:text-red-400 shrink-0"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => onUpdate({ items: [...block.items, ''] })}
        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Ajouter un élément
      </button>
    </div>
  )
}

function CodeEditor({ block, onUpdate }: { block: CodeBlock; onUpdate: (p: Partial<CodeBlock>) => void }) {
  return (
    <div className="space-y-2">
      <input
        value={block.language ?? ''}
        onChange={e => onUpdate({ language: e.target.value })}
        placeholder="Langage (ex: javascript, sql, bash…)"
        className={inputCls}
      />
      <textarea
        value={block.content}
        onChange={e => onUpdate({ content: e.target.value })}
        rows={6}
        placeholder="// Votre code…"
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-green-300 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
      />
    </div>
  )
}

function CalloutEditor({ block, onUpdate }: { block: CalloutBlock; onUpdate: (p: Partial<CalloutBlock>) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-24">
          <label className={labelCls}>Icône (emoji)</label>
          <input
            value={block.icon ?? ''}
            onChange={e => onUpdate({ icon: e.target.value })}
            placeholder="ℹ️"
            className={inputCls}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Couleur</label>
          <select
            value={block.color ?? 'blue'}
            onChange={e => onUpdate({ color: e.target.value as CalloutBlock['color'] })}
            className={inputCls}
          >
            <option value="blue">Bleu</option>
            <option value="green">Vert</option>
            <option value="yellow">Jaune</option>
            <option value="red">Rouge</option>
            <option value="slate">Neutre</option>
          </select>
        </div>
      </div>
      <textarea
        value={block.content}
        onChange={e => onUpdate({ content: e.target.value })}
        rows={2}
        placeholder="Contenu de l'encadré…"
        className={textareaCls}
      />
    </div>
  )
}

// ── Block preview ─────────────────────────────────────────────

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      return block.content
        ? <p className="text-slate-300 text-sm leading-relaxed" style={{ textAlign: block.align ?? 'left' }}>{block.content}</p>
        : <p className="text-slate-600 text-sm italic">Paragraphe vide — cliquer pour éditer</p>

    case 'heading': {
      const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4'
      const cls = block.level === 2 ? 'text-xl font-bold' : block.level === 3 ? 'text-lg font-semibold' : 'text-base font-semibold'
      return block.content
        ? <Tag className={`${cls} text-white`}>{block.content}</Tag>
        : <p className="text-slate-600 text-sm italic">Titre vide — cliquer pour éditer</p>
    }

    case 'image':
      return block.url
        ? (
          <figure className="space-y-1">
            <img src={block.url} alt={block.alt} className="max-h-48 rounded-lg object-cover" />
            {block.caption && <figcaption className="text-xs text-slate-400">{block.caption}</figcaption>}
          </figure>
        )
        : <div className="border-2 border-dashed border-slate-700 rounded-lg h-24 flex items-center justify-center text-slate-500 text-sm">Image — cliquer pour définir l'URL</div>

    case 'quote':
      return (
        <blockquote className="border-l-4 border-brand-600 pl-4">
          <p className="text-slate-300 text-sm italic">{block.content || <span className="text-slate-600">Citation vide…</span>}</p>
          {block.author && <cite className="text-xs text-slate-500 mt-1 block">— {block.author}</cite>}
        </blockquote>
      )

    case 'list':
      return block.ordered
        ? <ol className="list-decimal list-inside space-y-0.5 text-slate-300 text-sm">{block.items.map((i, j) => <li key={j}>{i || '…'}</li>)}</ol>
        : <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-sm">{block.items.map((i, j) => <li key={j}>{i || '…'}</li>)}</ul>

    case 'code':
      return (
        <pre className="bg-slate-900 rounded-lg px-3 py-2 overflow-x-auto">
          <code className="text-green-300 text-xs font-mono">{block.content || '// code…'}</code>
        </pre>
      )

    case 'divider':
      return <hr className="border-slate-700" />

    case 'callout':
      return (
        <div className={`flex items-start gap-2 border rounded-xl px-4 py-3 ${CALLOUT_COLORS[block.color ?? 'blue']}`}>
          {block.icon && <span className="shrink-0">{block.icon}</span>}
          <p className="text-sm">{block.content || <span className="opacity-50">Encadré vide…</span>}</p>
        </div>
      )
  }
}

// ── Block wrapper ─────────────────────────────────────────────

interface BlockWrapperProps {
  block: Block
  isActive: boolean
  onActivate: () => void
  onUpdate: (patch: Partial<Block>) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function BlockWrapper({ block, isActive, onActivate, onUpdate, onDelete, onMoveUp, onMoveDown }: BlockWrapperProps) {
  function renderEditor() {
    switch (block.type) {
      case 'paragraph': return <ParagraphEditor block={block} onUpdate={p => onUpdate(p)} />
      case 'heading':   return <HeadingEditor   block={block} onUpdate={p => onUpdate(p)} />
      case 'image':     return <ImageEditor     block={block} onUpdate={p => onUpdate(p)} />
      case 'quote':     return <QuoteEditor     block={block} onUpdate={p => onUpdate(p)} />
      case 'list':      return <ListEditor      block={block} onUpdate={p => onUpdate(p)} />
      case 'code':      return <CodeEditor      block={block} onUpdate={p => onUpdate(p)} />
      case 'divider':   return <div className="text-xs text-slate-500 text-center py-2">Séparateur — aucune configuration</div>
      case 'callout':   return <CalloutEditor   block={block} onUpdate={p => onUpdate(p)} />
    }
  }

  return (
    <div className={`group relative rounded-xl border transition-all ${isActive ? 'border-brand-600 bg-slate-800' : 'border-transparent hover:border-slate-700 hover:bg-slate-800/50'}`}>
      {/* Block controls */}
      <div className={`absolute -right-1 -top-1 flex items-center gap-0.5 opacity-0 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'} transition-opacity`}>
        {onMoveUp && (
          <button onClick={onMoveUp} className="p-1 bg-slate-700 rounded text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
            <ChevronUp className="w-3 h-3" />
          </button>
        )}
        {onMoveDown && (
          <button onClick={onMoveDown} className="p-1 bg-slate-700 rounded text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
        <button onClick={onDelete} className="p-1 bg-slate-700 rounded text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Block type badge */}
      <div className={`absolute -left-1 top-3 opacity-0 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'} transition-opacity`}>
        <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
          {block.type}
        </span>
      </div>

      <div className="px-4 py-3" onClick={!isActive ? onActivate : undefined}>
        {isActive ? renderEditor() : <BlockPreview block={block} />}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

interface BlockEditorProps {
  initialBlocks: Block[]
  onChange: (blocks: Block[]) => void
}

export default function BlockEditor({ initialBlocks, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null)

  // Undo/redo via refs (avoids re-render on history change)
  const historyRef = useRef<Block[][]>([JSON.parse(JSON.stringify(initialBlocks))])
  const indexRef = useRef(0)
  const skipHistoryRef = useRef(false)

  useEffect(() => {
    onChange(blocks)
    if (!skipHistoryRef.current) {
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1)
      historyRef.current.push(JSON.parse(JSON.stringify(blocks)))
      indexRef.current = historyRef.current.length - 1
    }
    skipHistoryRef.current = false
  }, [blocks]) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return
    indexRef.current--
    skipHistoryRef.current = true
    setBlocks(JSON.parse(JSON.stringify(historyRef.current[indexRef.current])))
  }, [])

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return
    indexRef.current++
    skipHistoryRef.current = true
    setBlocks(JSON.parse(JSON.stringify(historyRef.current[indexRef.current])))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [undo, redo])

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((prev: Block[]) => prev.map((b: Block) => b.id === id ? { ...b, ...patch } as Block : b))
  }

  function deleteBlock(id: string) {
    setBlocks((prev: Block[]) => prev.filter((b: Block) => b.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev: Block[]) => {
      const idx = prev.findIndex((b: Block) => b.id === id)
      if (idx + dir < 0 || idx + dir >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      next.splice(idx + dir, 0, item)
      return next
    })
  }

  function insertBlock(type: BlockType, atIndex: number) {
    const block = createBlock(type)
    setBlocks(prev => {
      const next = [...prev]
      next.splice(atIndex, 0, block)
      return next
    })
    setActiveId(block.id)
    setAddMenuIndex(null)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-3 pb-3 border-b border-slate-800">
        <button onClick={undo} title="Annuler (Ctrl+Z)" className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} title="Refaire (Ctrl+Y)" className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
          <Redo2 className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-600 ml-2">{blocks.length} bloc{blocks.length !== 1 ? 's' : ''}</span>
        {activeId && (
          <button
            onClick={() => setActiveId(null)}
            className="ml-auto text-xs text-slate-500 hover:text-white px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors"
          >
            Fermer l'édition
          </button>
        )}
      </div>

      {/* Blocks */}
      <AddBlockButton onClick={() => setAddMenuIndex(0)} />
      {addMenuIndex === 0 && (
        <AddMenu onAdd={t => insertBlock(t, 0)} onClose={() => setAddMenuIndex(null)} />
      )}

      {blocks.map((block, idx) => (
        <div key={block.id}>
          <BlockWrapper
            block={block}
            isActive={activeId === block.id}
            onActivate={() => setActiveId(block.id)}
            onUpdate={patch => updateBlock(block.id, patch)}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={idx > 0 ? () => moveBlock(block.id, -1) : undefined}
            onMoveDown={idx < blocks.length - 1 ? () => moveBlock(block.id, 1) : undefined}
          />
          <AddBlockButton onClick={() => setAddMenuIndex(idx + 1)} />
          {addMenuIndex === idx + 1 && (
            <AddMenu onAdd={t => insertBlock(t, idx + 1)} onClose={() => setAddMenuIndex(null)} />
          )}
        </div>
      ))}

      {blocks.length === 0 && (
        <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
          Cliquez sur <strong>+ ajouter</strong> pour insérer votre premier bloc
        </div>
      )}
    </div>
  )
}
