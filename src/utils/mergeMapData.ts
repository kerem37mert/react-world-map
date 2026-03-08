import type {
  CountryConfig,
  SeaConfig,
  StateConfig,
  WorldConfig,
} from '../types'

/**
 * Merges user-provided country configs over defaults.
 * Matching is done by `id` field (ISO 3166-1 alpha-3).
 */
export function mergeCountries(
  defaults: CountryConfig[],
  overrides?: CountryConfig[]
): CountryConfig[] {
  if (!overrides || overrides.length === 0) return defaults

  const overrideMap = new Map<string, CountryConfig>()
  for (const c of overrides) {
    overrideMap.set(c.id, c)
  }

  const merged = defaults.map((def) => {
    const override = overrideMap.get(def.id)
    if (!override) return def
    return mergeCountry(def, override)
  })

  // Add any overrides that don't exist in defaults (custom countries)
  for (const override of overrides) {
    if (!defaults.find((d) => d.id === override.id)) {
      merged.push(override)
    }
  }

  return merged
}

function mergeCountry(base: CountryConfig, override: CountryConfig): CountryConfig {
  const merged: CountryConfig = { ...base, ...override }

  // Deep merge states array
  if (base.states || override.states) {
    merged.states = mergeStates(base.states ?? [], override.states ?? [])
  }

  return merged
}

/**
 * Merges user-provided state configs over defaults.
 */
export function mergeStates(
  defaults: StateConfig[],
  overrides: StateConfig[]
): StateConfig[] {
  if (overrides.length === 0) return defaults

  const overrideMap = new Map<string, StateConfig>()
  for (const s of overrides) {
    overrideMap.set(s.id, s)
  }

  const merged = defaults.map((def) => {
    const override = overrideMap.get(def.id)
    if (!override) return def
    return { ...def, ...override }
  })

  for (const override of overrides) {
    if (!defaults.find((d) => d.id === override.id)) {
      merged.push(override)
    }
  }

  return merged
}

/**
 * Merges user-provided sea configs over defaults.
 */
export function mergeSeas(
  defaults: SeaConfig[],
  overrides?: SeaConfig[]
): SeaConfig[] {
  if (!overrides || overrides.length === 0) return defaults

  const overrideMap = new Map<string, SeaConfig>()
  for (const s of overrides) {
    overrideMap.set(s.id, s)
  }

  const merged = defaults.map((def) => {
    const override = overrideMap.get(def.id)
    if (!override) return def
    return { ...def, ...override }
  })

  for (const override of overrides) {
    if (!defaults.find((d) => d.id === override.id)) {
      merged.push(override)
    }
  }

  return merged
}

/**
 * Builds final CountryConfig array by merging:
 * 1. world.countries (highest priority)
 * 2. countries prop
 * 3. Default GeoJSON-derived configs
 */
export function buildMergedConfig(
  defaults: CountryConfig[],
  countriesProp?: CountryConfig[],
  worldConfig?: WorldConfig,
  statesProp?: StateConfig[]
): { countries: CountryConfig[]; seas: SeaConfig[] } {
  // Start with defaults
  let countries = [...defaults]

  // Apply countries prop
  if (countriesProp && countriesProp.length > 0) {
    countries = mergeCountries(countries, countriesProp)
  }

  // Apply world.countries (highest priority)
  if (worldConfig?.countries && worldConfig.countries.length > 0) {
    countries = mergeCountries(countries, worldConfig.countries)
  }

  // Apply top-level states prop to matching countries
  if (statesProp && statesProp.length > 0) {
    countries = countries.map((country) => {
      const matchingStates = statesProp.filter(
        (s) => s.id.startsWith(country.id) || country.states?.find((cs) => cs.id === s.id)
      )
      if (matchingStates.length === 0) return country
      return {
        ...country,
        states: mergeStates(country.states ?? [], matchingStates),
      }
    })
  }

  const seas = worldConfig?.seas ?? []

  return { countries, seas }
}
