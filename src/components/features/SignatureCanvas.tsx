import { useRef, useEffect, useState, useCallback } from 'react'
import { Eraser, Check } from 'lucide-react'

interface Props {
  onSave: (dataUrl: string) => void
  onClear?: () => void
  width?: number
  height?: number
}

export default function SignatureCanvas({ onSave, onClear, width = 480, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Retina support
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    ctx.scale(ratio, ratio)
  }, [])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsEmpty(false)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [])

  const handlePointerUp = useCallback(() => {
    drawing.current = false
  }, [])

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setIsEmpty(true)
    onClear?.()
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return
    // Export at 1x (not retina) for reasonable file size
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.offsetWidth
    exportCanvas.height = canvas.offsetHeight
    const ectx = exportCanvas.getContext('2d')
    if (!ectx) return
    ectx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height)
    onSave(exportCanvas.toDataURL('image/png'))
  }

  return (
    <div className="space-y-2">
      <div
        style={{ width, height: height }}
        className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-crosshair overflow-hidden max-w-full"
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {isEmpty && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 pointer-events-none select-none">
            Signez ici
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
        >
          <Eraser className="w-3.5 h-3.5" />
          Effacer
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Valider la signature
        </button>
      </div>
    </div>
  )
}
