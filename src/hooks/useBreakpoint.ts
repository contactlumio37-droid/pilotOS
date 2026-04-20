import { useState, useEffect } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

// Desktop-first : mobile < 768 / tablet 768-1023 / desktop >= 1024
function getBreakpoint(width: number): Breakpoint {
  if (width >= 1024) return 'desktop'
  if (width >= 768) return 'tablet'
  return 'mobile'
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(
    () => getBreakpoint(window.innerWidth),
  )

  useEffect(() => {
    function handleResize() {
      setBreakpoint(getBreakpoint(window.innerWidth))
    }

    const observer = new ResizeObserver(() => handleResize())
    observer.observe(document.documentElement)

    return () => observer.disconnect()
  }, [])

  return breakpoint
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}

export function useIsDesktop(): boolean {
  return useBreakpoint() === 'desktop'
}
