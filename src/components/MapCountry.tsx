import React, { memo, useCallback } from 'react'
import type { GeoPath } from 'd3-geo'
import type { CountryConfig, MapFeature } from '../types'

interface MapCountryProps {
  geoFeature: GeoJSON.Feature
  config: CountryConfig
  pathGenerator: GeoPath
  defaultColor: string
  defaultBorderColor: string
  defaultBorderWidth: number
  isHovered: boolean
  onMouseEnter: (feature: MapFeature, event: React.MouseEvent) => void
  onMouseLeave: () => void
  onClick: (feature: MapFeature, event: React.MouseEvent) => void
}

const MapCountry = memo(function MapCountry({
  geoFeature,
  config,
  pathGenerator,
  defaultColor,
  defaultBorderColor,
  defaultBorderWidth,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: MapCountryProps) {
  const d = pathGenerator(geoFeature)
  if (!d) return null

  const fill = config.color ?? defaultColor
  const stroke = config.borderColor ?? defaultBorderColor
  const strokeWidth = config.borderWidth ?? defaultBorderWidth

  const mapFeature: MapFeature = {
    id: config.id,
    name: config.name ?? '',
    type: 'country',
    properties: geoFeature.properties ?? {},
  }

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => onMouseEnter(mapFeature, e),
    [onMouseEnter, mapFeature]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
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

/** Lightens a hex or CSS color by a percentage for hover effect */
function lightenColor(color: string, percent: number): string {
  if (!color.startsWith('#')) return color
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

export default MapCountry
