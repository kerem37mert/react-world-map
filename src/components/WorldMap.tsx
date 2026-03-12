import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react'
import type { WorldMapProps, MapFeature, ProjectionType } from '../types'
import { useProjection } from '../hooks/useProjection'
import { useZoomPan } from '../hooks/useZoomPan'
import { useMapData } from '../hooks/useMapData'
import { useGlobeRotation } from '../hooks/useGlobeRotation'
import { pixelToCoords } from '../utils/geoHelpers'
import MapCountry from './MapCountry'
import MapState from './MapState'
import MapSea from './MapSea'
import MapTooltip from './MapTooltip'
import MapCapital from './MapCapital'
import MapLabel from './MapLabel'
import MapGraticule from './MapGraticule'
import MapZoomControls from './MapZoomControls'
import MapMarker from './MapMarker'

const DEFAULT_COUNTRY_COLOR = '#d4d4d4'
const DEFAULT_BORDER_COLOR = '#ffffff'
const DEFAULT_BORDER_WIDTH = 0.5
const DEFAULT_BG_COLOR = '#a8d8ea'
const DEFAULT_PROJECTION: ProjectionType = 'naturalEarth'
const DEFAULT_MIN_ZOOM = 0.5
const DEFAULT_MAX_ZOOM = 12
const DEFAULT_INITIAL_ZOOM = 1

interface TooltipState {
  feature: MapFeature
  x: number
  y: number
}

// For orthographic globe: check if a geographic point is on the visible hemisphere.
// D3's projection() doesn't return null for back-side points; we must check manually.
function isOnFrontHemisphere(lng: number, lat: number, rotate: [number, number, number]): boolean {
  const toRad = (d: number) => d * Math.PI / 180
  const clng = -rotate[0]   // center longitude of visible hemisphere
  const clat = -rotate[1]   // center latitude of visible hemisphere
  return (
    Math.sin(toRad(clat)) * Math.sin(toRad(lat)) +
    Math.cos(toRad(clat)) * Math.cos(toRad(lat)) * Math.cos(toRad(lng - clng))
  ) > 0
}

// Zoom threshold by Natural Earth labelrank
function minZoomForLabelrank(lr: number): number {
  if (lr <= 1) return 0.5    // Russia, USA, China, Canada, Australia, Brazil, India
  if (lr <= 2) return 0.9    // Very large countries
  if (lr <= 3) return 1.5    // Large countries
  if (lr <= 4) return 2.5    // Medium countries (avoids Europe overlap)
  if (lr <= 5) return 4.0    // Smaller countries
  return 6.0                  // Small countries, city-states
}

export function WorldMap({
  world,
  countries: countriesProp,
  states: statesProp,
  width: widthProp = '100%',
  height: heightProp = '100%',
  projection: projectionProp,
  backgroundColor,
  defaultCountryColor = DEFAULT_COUNTRY_COLOR,
  defaultBorderColor = DEFAULT_BORDER_COLOR,
  defaultBorderWidth = DEFAULT_BORDER_WIDTH,
  colorScheme,
  zoomable = true,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  initialZoom = DEFAULT_INITIAL_ZOOM,
  initialCenter,
  onCountryClick,
  onCountryHover,
  onStateClick,
  onMapClick,
  showTooltip = true,
  tooltipContent,
  showStateBorders = false,
  stateBorderColor = 'rgba(0,0,0,0.2)',
  stateBorderWidth = 0.4,
  showStateBordersFor,
  statesData,
  showCapitals = false,
  capitalSize = 3,
  capitalColor = '#222222',
  showCapitalLabels = false,
  showLabels = false,
  labelFontSize = 10,
  labelColor = '#333333',
  showGraticule = false,
  graticuleColor = 'rgba(0,0,0,0.08)',
  showZoomControls = false,
  initialRotate = [0, -20, 0],
  autoRotate = false,
  rotateSpeed = 6,
  rotateSensitivity = 0.4,
  markers,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)

  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState(initialZoom)
  const [globeScale, setGlobeScale] = useState(1)

  const projectionType = projectionProp ?? world?.projection ?? DEFAULT_PROJECTION
  const isOrtho = projectionType === 'orthographic'
  const bgColor = backgroundColor ?? world?.backgroundColor ?? DEFAULT_BG_COLOR

  // Container size observer
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setContainerSize({
        width: typeof widthProp === 'number' ? widthProp : rect.width || 800,
        height: typeof heightProp === 'number' ? heightProp : rect.height || 500,
      })
    }
    update()
    if (typeof window === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [widthProp, heightProp])

  // Globe rotation (only active for orthographic)
  const { rotate, isDragging, resetRotation } = useGlobeRotation(svgRef, {
    enabled: isOrtho,
    autoRotate: isOrtho && autoRotate,
    rotateSpeed,
    sensitivity: 1 / rotateSensitivity,
    initialRotate,
  })

  const { projection, pathGenerator } = useProjection(
    projectionType,
    containerSize.width,
    containerSize.height,
    isOrtho ? rotate[0] : 0,
    isOrtho ? rotate[1] : 0,
    isOrtho ? rotate[2] : 0,
    isOrtho ? globeScale : 1
  )

  // Zoom/pan — disabled for orthographic (globe uses drag-to-rotate instead)
  const { zoomIn, zoomOut, resetZoom, currentTransform } = useZoomPan(svgRef, gRef, {
    minZoom,
    maxZoom,
    initialZoom,
    initialCenter,
    enabled: zoomable && !isOrtho,
    projection,
    width: containerSize.width,
    height: containerSize.height,
    onZoomChange: setZoomScale,
  })

  const { countries, seas, capitals } = useMapData(
    world, countriesProp, statesProp,
    defaultCountryColor, defaultBorderColor, defaultBorderWidth, colorScheme
  )

  // State border features from user-supplied statesData prop
  const stateFeatures = useMemo<GeoJSON.Feature[]>(
    () => (showStateBorders && statesData ? statesData.features : []),
    [showStateBorders, statesData]
  )

  // State borders — chunked async computation so UI stays responsive.
  // Result stored as array of chunk-paths (~15 <path> nodes instead of 4596).
  const [stateBorderChunks, setStateBorderChunks] = useState<string[]>([])
  useEffect(() => {
    if (!showStateBorders || stateFeatures.length === 0) {
      setStateBorderChunks([])
      return
    }
    let cancelled = false
    setStateBorderChunks([])

    const filtered = showStateBordersFor
      ? stateFeatures.filter((f) => showStateBordersFor.includes((f.properties?.adm0_a3 ?? f.properties?.ADM0_A3) as string))
      : stateFeatures

    const CHUNK = 300
    let i = 0

    function tick() {
      if (cancelled) return
      const end = Math.min(i + CHUNK, filtered.length)
      const parts: string[] = []
      for (; i < end; i++) {
        const d = pathGenerator(filtered[i])
        if (d) parts.push(d)
      }
      if (parts.length > 0) setStateBorderChunks((prev) => [...prev, parts.join(' ')])
      if (i < filtered.length) setTimeout(tick, 0)
    }

    setTimeout(tick, 0)
    return () => { cancelled = true }
  }, [showStateBorders, stateFeatures, showStateBordersFor, pathGenerator])

  // ── Label collision detection ─────────────────────────────────────────────
  const effectiveZoom = isOrtho ? globeScale : zoomScale

  const visibleLabels = useMemo(() => {
    if (!showLabels) return []

    // Sort by labelrank (lower = more important, rendered first)
    const sorted = [...countries].sort((a, b) => {
      const ra = (a.geoFeature.properties?.labelrank as number) ?? 5
      const rb = (b.geoFeature.properties?.labelrank as number) ?? 5
      return ra - rb
    })

    const result: Array<{ id: string; name: string; lng: number; lat: number }> = []
    // Placed bounding boxes in screen space [x1,y1,x2,y2]
    const placed: Array<[number, number, number, number]> = []

    for (const { geoFeature, config } of sorted) {
      const lr = (geoFeature.properties?.labelrank as number) ?? 5
      if (effectiveZoom < minZoomForLabelrank(lr)) continue

      const lng = geoFeature.properties?.labelLng as number | null
      const lat = geoFeature.properties?.labelLat as number | null
      if (lng == null || lat == null) continue

      // For orthographic: skip labels on the back hemisphere
      if (isOrtho && !isOnFrontHemisphere(lng, lat, rotate)) continue

      // Project to SVG space then apply current zoom transform
      const proj = projection([lng, lat])
      if (!proj) continue
      const [sx, sy] = currentTransform.apply(proj)

      // Approximate bounding box in SCREEN space (font renders at screen size)
      const screenFs = labelFontSize * Math.sqrt(effectiveZoom)
      const w = (config.name?.length ?? 4) * screenFs * 0.58
      const h = screenFs * 1.6
      const box: [number, number, number, number] = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2]

      // Skip if out of visible area
      if (box[2] < 0 || box[0] > containerSize.width || box[3] < 0 || box[1] > containerSize.height) continue

      // Skip if overlaps with any already-placed label
      const overlaps = placed.some(
        (p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]
      )
      if (overlaps) continue

      result.push({ id: config.id, name: config.name ?? '', lng, lat })
      placed.push(box)
    }
    return result
  }, [showLabels, countries, effectiveZoom, projection, currentTransform, labelFontSize, containerSize, isOrtho, rotate])

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleCountryMouseEnter = useCallback(
    (feature: MapFeature, event: React.MouseEvent) => {
      if (isDragging) return
      setHoveredId(feature.id)
      if (showTooltip) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) setTooltip({ feature, x: event.clientX - rect.left, y: event.clientY - rect.top })
      }
      onCountryHover?.(feature)
    },
    [isDragging, showTooltip, onCountryHover]
  )

  const handleCountryMouseLeave = useCallback(() => {
    setHoveredId(null)
    setTooltip(null)
    onCountryHover?.(null)
  }, [onCountryHover])

  const handleCountryClick = useCallback(
    (feature: MapFeature, _e: React.MouseEvent) => onCountryClick?.(feature),
    [onCountryClick]
  )

  const handleStateClick = useCallback(
    (feature: MapFeature, _e: React.MouseEvent) => onStateClick?.(feature),
    [onStateClick]
  )

  const handleMapClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (isDragging || !onMapClick) return
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const coords = pixelToCoords(event.clientX - rect.left, event.clientY - rect.top, projection)
      if (coords) onMapClick(coords)
    },
    [isDragging, onMapClick, projection]
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!tooltip || isDragging) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip((prev) =>
        prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null
      )
    },
    [tooltip, isDragging]
  )

  const handleReset = useCallback(() => {
    if (isOrtho) { resetRotation(); setGlobeScale(1) }
    else resetZoom()
  }, [isOrtho, resetRotation, resetZoom])

  // Globe scroll-wheel zoom (orthographic only)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isOrtho) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setGlobeScale((s) => Math.max(0.5, Math.min(20, s * factor)))
    },
    [isOrtho]
  )

  // ── Sphere background path (for orthographic globe) ───────────────────────
  const spherePath = useMemo(() => {
    if (!isOrtho) return null
    return pathGenerator({ type: 'Sphere' } as any)
  }, [isOrtho, pathGenerator])

  const svgWidth = typeof widthProp === 'number' ? widthProp : containerSize.width
  const svgHeight = typeof heightProp === 'number' ? heightProp : containerSize.height

  const stateBorderScaled = stateBorderWidth / (isOrtho ? 1 : zoomScale)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: widthProp,
        height: heightProp,
        overflow: 'hidden',
        cursor: isOrtho ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
      onMouseMove={handleMouseMove}
    >
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block' }}
        onClick={handleMapClick}
        onWheel={isOrtho ? handleWheel : undefined}
      >
        {/* ── Ocean background ── */}
        {isOrtho && spherePath ? (
          // For globe: fill sphere shape (clips to circle)
          <path d={spherePath} fill={bgColor} />
        ) : (
          <rect width={svgWidth} height={svgHeight} fill={bgColor} />
        )}

        {/* ── Zoomable/pannable group (orthographic: no transform applied) ── */}
        <g ref={gRef}>

          {/* Graticule */}
          {showGraticule && (
            <MapGraticule
              pathGenerator={pathGenerator}
              color={graticuleColor}
              showSphereOutline={isOrtho}
              sphereOutlineColor="rgba(0,0,0,0.3)"
            />
          )}

          {/* Seas */}
          <g className="seas-layer">
            {seas.map(({ geoFeature, config }) => (
              <MapSea key={config.id} geoFeature={geoFeature} config={config} pathGenerator={pathGenerator} />
            ))}
          </g>

          {/* Countries */}
          <g className="countries-layer">
            {countries.map(({ geoFeature, config }) => (
              <MapCountry
                key={config.id}
                geoFeature={geoFeature}
                config={config}
                pathGenerator={pathGenerator}
                defaultColor={defaultCountryColor}
                defaultBorderColor={defaultBorderColor}
                defaultBorderWidth={defaultBorderWidth}
                isHovered={hoveredId === config.id}
                onMouseEnter={handleCountryMouseEnter}
                onMouseLeave={handleCountryMouseLeave}
                onClick={handleCountryClick}
              />
            ))}
          </g>

          {/* State/Province borders — chunked paths for progressive rendering */}
          {stateBorderChunks.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={stateBorderColor}
              strokeWidth={stateBorderScaled}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Country labels (with collision detection) */}
          {visibleLabels.map((lbl) => (
            <MapLabel
              key={lbl.id}
              name={lbl.name}
              lng={lbl.lng}
              lat={lbl.lat}
              projection={projection}
              fontSize={labelFontSize}
              color={labelColor}
              zoomScale={isOrtho ? 1 : zoomScale}
            />
          ))}

          {/* Capitals */}
          {showCapitals && capitals
            .filter((c) => !isOrtho || isOnFrontHemisphere(c.lng, c.lat, rotate))
            .map((capital) => (
              <MapCapital
                key={capital.id}
                capital={capital}
                projection={projection}
                size={capitalSize}
                color={capitalColor}
                showLabel={showCapitalLabels}
                zoomScale={isOrtho ? 1 : zoomScale}
              />
            ))}

          {/* Sub-country states from country config */}
          {countries.flatMap(({ states, config: cc }) =>
            states.map(({ geoFeature, config }) => (
              <MapState
                key={`${cc.id}-${config.id}`}
                geoFeature={geoFeature}
                config={config}
                countryId={cc.id}
                pathGenerator={pathGenerator}
                isHovered={hoveredId === config.id}
                onMouseEnter={handleCountryMouseEnter}
                onMouseLeave={handleCountryMouseLeave}
                onClick={handleStateClick}
              />
            ))
          )}

          {/* Markers */}
          {markers && markers
            .filter((m) => !isOrtho || isOnFrontHemisphere(m.lng, m.lat, rotate))
            .map((marker, i) => (
              <MapMarker
                key={marker.id ?? i}
                marker={marker}
                projection={projection}
                zoomScale={isOrtho ? 1 : zoomScale}
              />
            ))}

          {/* Globe sphere outline (always shown in orthographic) */}
          {isOrtho && spherePath && (
            <path
              d={spherePath}
              fill="none"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth={1}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      {/* Zoom / globe controls */}
      {showZoomControls && (
        <MapZoomControls
          onZoomIn={isOrtho ? () => setGlobeScale((s) => Math.min(20, s * 1.2)) : zoomIn}
          onZoomOut={isOrtho ? () => setGlobeScale((s) => Math.max(0.5, s / 1.2)) : zoomOut}
          onReset={handleReset}
        />
      )}

      {/* Tooltip */}
      {tooltip && showTooltip && !isDragging && (
        <MapTooltip
          feature={tooltip.feature}
          x={tooltip.x}
          y={tooltip.y}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          customContent={tooltipContent}
        />
      )}
    </div>
  )
}
