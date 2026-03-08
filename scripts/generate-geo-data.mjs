/**
 * Generates GeoJSON data files for the react-world-map library.
 * Run once: node scripts/generate-geo-data.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const DATA_DIR = new URL('../src/data/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

// ─── Downloader ───────────────────────────────────────────────────────────────

function downloadUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const client = url.protocol === 'https:' ? https : http
    const request = client.get(urlStr, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(downloadUrl(res.headers.location))
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`))
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    request.on('error', reject)
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')) })
  })
}

// ─── Pretty GeoJSON formatter ─────────────────────────────────────────────────
// Formats JSON with indentation but keeps coordinate pairs compact [x,y]

function prettyGeoJSON(data) {
  let str = JSON.stringify(data, null, 2)
  // Compact [number, number] pairs that span multiple lines
  str = str.replace(/\[\s*\n\s+(-?[\d.]+),\s*\n\s+(-?[\d.]+)\s*\n\s+\]/g, '[$1,$2]')
  return str
}

// ─── Capital Cities Lookup ────────────────────────────────────────────────────

const CAPITALS = {
  AFG: { name: 'Kabul',               lat: 34.5228, lng: 69.1761 },
  ALB: { name: 'Tirana',              lat: 41.3305, lng: 19.8318 },
  DZA: { name: 'Algiers',             lat: 36.7372, lng: 3.0865  },
  AGO: { name: 'Luanda',              lat: -8.8368, lng: 13.2344 },
  ARG: { name: 'Buenos Aires',        lat: -34.6131, lng: -58.3772 },
  AUS: { name: 'Canberra',            lat: -35.3075, lng: 149.1244 },
  AUT: { name: 'Vienna',              lat: 48.2092, lng: 16.3728 },
  AZE: { name: 'Baku',               lat: 40.3834, lng: 49.8932 },
  BHS: { name: 'Nassau',              lat: 25.0480, lng: -77.3554 },
  BGD: { name: 'Dhaka',              lat: 23.7230, lng: 90.4087 },
  BLR: { name: 'Minsk',              lat: 53.9022, lng: 27.5618 },
  BEL: { name: 'Brussels',            lat: 50.8503, lng: 4.3517  },
  BLZ: { name: 'Belmopan',           lat: 17.2514, lng: -88.7590 },
  BEN: { name: 'Porto-Novo',          lat: 6.3676,  lng: 2.4252  },
  BTN: { name: 'Thimphu',             lat: 27.4728, lng: 89.6390 },
  BOL: { name: 'Sucre',              lat: -19.0196, lng: -65.2619 },
  BIH: { name: 'Sarajevo',            lat: 43.8476, lng: 18.3564 },
  BWA: { name: 'Gaborone',            lat: -24.6545, lng: 25.9086 },
  BRA: { name: 'Brasília',            lat: -15.7801, lng: -47.9292 },
  BRN: { name: 'Bandar Seri Begawan', lat: 4.9431,  lng: 114.9425 },
  BGR: { name: 'Sofia',              lat: 42.6977, lng: 23.3219 },
  BFA: { name: 'Ouagadougou',         lat: 12.3714, lng: -1.5197 },
  BDI: { name: 'Gitega',             lat: -3.4271, lng: 29.9246 },
  CPV: { name: 'Praia',              lat: 14.9318, lng: -23.5087 },
  KHM: { name: 'Phnom Penh',          lat: 11.5625, lng: 104.9160 },
  CMR: { name: 'Yaoundé',             lat: 3.8667,  lng: 11.5167 },
  CAN: { name: 'Ottawa',             lat: 45.4215, lng: -75.6972 },
  CAF: { name: 'Bangui',             lat: 4.3612,  lng: 18.5550 },
  TCD: { name: "N'Djamena",           lat: 12.1048, lng: 15.0445 },
  CHL: { name: 'Santiago',            lat: -33.4569, lng: -70.6483 },
  CHN: { name: 'Beijing',             lat: 39.9042, lng: 116.4074 },
  COL: { name: 'Bogotá',             lat: 4.7110,  lng: -74.0721 },
  COM: { name: 'Moroni',             lat: -11.7022, lng: 43.2551 },
  COD: { name: 'Kinshasa',            lat: -4.3317, lng: 15.3240 },
  COG: { name: 'Brazzaville',         lat: -4.2661, lng: 15.2831 },
  CRI: { name: 'San José',            lat: 9.9281,  lng: -84.0907 },
  CIV: { name: 'Yamoussoukro',        lat: 6.8276,  lng: -5.2893 },
  HRV: { name: 'Zagreb',             lat: 45.8150, lng: 15.9819 },
  CUB: { name: 'Havana',             lat: 23.1136, lng: -82.3666 },
  CYP: { name: 'Nicosia',             lat: 35.1667, lng: 33.3667 },
  CZE: { name: 'Prague',             lat: 50.0755, lng: 14.4378 },
  DNK: { name: 'Copenhagen',          lat: 55.6761, lng: 12.5683 },
  DJI: { name: 'Djibouti',            lat: 11.5886, lng: 43.1451 },
  DOM: { name: 'Santo Domingo',       lat: 18.4861, lng: -69.9312 },
  ECU: { name: 'Quito',              lat: -0.2295, lng: -78.5243 },
  EGY: { name: 'Cairo',              lat: 30.0626, lng: 31.2497 },
  SLV: { name: 'San Salvador',        lat: 13.6929, lng: -89.2182 },
  GNQ: { name: 'Malabo',             lat: 3.7523,  lng: 8.7741  },
  ERI: { name: 'Asmara',             lat: 15.3381, lng: 38.9314 },
  EST: { name: 'Tallinn',             lat: 59.4369, lng: 24.7536 },
  ETH: { name: 'Addis Ababa',         lat: 9.0302,  lng: 38.7400 },
  FJI: { name: 'Suva',              lat: -18.1416, lng: 178.4419 },
  FIN: { name: 'Helsinki',            lat: 60.1699, lng: 24.9384 },
  FRA: { name: 'Paris',              lat: 48.8566, lng: 2.3522  },
  GAB: { name: 'Libreville',          lat: 0.3901,  lng: 9.4544  },
  GMB: { name: 'Banjul',             lat: 13.4531, lng: -16.5775 },
  GEO: { name: 'Tbilisi',             lat: 41.6941, lng: 44.8337 },
  DEU: { name: 'Berlin',             lat: 52.5244, lng: 13.4105 },
  GHA: { name: 'Accra',              lat: 5.5560,  lng: -0.1969 },
  GRC: { name: 'Athens',             lat: 37.9838, lng: 23.7275 },
  GTM: { name: 'Guatemala City',      lat: 14.6407, lng: -90.5133 },
  GIN: { name: 'Conakry',             lat: 9.5370,  lng: -13.6773 },
  GNB: { name: 'Bissau',             lat: 11.8636, lng: -15.5977 },
  GUY: { name: 'Georgetown',          lat: 6.8013,  lng: -58.1551 },
  HTI: { name: 'Port-au-Prince',      lat: 18.5392, lng: -72.3288 },
  HND: { name: 'Tegucigalpa',         lat: 14.0942, lng: -87.2068 },
  HUN: { name: 'Budapest',            lat: 47.4979, lng: 19.0402 },
  IND: { name: 'New Delhi',           lat: 28.6139, lng: 77.2090 },
  IDN: { name: 'Jakarta',             lat: -6.2146, lng: 106.8451 },
  IRN: { name: 'Tehran',             lat: 35.6892, lng: 51.3890 },
  IRQ: { name: 'Baghdad',             lat: 33.3406, lng: 44.4009 },
  IRL: { name: 'Dublin',             lat: 53.3331, lng: -6.2489 },
  ISR: { name: 'Jerusalem',           lat: 31.7683, lng: 35.2137 },
  ITA: { name: 'Rome',               lat: 41.8955, lng: 12.4823 },
  JAM: { name: 'Kingston',            lat: 17.9970, lng: -76.7936 },
  JPN: { name: 'Tokyo',              lat: 35.6894, lng: 139.6917 },
  JOR: { name: 'Amman',              lat: 31.9539, lng: 35.9106 },
  KAZ: { name: 'Astana',             lat: 51.1801, lng: 71.4460 },
  KEN: { name: 'Nairobi',             lat: -1.2921, lng: 36.8219 },
  PRK: { name: 'Pyongyang',           lat: 39.0194, lng: 125.7381 },
  KOR: { name: 'Seoul',              lat: 37.5665, lng: 126.9780 },
  KWT: { name: 'Kuwait City',         lat: 29.3797, lng: 47.9734 },
  KGZ: { name: 'Bishkek',             lat: 42.8746, lng: 74.5698 },
  LAO: { name: 'Vientiane',           lat: 17.9667, lng: 102.6000 },
  LVA: { name: 'Riga',               lat: 56.9496, lng: 24.1052 },
  LBN: { name: 'Beirut',             lat: 33.8888, lng: 35.4955 },
  LSO: { name: 'Maseru',             lat: -29.3151, lng: 27.4869 },
  LBR: { name: 'Monrovia',            lat: 6.2907,  lng: -10.7969 },
  LBY: { name: 'Tripoli',             lat: 32.8872, lng: 13.1913 },
  LIE: { name: 'Vaduz',              lat: 47.1410, lng: 9.5215  },
  LTU: { name: 'Vilnius',             lat: 54.6872, lng: 25.2797 },
  LUX: { name: 'Luxembourg',          lat: 49.6117, lng: 6.1319  },
  MKD: { name: 'Skopje',             lat: 41.9973, lng: 21.4280 },
  MDG: { name: 'Antananarivo',        lat: -18.9137, lng: 47.5361 },
  MWI: { name: 'Lilongwe',            lat: -13.9669, lng: 33.7873 },
  MYS: { name: 'Kuala Lumpur',        lat: 3.1478,  lng: 101.6953 },
  MDV: { name: 'Malé',               lat: 4.1755,  lng: 73.5093 },
  MLI: { name: 'Bamako',             lat: 12.6392, lng: -8.0029 },
  MLT: { name: 'Valletta',            lat: 35.8997, lng: 14.5147 },
  MRT: { name: 'Nouakchott',          lat: 18.0858, lng: -15.9785 },
  MUS: { name: 'Port Louis',          lat: -20.1654, lng: 57.4896 },
  MEX: { name: 'Mexico City',         lat: 19.4326, lng: -99.1332 },
  MDA: { name: 'Chișinău',            lat: 47.0105, lng: 28.8638 },
  MNG: { name: 'Ulaanbaatar',         lat: 47.9077, lng: 106.8832 },
  MNE: { name: 'Podgorica',           lat: 42.4304, lng: 19.2594 },
  MAR: { name: 'Rabat',              lat: 34.0209, lng: -6.8416 },
  MOZ: { name: 'Maputo',             lat: -25.9667, lng: 32.5833 },
  MMR: { name: 'Naypyidaw',           lat: 19.7633, lng: 96.0785 },
  NAM: { name: 'Windhoek',            lat: -22.5609, lng: 17.0658 },
  NPL: { name: 'Kathmandu',           lat: 27.7172, lng: 85.3240 },
  NLD: { name: 'Amsterdam',           lat: 52.3676, lng: 4.9041  },
  NZL: { name: 'Wellington',          lat: -41.2865, lng: 174.7762 },
  NIC: { name: 'Managua',             lat: 12.1364, lng: -86.2514 },
  NER: { name: 'Niamey',             lat: 13.5116, lng: 2.1254  },
  NGA: { name: 'Abuja',              lat: 9.0574,  lng: 7.4898  },
  NOR: { name: 'Oslo',               lat: 59.9139, lng: 10.7522 },
  OMN: { name: 'Muscat',             lat: 23.6139, lng: 58.5922 },
  PAK: { name: 'Islamabad',           lat: 33.7294, lng: 73.0931 },
  PAN: { name: 'Panama City',         lat: 8.9936,  lng: -79.5197 },
  PNG: { name: 'Port Moresby',        lat: -9.4647, lng: 147.1925 },
  PRY: { name: 'Asunción',            lat: -25.2867, lng: -57.6470 },
  PER: { name: 'Lima',               lat: -12.0464, lng: -77.0428 },
  PHL: { name: 'Manila',             lat: 14.5995, lng: 120.9842 },
  POL: { name: 'Warsaw',             lat: 52.2298, lng: 21.0122 },
  PRT: { name: 'Lisbon',             lat: 38.7169, lng: -9.1399 },
  QAT: { name: 'Doha',               lat: 25.2854, lng: 51.5310 },
  ROU: { name: 'Bucharest',           lat: 44.4268, lng: 26.1025 },
  RUS: { name: 'Moscow',             lat: 55.7558, lng: 37.6173 },
  RWA: { name: 'Kigali',             lat: -1.9441, lng: 30.0619 },
  SAU: { name: 'Riyadh',             lat: 24.6877, lng: 46.7219 },
  SEN: { name: 'Dakar',              lat: 14.7167, lng: -17.4677 },
  SRB: { name: 'Belgrade',            lat: 44.8048, lng: 20.4781 },
  SLE: { name: 'Freetown',            lat: 8.4897,  lng: -13.2344 },
  SVK: { name: 'Bratislava',          lat: 48.1486, lng: 17.1077 },
  SVN: { name: 'Ljubljana',           lat: 46.0569, lng: 14.5058 },
  SLB: { name: 'Honiara',             lat: -9.4333, lng: 160.0333 },
  SOM: { name: 'Mogadishu',           lat: 2.0469,  lng: 45.3182 },
  ZAF: { name: 'Pretoria',            lat: -25.7461, lng: 28.1881 },
  SSD: { name: 'Juba',               lat: 4.8594,  lng: 31.5713 },
  ESP: { name: 'Madrid',             lat: 40.4168, lng: -3.7038 },
  LKA: { name: 'Sri Jayawardenepura', lat: 6.9106,  lng: 79.8878 },
  SDN: { name: 'Khartoum',            lat: 15.5517, lng: 32.5324 },
  SUR: { name: 'Paramaribo',          lat: 5.8664,  lng: -55.1667 },
  SWE: { name: 'Stockholm',           lat: 59.3293, lng: 18.0686 },
  CHE: { name: 'Bern',               lat: 46.9480, lng: 7.4474  },
  SYR: { name: 'Damascus',            lat: 33.5102, lng: 36.2913 },
  TWN: { name: 'Taipei',             lat: 25.0478, lng: 121.5319 },
  TJK: { name: 'Dushanbe',            lat: 38.5598, lng: 68.7738 },
  TZA: { name: 'Dodoma',             lat: -6.1722, lng: 35.7395 },
  THA: { name: 'Bangkok',             lat: 13.7525, lng: 100.4942 },
  TLS: { name: 'Dili',               lat: -8.5586, lng: 125.5736 },
  TGO: { name: 'Lomé',               lat: 6.1375,  lng: 1.2123  },
  TON: { name: "Nuku'alofa",          lat: -21.1393, lng: -175.2018 },
  TTO: { name: 'Port of Spain',       lat: 10.6549, lng: -61.5019 },
  TUN: { name: 'Tunis',              lat: 36.8190, lng: 10.1658 },
  TUR: { name: 'Ankara',             lat: 39.9199, lng: 32.8543 },
  TKM: { name: 'Ashgabat',            lat: 37.9601, lng: 58.3261 },
  TUV: { name: 'Funafuti',            lat: -8.5211, lng: 179.1983 },
  UGA: { name: 'Kampala',             lat: 0.3163,  lng: 32.5822 },
  UKR: { name: 'Kyiv',               lat: 50.4501, lng: 30.5234 },
  ARE: { name: 'Abu Dhabi',           lat: 24.4539, lng: 54.3773 },
  GBR: { name: 'London',             lat: 51.5074, lng: -0.1278 },
  USA: { name: 'Washington, D.C.',    lat: 38.9072, lng: -77.0369 },
  URY: { name: 'Montevideo',          lat: -34.9011, lng: -56.1645 },
  UZB: { name: 'Tashkent',            lat: 41.2995, lng: 69.2401 },
  VUT: { name: 'Port Vila',           lat: -17.7333, lng: 168.3167 },
  VEN: { name: 'Caracas',             lat: 10.4806, lng: -66.9036 },
  VNM: { name: 'Hanoi',              lat: 21.0278, lng: 105.8342 },
  YEM: { name: "Sana'a",             lat: 15.3694, lng: 44.1910 },
  ZMB: { name: 'Lusaka',             lat: -15.4166, lng: 28.2833 },
  ZWE: { name: 'Harare',             lat: -17.8292, lng: 31.0522 },
  // Additional territories
  FLK: { name: 'Stanley',             lat: -51.6938, lng: -57.8592 },
  NCL: { name: 'Nouméa',             lat: -22.2558, lng: 166.4505 },
  PYF: { name: 'Papeete',             lat: -17.5334, lng: -149.5667 },
  GRL: { name: 'Nuuk',               lat: 64.1836, lng: -51.7216 },
  XKX: { name: 'Pristina',            lat: 42.6629, lng: 21.1655 },
  PSE: { name: 'Ramallah',            lat: 31.9038, lng: 35.2034 },
  SOM: { name: 'Mogadishu',           lat: 2.0469,  lng: 45.3182 },
}

// ─── Continent Color Palettes ─────────────────────────────────────────────────

const CONTINENT_PALETTES = {
  'Africa': [
    '#F4A261', '#E76F51', '#FFBA08', '#FAA307', '#E9C46A',
    '#F4D06F', '#FCA311', '#FFB703', '#FB8500', '#F3722C',
  ],
  'Europe': [
    '#4895EF', '#4361EE', '#3F37C9', '#7209B7', '#B5179E',
    '#9D4EDD', '#560BAD', '#5C6BC0', '#6979C4', '#8590E4',
  ],
  'Asia': [
    '#2A9D8F', '#38A3A5', '#22577A', '#57CC99', '#80ED99',
    '#118AB2', '#06D6A0', '#40916C', '#52B788', '#74C69D',
  ],
  'North America': [
    '#EF476F', '#06D6A0', '#118AB2', '#FFD166', '#E07A5F',
    '#073B4C', '#3D405B', '#81B29A', '#F2CC8F', '#C77DFF',
  ],
  'South America': [
    '#E63946', '#F4A261', '#A8DADC', '#457B9D', '#1D3557',
    '#FF6B6B', '#E07A5F', '#3D405B', '#81B29A', '#F2CC8F',
  ],
  'Oceania': [
    '#48CAE4', '#00B4D8', '#0096C7', '#0077B6', '#023E8A',
    '#ADE8F4', '#90E0EF', '#CAF0F8',
  ],
  'Antarctica': ['#B0BEC5', '#90A4AE', '#78909C'],
  'Seven seas (open ocean)': ['#4a90d9'],
}

// Assign continent color by cycling through palette based on sorted index
const continentCounters = {}
function getCountryColor(continent) {
  if (!CONTINENT_PALETTES[continent]) return '#d4d4d4'
  if (!continentCounters[continent]) continentCounters[continent] = 0
  const palette = CONTINENT_PALETTES[continent]
  const color = palette[continentCounters[continent] % palette.length]
  continentCounters[continent]++
  return color
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  console.log(`Output directory: ${DATA_DIR}\n`)

  // ── 1. Countries ──────────────────────────────────────────────────────────

  console.log('[1/3] Downloading Natural Earth 110m countries GeoJSON...')
  const COUNTRY_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

  let countriesRaw
  try {
    countriesRaw = await downloadUrl(COUNTRY_URL)
    console.log(`  Downloaded ${(countriesRaw.length / 1024).toFixed(1)} KB`)
  } catch (err) {
    console.error(`  FAILED: ${err.message}`)
    process.exit(1)
  }

  const neData = JSON.parse(countriesRaw)

  // Reset continent counters (sorted by continent + name for consistency)
  const sortedFeatures = [...neData.features].sort((a, b) => {
    const ca = a.properties.CONTINENT || ''
    const cb = b.properties.CONTINENT || ''
    if (ca !== cb) return ca.localeCompare(cb)
    return (a.properties.NAME || '').localeCompare(b.properties.NAME || '')
  })

  const countries = {
    type: 'FeatureCollection',
    features: sortedFeatures
      .filter((f) => f.properties && f.properties.ADM0_A3)
      .map((f) => {
        const alpha3 = f.properties.ADM0_A3
        const continent = f.properties.CONTINENT || 'Unknown'
        const capital = CAPITALS[alpha3]
        return {
          type: 'Feature',
          id: alpha3,
          geometry: f.geometry,
          properties: {
            name: f.properties.NAME || f.properties.ADMIN || '',
            alpha3,
            alpha2: f.properties.ISO_A2 || '',
            numeric: String(f.properties.ISO_N3 || ''),
            continent,
            subregion: f.properties.SUBREGION || '',
            // Label priority: 1=always visible, higher=only at high zoom
            labelrank: f.properties.LABELRANK || f.properties.labelrank || 5,
            // Label placement centroid (from Natural Earth)
            labelLng: f.properties.LABEL_X || null,
            labelLat: f.properties.LABEL_Y || null,
            // Capital city
            capitalName: capital?.name || f.properties.NAME_CIAWF || '',
            capitalLat: capital?.lat || null,
            capitalLng: capital?.lng || null,
            // Default color based on continent
            defaultColor: getCountryColor(continent),
          },
        }
      }),
  }

  const countriesPath = `${DATA_DIR}world-default.geo.json`
  writeFileSync(countriesPath, prettyGeoJSON(countries))
  console.log(`  Wrote ${countries.features.length} countries (${(Buffer.byteLength(prettyGeoJSON(countries)) / 1024).toFixed(1)} KB)`)

  // ── 2. States/Provinces ───────────────────────────────────────────────────

  console.log('\n[2/3] Downloading Natural Earth admin-1 states/provinces (all countries)...')
  // Use 10m for comprehensive coverage (~4600 features).
  // Note: 29 MB file — not bundled in library; users import it explicitly via statesData prop.
  const STATES_URLS = [
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson',
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson',
  ]

  let statesRaw = null
  for (const url of STATES_URLS) {
    const res = url.includes('10m') ? '10m' : '50m'
    try {
      console.log(`  Trying ${res}...`)
      statesRaw = await downloadUrl(url)
      console.log(`  Downloaded ${(statesRaw.length / 1024).toFixed(1)} KB (${res})`)
      break
    } catch (err) {
      console.warn(`  ${res} FAILED: ${err.message}`)
    }
  }

  if (!statesRaw) {
    console.warn('  All sources failed — creating empty states file')
    writeFileSync(`${DATA_DIR}states-default.geo.json`, JSON.stringify({ type: 'FeatureCollection', features: [] }, null, 2))
  }

  if (statesRaw) {
    const neStates = JSON.parse(statesRaw)
    const states = {
      type: 'FeatureCollection',
      features: neStates.features
        .filter((f) => f.properties && (f.properties.adm0_a3 || f.properties.ADM0_A3))
        .map((f, i) => {
          const adm0_a3 = f.properties.adm0_a3 || f.properties.ADM0_A3 || ''
          return {
            type: 'Feature',
            id: f.properties.iso_3166_2 || f.properties.adm1_code || `ST-${i}`,
            geometry: f.geometry,
            properties: {
              name: f.properties.name || '',
              adm0_a3,
              iso_3166_2: f.properties.iso_3166_2 || '',
              type: f.properties.type_en || f.properties.type || '',
            },
          }
        }),
    }

    // States file is large so save compact (no pretty formatting)
    writeFileSync(`${DATA_DIR}states-default.geo.json`, JSON.stringify(states))
    const sizeKB = (Buffer.byteLength(JSON.stringify(states)) / 1024).toFixed(1)
    console.log(`  Wrote ${states.features.length} states/provinces (${sizeKB} KB compact)`)
  }

  // ── 3. Seas ───────────────────────────────────────────────────────────────

  console.log('\n[3/3] Creating seas GeoJSON with major world seas...')
  const seas = {
    type: 'FeatureCollection',
    features: [
      makeSea('mediterranean',   'Mediterranean Sea',   [[-6,30],[36,30],[36,47],[-6,47],[-6,30]]),
      makeSea('black-sea',       'Black Sea',           [[27.5,40.8],[41.5,40.8],[41.5,46.5],[27.5,46.5],[27.5,40.8]]),
      makeSea('red-sea',         'Red Sea',             [[31.5,12],[43.5,12],[43.5,30],[31.5,30],[31.5,12]]),
      makeSea('persian-gulf',    'Persian Gulf',        [[47.5,22.5],[57,22.5],[57,30.5],[47.5,30.5],[47.5,22.5]]),
      makeSea('arabian-sea',     'Arabian Sea',         [[55,7],[78,7],[78,25],[55,25],[55,7]]),
      makeSea('bay-of-bengal',   'Bay of Bengal',       [[80,4],[100,4],[100,23],[80,23],[80,4]]),
      makeSea('south-china-sea', 'South China Sea',     [[99,-3],[122,-3],[122,24],[99,24],[99,-3]]),
      makeSea('caribbean-sea',   'Caribbean Sea',       [[-90,9],[-59,9],[-59,25],[-90,25],[-90,9]]),
      makeSea('gulf-of-mexico',  'Gulf of Mexico',      [[-98,17.5],[-79.5,17.5],[-79.5,31],[-98,31],[-98,17.5]]),
      makeSea('north-sea',       'North Sea',           [[-4,51],[10,51],[10,61.5],[-4,61.5],[-4,51]]),
      makeSea('baltic-sea',      'Baltic Sea',          [[9.5,53.5],[30,53.5],[30,65.5],[9.5,65.5],[9.5,53.5]]),
      makeSea('caspian-sea',     'Caspian Sea',         [[49,36.5],[54.5,36.5],[54.5,47],[49,47],[49,36.5]]),
    ],
  }

  writeFileSync(`${DATA_DIR}seas-default.geo.json`, prettyGeoJSON(seas))
  console.log(`  Wrote ${seas.features.length} seas`)

  console.log('\nDone! GeoJSON files created in src/data/')
}

function makeSea(id, name, ring) {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: { id, name },
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
