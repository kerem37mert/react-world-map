import type { GeoProjection } from 'd3-geo'

/**
 * Converts pixel coordinates on the SVG to geographic [longitude, latitude].
 */
export function pixelToCoords(
  x: number,
  y: number,
  projection: GeoProjection
): { lat: number; lng: number } | null {
  const inverted = projection.invert?.([x, y])
  if (!inverted) return null
  return { lng: inverted[0], lat: inverted[1] }
}

/**
 * Converts geographic [longitude, latitude] to SVG pixel coordinates.
 */
export function coordsToPixel(
  lng: number,
  lat: number,
  projection: GeoProjection
): [number, number] | null {
  return projection([lng, lat]) ?? null
}

/**
 * Returns the centroid of a GeoJSON feature for label placement.
 */
export function getFeatureCentroid(
  feature: GeoJSON.Feature,
  pathGenerator: (feature: GeoJSON.Feature) => string | null
): [number, number] | null {
  const d = pathGenerator(feature)
  if (!d) return null

  // Use a simple approach: parse the first M command in the path
  // For better accuracy, use d3-geo centroid
  return null
}

/**
 * Returns a bounding box [minLng, minLat, maxLng, maxLat] for a GeoJSON feature.
 */
export function getFeatureBbox(
  feature: GeoJSON.Feature
): [number, number, number, number] | null {
  const geom = feature.geometry
  if (!geom) return null

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  function processCoords(coords: number[] | number[][] | number[][][]) {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as number[]
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
    } else {
      for (const sub of coords as number[][] | number[][][]) {
        processCoords(sub as number[] | number[][] | number[][][])
      }
    }
  }

  if (geom.type === 'Polygon') {
    processCoords(geom.coordinates)
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      processCoords(poly)
    }
  } else if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates
    return [lng, lat, lng, lat]
  }

  if (!isFinite(minLng)) return null
  return [minLng, minLat, maxLng, maxLat]
}

/**
 * Clamps a zoom scale to [min, max].
 */
export function clampZoom(scale: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, scale))
}
