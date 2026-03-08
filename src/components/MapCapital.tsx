import React, { memo } from 'react'
import type { GeoProjection } from 'd3-geo'
import type { CapitalCity } from '../types'

interface MapCapitalProps {
  capital: CapitalCity
  projection: GeoProjection
  size?: number
  color?: string
  showLabel?: boolean
  zoomScale?: number
}

const MapCapital = memo(function MapCapital({
  capital,
  projection,
  size = 3,
  color = '#333333',
  showLabel = false,
  zoomScale = 1,
}: MapCapitalProps) {
  const projected = projection([capital.lng, capital.lat])
  if (!projected) return null

  const [x, y] = projected

  // Scale dot size inversely with zoom so it stays visually consistent
  const r = size / Math.sqrt(zoomScale)

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Outer ring */}
      <circle
        cx={x}
        cy={y}
        r={r * 1.1}
        fill="rgba(255,255,255,0.6)"
        stroke={color}
        strokeWidth={0.5 / Math.sqrt(zoomScale)}
      />
      {/* Inner dot */}
      <circle
        cx={x}
        cy={y}
        r={r * 0.5}
        fill={color}
      />
      {/* Label */}
      {showLabel && (
        <text
          x={x + r * 2.5}
          y={y + r}
          fontSize={Math.max(6, 9 / Math.sqrt(zoomScale))}
          fill={color}
          fontFamily="sans-serif"
          fontWeight="500"
          style={{ userSelect: 'none' }}
        >
          {capital.name}
        </text>
      )}
    </g>
  )
})

export default MapCapital
