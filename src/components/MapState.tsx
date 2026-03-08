import React, { memo, useCallback } from 'react'
import type { GeoPath } from 'd3-geo'
import type { StateConfig, MapFeature } from '../types'

interface MapStateProps {
  geoFeature: GeoJSON.Feature
  config: StateConfig
  countryId: string
  pathGenerator: GeoPath
  isHovered: boolean
  onMouseEnter: (feature: MapFeature, event: React.MouseEvent) => void
  onMouseLeave: () => void
  onClick: (feature: MapFeature, event: React.MouseEvent) => void
}

const MapState = memo(function MapState({
  geoFeature,
  config,
  countryId,
  pathGenerator,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: MapStateProps) {
  const d = pathGenerator(geoFeature)
  if (!d) return null

  const fill = config.color ?? 'transparent'
  const stroke = config.borderColor ?? '#ffffff'
  const strokeWidth = config.borderWidth ?? 0.3

  const mapFeature: MapFeature = {
    id: config.id,
    name: config.name ?? '',
    type: 'state',
    properties: { ...geoFeature.properties, countryId },
  }

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => onMouseEnter(mapFeature, e),
    [onMouseEnter, mapFeature]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (config.clickable !== false) onClick(mapFeature, e)
    },
    [onClick, mapFeature, config.clickable]
  )

  return (
    <path
      d={d}
      fill={isHovered ? lightenColor(fill, 20) : fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      style={{
        cursor: config.clickable !== false ? 'pointer' : 'default',
        transition: 'fill 0.15s ease',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
    />
  )
})

function lightenColor(color: string, percent: number): string {
  if (color === 'transparent' || !color.startsWith('#')) return color
  const hex = color.replace('#', '')
  if (hex.length !== 6 && hex.length !== 3) return color

  const fullHex =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex

  const r = Math.min(255, parseInt(fullHex.slice(0, 2), 16) + percent)
  const g = Math.min(255, parseInt(fullHex.slice(2, 4), 16) + percent)
  const b = Math.min(255, parseInt(fullHex.slice(4, 6), 16) + percent)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export default MapState
