import { useEffect, useRef, useState, useCallback } from 'react'

export interface UseGlobeRotationOptions {
  enabled: boolean
  autoRotate: boolean
  rotateSpeed: number   // degrees/second
  sensitivity: number   // pixels per degree
  initialRotate: [number, number, number]
}

export interface UseGlobeRotationResult {
  rotate: [number, number, number]
  isDragging: boolean
  resetRotation: () => void
}

export function useGlobeRotation(
  svgRef: React.RefObject<SVGSVGElement | null>,
  options: UseGlobeRotationOptions
): UseGlobeRotationResult {
  const { enabled, autoRotate, rotateSpeed, sensitivity, initialRotate } = options

  const [rotate, setRotate] = useState<[number, number, number]>(initialRotate)
  const [isDragging, setIsDragging] = useState(false)

  const dragRef = useRef<{
    startX: number
    startY: number
    startRotate: [number, number, number]
  } | null>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  // Keep a ref to current rotate so drag handler always sees latest value
  const rotateRef = useRef<[number, number, number]>(initialRotate)

  useEffect(() => {
    rotateRef.current = rotate
  }, [rotate])

  // ── Drag to rotate ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return
    const svg = svgRef.current
    if (!svg) return

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault()
      svg.setPointerCapture(e.pointerId)
      isDraggingRef.current = true
      setIsDragging(true)
      // Snapshot current rotation at drag start
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startRotate: [...rotateRef.current] as [number, number, number],
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const [l0, p0, g0] = dragRef.current.startRotate

      setRotate([
        // Drag right → lambda increases (globe rotates eastward, land moves right) ✓
        l0 + dx / sensitivity,
        // Drag up (dy < 0) → phi decreases (tilts north up) ✓
        Math.max(-90, Math.min(90, p0 - dy / sensitivity)),
        g0,
      ])
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      dragRef.current = null
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    svg.addEventListener('pointercancel', onPointerUp)

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('pointercancel', onPointerUp)
    }
  // Intentionally omit `rotate` from deps — we use rotateRef to avoid stale closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, svgRef, sensitivity])

  // ── Auto-rotate ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !autoRotate) return

    const tick = (time: number) => {
      if (lastTimeRef.current && !isDraggingRef.current) {
        const dt = (time - lastTimeRef.current) / 1000
        setRotate((prev) => [prev[0] - rotateSpeed * dt, prev[1], prev[2]])
      }
      lastTimeRef.current = time
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = 0
    }
  }, [enabled, autoRotate, rotateSpeed])

  const resetRotation = useCallback(() => {
    setRotate(initialRotate)
  }, [initialRotate])

  return { rotate, isDragging, resetRotation }
}
