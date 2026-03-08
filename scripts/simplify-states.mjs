/**
 * Simplifies states-default.geo.json using Ramer-Douglas-Peucker algorithm.
 * Reduces file from ~29MB to ~3MB for smooth browser rendering.
 * Usage: node scripts/simplify-states.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INPUT  = resolve(__dirname, '../src/data/states-default.geo.json')
const OUTPUT = resolve(__dirname, '../src/data/states-default.geo.json')
const EPSILON = 0.15   // degrees — ~17km tolerance, invisible at screen scale
const PRECISION = 2    // decimal places for coordinates

// ── RDP simplification ────────────────────────────────────────────────────────

function perpDist(point, lineStart, lineEnd) {
  const [px, py] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / Math.sqrt(lenSq)
}

function rdp(points, epsilon) {
  if (points.length <= 2) return points
  let maxDist = 0
  let maxIdx = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1])
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]]
  const left  = rdp(points.slice(0, maxIdx + 1), epsilon)
  const right = rdp(points.slice(maxIdx), epsilon)
  return [...left.slice(0, -1), ...right]
}

function roundCoord(c) {
  return [
    Math.round(c[0] * 10 ** PRECISION) / 10 ** PRECISION,
    Math.round(c[1] * 10 ** PRECISION) / 10 ** PRECISION,
  ]
}

function simplifyRing(ring) {
  const simplified = rdp(ring, EPSILON)
  // Must close ring and have at least 4 points
  const rounded = simplified.map(roundCoord)
  if (rounded.length < 4) return null
  // Ensure ring is closed
  const first = rounded[0], last = rounded[rounded.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) rounded.push(first)
  return rounded
}

function simplifyGeometry(geom) {
  if (!geom) return geom
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates.map(simplifyRing).filter(Boolean)
    if (rings.length === 0) return null
    return { ...geom, coordinates: rings }
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map((poly) => poly.map(simplifyRing).filter(Boolean))
      .filter((poly) => poly.length > 0)
    if (polys.length === 0) return null
    return { ...geom, coordinates: polys }
  }
  return geom
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Reading', INPUT)
const fc = JSON.parse(readFileSync(INPUT, 'utf8'))
const before = fc.features.length
let skipped = 0

const simplified = fc.features
  .map((f) => {
    const geom = simplifyGeometry(f.geometry)
    if (!geom) { skipped++; return null }
    return { ...f, geometry: geom }
  })
  .filter(Boolean)

console.log(`Features: ${before} → ${simplified.length} (skipped ${skipped})`)

const out = { ...fc, features: simplified }
const json = JSON.stringify(out)  // compact, no pretty-print
writeFileSync(OUTPUT, json, 'utf8')

const mb = (json.length / 1024 / 1024).toFixed(1)
console.log(`Written ${mb} MB → ${OUTPUT}`)
