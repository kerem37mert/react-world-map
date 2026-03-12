import type { ReactNode } from 'react'

export type ProjectionType =
  | 'mercator'
  | 'naturalEarth'
  | 'orthographic'
  | 'equirectangular'

export type ColorScheme = 'default' | 'continent' | 'monochrome' | 'dark' | 'custom'

export interface StateConfig {
  id: string
  name?: string
  color?: string
  borderColor?: string
  borderWidth?: number
  labelColor?: string
  visible?: boolean
  clickable?: boolean
  customGeometry?: GeoJSON.Feature
}

export interface CountryConfig {
  id: string // ISO 3166-1 alpha-3
  name?: string
  color?: string
  borderColor?: string
  borderWidth?: number
  labelColor?: string
  visible?: boolean
  clickable?: boolean
  states?: StateConfig[]
  customGeometry?: GeoJSON.Feature
}

export interface SeaConfig {
  id: string
  name?: string
  color?: string
  labelColor?: string
  labelVisible?: boolean
  visible?: boolean
  customGeometry?: GeoJSON.Feature
}

export interface WorldConfig {
  countries?: CountryConfig[]
  seas?: SeaConfig[]
  projection?: ProjectionType
  backgroundColor?: string
}

export interface MapFeature {
  id: string
  name: string
  type: 'country' | 'state' | 'sea'
  properties: Record<string, unknown>
}

export interface WorldMapProps {
  // Data customization
  world?: WorldConfig
  countries?: CountryConfig[]
  states?: StateConfig[]

  // Map appearance
  width?: number | string
  height?: number | string
  projection?: ProjectionType
  backgroundColor?: string
  defaultCountryColor?: string
  defaultBorderColor?: string
  defaultBorderWidth?: number

  /** Apply a built-in color scheme to all countries */
  colorScheme?: ColorScheme

  // Interaction
  zoomable?: boolean
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  initialCenter?: [number, number] // [longitude, latitude]

  // Events
  onCountryClick?: (feature: MapFeature) => void
  onCountryHover?: (feature: MapFeature | null) => void
  onStateClick?: (feature: MapFeature) => void
  onMapClick?: (coords: { lat: number; lng: number }) => void

  // Tooltip
  showTooltip?: boolean
  tooltipContent?: (feature: MapFeature) => ReactNode

  // ── New features ──────────────────────────────────────────────

  /** Show state/province border lines */
  showStateBorders?: boolean
  stateBorderColor?: string
  stateBorderWidth?: number
  /** Show borders only for specific country alpha-3 codes, e.g. ['TUR', 'DEU']. If omitted, shows all. */
  showStateBordersFor?: string[]
  /**
   * GeoJSON FeatureCollection containing province/state polygons.
   * Import from 'react-world-map/dist/data/states-default.geo.json' or provide your own.
   * Required when showStateBorders is true.
   */
  statesData?: GeoJSON.FeatureCollection

  /** Show capital city markers */
  showCapitals?: boolean
  capitalSize?: number
  capitalColor?: string
  showCapitalLabels?: boolean

  /** Show country name labels on map */
  showLabels?: boolean
  labelFontSize?: number
  labelColor?: string

  /** Show latitude/longitude graticule grid */
  showGraticule?: boolean
  graticuleColor?: string

  /** Show zoom control buttons (+/-) */
  showZoomControls?: boolean

  // ── Globe (orthographic) options ──────────────────────────────

  /** Initial rotation [lambda, phi, gamma] for orthographic globe */
  initialRotate?: [number, number, number]
  /** Auto-spin the globe (orthographic only) */
  autoRotate?: boolean
  /** Degrees/second for auto-rotate */
  rotateSpeed?: number
  /** Drag sensitivity: pixels per degree */
  rotateSensitivity?: number

  // ── Markers ────────────────────────────────────────────────────
  /** Custom pin/marker points on the map */
  markers?: MarkerConfig[]
}

// Internal processed types

export interface ProcessedCountry {
  geoFeature: GeoJSON.Feature
  config: CountryConfig
  states: ProcessedState[]
}

export interface ProcessedState {
  geoFeature: GeoJSON.Feature
  config: StateConfig
  countryId: string
}

export interface ProcessedSea {
  geoFeature: GeoJSON.Feature
  config: SeaConfig
}

export interface CapitalCity {
  id: string // country alpha-3
  name: string
  lat: number
  lng: number
  countryName: string
}

export interface MarkerConfig {
  id?: string
  lng: number
  lat: number
  label?: string
  color?: string
  size?: number
  onClick?: (marker: MarkerConfig) => void
}
