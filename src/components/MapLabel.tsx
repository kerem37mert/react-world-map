import React, { memo } from 'react'
import type { GeoProjection } from 'd3-geo'

interface MapLabelProps {
  name: string
  // Label coordinates from GeoJSON properties (Natural Earth LABEL_X/LABEL_Y)
  lng: number
  lat: number
  projection: GeoProjection
  fontSize?: number
  color?: string
  zoomScale?: number
}

const MapLabel = memo(function MapLabel({
  name,
  lng,
  lat,
  projection,
  fontSize = 10,
  color = '#333',
  zoomScale = 1,
}: MapLabelProps) {
  const projected = projection([lng, lat])
  if (!projected) return null

  const [x, y] = projected

  // Scale font inversely with zoom to stay readable
  const scaledSize = Math.max(5, fontSize / Math.sqrt(zoomScale))

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={scaledSize}
      fill={color}
      fontFamily="sans-serif"
      fontWeight="500"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      opacity={0.85}
    >
      {name}
    </text>
  )
})

export default MapLabel
