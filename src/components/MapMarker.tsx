import React, { memo } from 'react'
import type { GeoProjection } from 'd3-geo'
import type { MarkerConfig } from '../types'

interface Props {
  marker: MarkerConfig
  projection: GeoProjection
  zoomScale: number
}

function MapMarker({ marker, projection, zoomScale }: Props) {
  const proj = projection([marker.lng, marker.lat])
  if (!proj) return null

  const [x, y] = proj
  const size = (marker.size ?? 6) / Math.sqrt(zoomScale)
  const color = marker.color ?? '#e53935'

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: marker.onClick ? 'pointer' : 'default' }}
      onClick={marker.onClick ? () => marker.onClick!(marker) : undefined}
    >
      {/* Pin circle */}
      <circle r={size} fill={color} stroke="#fff" strokeWidth={size * 0.3} />
      {/* Label */}
      {marker.label && (
        <text
          x={size + 3}
          y={size * 0.4}
          fontSize={9 / Math.sqrt(zoomScale)}
          fill={color}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          paintOrder="stroke"
          stroke="#fff"
          strokeWidth={2 / Math.sqrt(zoomScale)}
        >
          {marker.label}
        </text>
      )}
    </g>
  )
}

export default memo(MapMarker)
