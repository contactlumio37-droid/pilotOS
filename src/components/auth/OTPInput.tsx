import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from 'react'

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  className?: string
  autoFocus?: boolean
}

// 6 cases séparées, touch-friendly (min 44px), avec auto-advance et paste
export default function OTPInput({
  value,
  onChange,
  length = 6,
  className = '',
  autoFocus = false,
}: OTPInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const focusNext = (idx: number) => {
    inputs.current[Math.min(idx + 1, length - 1)]?.focus()
  }

  const focusPrev = (idx: number) => {
    inputs.current[Math.max(idx - 1, 0)]?.focus()
  }

  const handleChange = useCallback(
    (idx: number, char: string) => {
      const digit = char.replace(/\D/g, '').slice(-1)
      if (!digit) return

      const arr = value.split('').slice(0, length)
      while (arr.length < length) arr.push('')
      arr[idx] = digit
      onChange(arr.join(''))
      focusNext(idx)
    },
    [value, onChange, length],
  )

  const handleKeyDown = useCallback(
    (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault()
        const arr = value.split('').slice(0, length)
        while (arr.length < length) arr.push('')
        if (arr[idx]) {
          arr[idx] = ''
          onChange(arr.join(''))
        } else {
          focusPrev(idx)
          arr[Math.max(idx - 1, 0)] = ''
          onChange(arr.join(''))
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusPrev(idx)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusNext(idx)
      }
    },
    [value, onChange, length],
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
      if (!text) return
      onChange(text.padEnd(length, '').slice(0, length))
      inputs.current[Math.min(text.length, length - 1)]?.focus()
    },
    [onChange, length],
  )

  return (
    <div className={`flex gap-3 justify-center ${className}`}>
      {Array.from({ length }, (_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] ?? ''}
          autoFocus={autoFocus && idx === 0}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`
            w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all
            focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500
            ${value[idx] ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-900'}
          `}
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label={`Chiffre ${idx + 1}`}
        />
      ))}
    </div>
  )
}
