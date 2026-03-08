import React, { memo } from 'react'
import type { GeoPath } from 'd3-geo'
import type { SeaConfig } from '../types'

interface MapSeaProps {
  geoFeature: GeoJSON.Feature
  config: SeaConfig
  pathGenerator: GeoPath
}

const MapSea = memo(function MapSea({
  geoFeature,
  config,
  pathGenerator,
}: MapSeaProps) {
  const d = pathGenerator(geoFeature)
  if (!d) return null

  const fill = config.color ?? '#4a90d9'

  return (
    <path
      d={d}
      fill={fill}
      stroke="none"
      style={{ pointerEvents: 'none' }}
    />
  )
})

export default MapSea
