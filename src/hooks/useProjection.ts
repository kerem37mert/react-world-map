import { useMemo } from 'react'
import {
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoEquirectangular,
  geoPath,
} from 'd3-geo'
import type { GeoProjection, GeoPath } from 'd3-geo'
import type { ProjectionType } from '../types'

export interface UseProjectionResult {
  projection: GeoProjection
  pathGenerator: GeoPath
}

export function useProjection(
  type: ProjectionType,
  width: number,
  height: number,
  rotLambda = 0,
  rotPhi = 0,
  rotGamma = 0,
  /** Scale multiplier on top of fitSize — used for globe zoom */
  scaleMultiplier = 1
): UseProjectionResult {
  return useMemo(() => {
    let projection: GeoProjection

    switch (type) {
      case 'mercator':
        projection = geoMercator()
        break
      case 'orthographic':
        projection = geoOrthographic().clipAngle(90)
        break
      case 'equirectangular':
        projection = geoEquirectangular()
        break
      case 'naturalEarth':
      default:
        projection = geoNaturalEarth1()
        break
    }

    // fitSize sets the base scale to fill [width, height]
    projection.fitSize([width, height], { type: 'Sphere' })

    // Apply zoom multiplier (globe zoom changes projection scale, not SVG transform)
    if (scaleMultiplier !== 1) {
      projection.scale(projection.scale() * scaleMultiplier)
      // Re-center after scale change
      projection.translate([width / 2, height / 2])
    }

    // Apply rotation (used for globe)
    if (rotLambda !== 0 || rotPhi !== 0 || rotGamma !== 0) {
      projection.rotate([rotLambda, rotPhi, rotGamma])
    }

    const pathGenerator = geoPath(projection)
    return { projection, pathGenerator }
  }, [type, width, height, rotLambda, rotPhi, rotGamma, scaleMultiplier])
}
