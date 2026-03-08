import { memo } from 'react'
import { geoGraticule } from 'd3-geo'
import type { GeoPath } from 'd3-geo'

interface MapGraticuleProps {
  pathGenerator: GeoPath
  color?: string
  /** Show the sphere outline (for orthographic globe) */
  showSphereOutline?: boolean
  sphereOutlineColor?: string
}

const MapGraticule = memo(function MapGraticule({
  pathGenerator,
  color = 'rgba(0,0,0,0.08)',
  showSphereOutline = false,
  sphereOutlineColor = 'rgba(0,0,0,0.25)',
}: MapGraticuleProps) {
  const graticule = geoGraticule()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sphereD = pathGenerator({ type: 'Sphere' } as any)
  const gridD = pathGenerator(graticule())

  return (
    <g className="graticule-layer" style={{ pointerEvents: 'none' }}>
      {/* Sphere outline (for orthographic globe) */}
      {showSphereOutline && sphereD && (
        <path d={sphereD} fill="none" stroke={sphereOutlineColor} strokeWidth={1.5} />
      )}
      {/* Grid lines */}
      {gridD && (
        <path d={gridD} fill="none" stroke={color} strokeWidth={0.4} />
      )}
    </g>
  )
})

export default MapGraticule
