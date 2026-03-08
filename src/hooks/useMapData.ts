import { useMemo } from 'react'
import type {
  CountryConfig,
  SeaConfig,
  StateConfig,
  WorldConfig,
  ProcessedCountry,
  ProcessedSea,
  CapitalCity,
  ColorScheme,
} from '../types'
import { buildMergedConfig } from '../utils/mergeMapData'

import defaultCountriesGeo from '../data/world-default.geo.json'
import defaultSeasGeo from '../data/seas-default.geo.json'

// ── Color scheme helpers ──────────────────────────────────────────────────────

const MONOCHROME_PALETTE = [
  '#c8c8c8', '#b8b8b8', '#d0d0d0', '#c0c0c0', '#d8d8d8',
  '#c4c4c4', '#bcbcbc', '#cccccc', '#bababa', '#d4d4d4',
]

const DARK_PALETTE = [
  '#2d3436', '#2c3e50', '#1a252f', '#273746', '#212f3d',
  '#1f2b36', '#263238', '#1e272e', '#2c3a47', '#25303b',
]

function getColorSchemeColor(
  scheme: ColorScheme,
  geoProps: Record<string, unknown>,
  index: number
): string {
  switch (scheme) {
    case 'continent':
      return (geoProps.defaultColor as string) ?? '#d4d4d4'
    case 'monochrome':
      return MONOCHROME_PALETTE[index % MONOCHROME_PALETTE.length]
    case 'dark':
      return DARK_PALETTE[index % DARK_PALETTE.length]
    default:
      return '#d4d4d4'
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export interface UseMapDataResult {
  countries: ProcessedCountry[]
  seas: ProcessedSea[]
  capitals: CapitalCity[]
}

export function useMapData(
  world?: WorldConfig,
  countriesProp?: CountryConfig[],
  statesProp?: StateConfig[],
  defaultCountryColor?: string,
  defaultBorderColor?: string,
  defaultBorderWidth?: number,
  colorScheme?: ColorScheme
): UseMapDataResult {
  return useMemo(() => {
    const geoFC = defaultCountriesGeo as GeoJSON.FeatureCollection
    const seasFC = defaultSeasGeo as GeoJSON.FeatureCollection

    // ── Build base country configs ───────────────────────────────────────────
    const baseCountryConfigs: CountryConfig[] = geoFC.features.map((f, i) => {
      const props = f.properties ?? {}
      let color = defaultCountryColor ?? '#d4d4d4'
      if (colorScheme && colorScheme !== 'default' && colorScheme !== 'custom') {
        color = getColorSchemeColor(colorScheme, props as Record<string, unknown>, i)
      }
      return {
        id: (f.id as string) || (props.alpha3 as string) || '',
        name: (props.name as string) || '',
        color,
        borderColor: defaultBorderColor ?? '#ffffff',
        borderWidth: defaultBorderWidth ?? 0.5,
        visible: true,
        clickable: true,
        states: [],
      }
    })

    // ── Build base sea configs ───────────────────────────────────────────────
    const baseSeaConfigs: SeaConfig[] = seasFC.features.map((f) => ({
      id: (f.id as string) || (f.properties?.id as string) || '',
      name: (f.properties?.name as string) || '',
      color: '#4a90d9',
      labelColor: '#1a4a8a',
      labelVisible: true,
      visible: true,
    }))

    // ── Merge user overrides ────────────────────────────────────────────────
    const { countries: mergedCountries } = buildMergedConfig(
      baseCountryConfigs,
      countriesProp,
      world,
      statesProp
    )

    // Merge sea configs
    const seaMap = new Map<string, SeaConfig>()
    for (const s of baseSeaConfigs) seaMap.set(s.id, s)
    if (world?.seas) {
      for (const s of world.seas) seaMap.set(s.id, { ...seaMap.get(s.id), ...s })
    }

    // ── Build ProcessedCountry array ────────────────────────────────────────
    const countryConfigMap = new Map<string, CountryConfig>()
    for (const c of mergedCountries) countryConfigMap.set(c.id, c)

    const processedCountries: ProcessedCountry[] = []

    for (const geoFeature of geoFC.features) {
      const id = (geoFeature.id as string) || (geoFeature.properties?.alpha3 as string) || ''
      const config = countryConfigMap.get(id)
      if (!config || config.visible === false) continue

      processedCountries.push({
        geoFeature: config.customGeometry ?? geoFeature,
        config,
        states: [],
      })
    }

    // Add user-defined countries with customGeometry not in defaults
    for (const config of mergedCountries) {
      if (config.customGeometry && !processedCountries.find((pc) => pc.config.id === config.id)) {
        processedCountries.push({ geoFeature: config.customGeometry, config, states: [] })
      }
    }

    // ── Build ProcessedSea array ────────────────────────────────────────────
    const processedSeas: ProcessedSea[] = []
    for (const seaConfig of seaMap.values()) {
      if (seaConfig.visible === false) continue
      const geoFeature =
        seaConfig.customGeometry ??
        seasFC.features.find(
          (f) => f.id === seaConfig.id || (f.properties?.id as string) === seaConfig.id
        )
      if (!geoFeature) continue
      processedSeas.push({ geoFeature, config: seaConfig })
    }

    // ── Capital cities ───────────────────────────────────────────────────────
    const capitals: CapitalCity[] = geoFC.features
      .filter(
        (f) =>
          f.properties?.capitalLat != null &&
          f.properties?.capitalLng != null
      )
      .map((f) => ({
        id: (f.id as string) || (f.properties?.alpha3 as string) || '',
        name: (f.properties?.capitalName as string) || '',
        lat: f.properties?.capitalLat as number,
        lng: f.properties?.capitalLng as number,
        countryName: (f.properties?.name as string) || '',
      }))
      .filter((c) => c.name && c.id)

    return { countries: processedCountries, seas: processedSeas, capitals }
  }, [
    world,
    countriesProp,
    statesProp,
    defaultCountryColor,
    defaultBorderColor,
    defaultBorderWidth,
    colorScheme,
  ])
}
