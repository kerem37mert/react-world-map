import { useEffect, useRef, useCallback, useState } from 'react'
import { zoom, zoomIdentity, ZoomBehavior, ZoomTransform } from 'd3-zoom'
import { select } from 'd3-selection'
import type { GeoProjection } from 'd3-geo'

export interface UseZoomPanOptions {
  minZoom: number
  maxZoom: number
  initialZoom: number
  initialCenter?: [number, number]
  enabled: boolean
  projection: GeoProjection
  width: number
  height: number
  onZoomChange?: (scale: number) => void
}

export interface UseZoomPanResult {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  zoomToPoint: (x: number, y: number, scale: number) => void
  /** Current d3 zoom transform — use .apply([x,y]) for screen coords */
  currentTransform: ZoomTransform
}

export function useZoomPan(
  svgRef: React.RefObject<SVGSVGElement | null>,
  gRef: React.RefObject<SVGGElement | null>,
  options: UseZoomPanOptions
): UseZoomPanResult {
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [currentTransform, setCurrentTransform] = useState<ZoomTransform>(zoomIdentity)

  const {
    minZoom, maxZoom, initialZoom, initialCenter,
    enabled, projection, width, height, onZoomChange,
  } = options

  useEffect(() => {
    const svgEl = svgRef.current
    const gEl = gRef.current
    if (!svgEl || !gEl || !enabled) return

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on('zoom', (event) => {
        const transform: ZoomTransform = event.transform
        select(gEl).attr('transform', transform.toString())
        setCurrentTransform(transform)
        onZoomChange?.(transform.k)
      })

    zoomBehaviorRef.current = zoomBehavior
    const svgSelection = select(svgEl)
    svgSelection.call(zoomBehavior)

    let initialTransform = zoomIdentity.scale(initialZoom)
    if (initialCenter) {
      const projected = projection(initialCenter)
      if (projected) {
        const [px, py] = projected
        initialTransform = zoomIdentity
          .scale(initialZoom)
          .translate(width / 2 / initialZoom - px, height / 2 / initialZoom - py)
      }
    }
    svgSelection.call(zoomBehavior.transform, initialTransform)

    return () => { svgSelection.on('.zoom', null) }
  }, [svgRef, gRef, enabled, minZoom, maxZoom, initialZoom, initialCenter, projection, width, height])

  const zoomIn = useCallback(() => {
    const svgEl = svgRef.current; const zb = zoomBehaviorRef.current
    if (svgEl && zb) select(svgEl).call(zb.scaleBy, 1.5)
  }, [svgRef])

  const zoomOut = useCallback(() => {
    const svgEl = svgRef.current; const zb = zoomBehaviorRef.current
    if (svgEl && zb) select(svgEl).call(zb.scaleBy, 1 / 1.5)
  }, [svgRef])

  const resetZoom = useCallback(() => {
    const svgEl = svgRef.current; const zb = zoomBehaviorRef.current
    if (svgEl && zb) select(svgEl).call(zb.transform, zoomIdentity.scale(initialZoom))
  }, [svgRef, initialZoom])

  const zoomToPoint = useCallback(
    (x: number, y: number, scale: number) => {
      const svgEl = svgRef.current; const zb = zoomBehaviorRef.current
      if (svgEl && zb)
        select(svgEl).call(
          zb.transform,
          zoomIdentity.scale(scale).translate(-x + width / 2 / scale, -y + height / 2 / scale)
        )
    },
    [svgRef, width, height]
  )

  return { zoomIn, zoomOut, resetZoom, zoomToPoint, currentTransform }
}
