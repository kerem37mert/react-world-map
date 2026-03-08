import React, { useState } from 'react'
import { WorldMap } from 'react-world-map'
import type { MapFeature, CountryConfig, ProjectionType, ColorScheme } from 'react-world-map'
// Import states data only when needed (large file — lazy import in production)
import statesData from '../src/data/states-default.geo.json'

const PROJECTIONS: { value: ProjectionType; label: string }[] = [
  { value: 'naturalEarth', label: 'Natural Earth' },
  { value: 'mercator', label: 'Mercator' },
  { value: 'equirectangular', label: 'Equirectangular' },
  { value: 'orthographic', label: '🌍 Küre (Globe)' },
]

const COLOR_SCHEMES: { value: ColorScheme | undefined; label: string }[] = [
  { value: undefined, label: 'Varsayılan' },
  { value: 'continent', label: 'Kıtalar' },
  { value: 'monochrome', label: 'Gri' },
  { value: 'dark', label: 'Koyu' },
]

type Tab = 'genel' | 'katmanlar' | 'tiklama'

function Btn({ active, onClick, children, accent = '#1a1a2e' }: {
  active: boolean; onClick: () => void; children: React.ReactNode; accent?: string
}) {
  return (
    <button onClick={onClick} style={{
      marginRight: 6, marginBottom: 4, padding: '5px 13px',
      fontSize: 12, cursor: 'pointer', borderRadius: 5,
      border: `1px solid ${active ? accent : '#ddd'}`,
      background: active ? accent : '#fff',
      color: active ? '#fff' : '#444',
      fontWeight: active ? 700 : 400,
      transition: 'all 0.12s',
    }}>{children}</button>
  )
}

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label onClick={() => onChange(!value)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      marginRight: 20, marginBottom: 8, cursor: 'pointer', fontSize: 13, userSelect: 'none',
    }}>
      <div style={{
        width: 38, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative',
        background: value ? '#4361ee' : '#ccc', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 20 : 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left 0.18s',
        }} />
      </div>
      {label}
    </label>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('genel')
  const [lastClicked, setLastClicked] = useState<MapFeature | null>(null)
  const [projection, setProjection] = useState<ProjectionType>('continent' as any || 'naturalEarth')
  const [proj, setProj] = useState<ProjectionType>('naturalEarth')
  const [colorScheme, setColorScheme] = useState<ColorScheme | undefined>('continent')
  const [highlighted, setHighlighted] = useState<string | null>(null)

  // Layer toggles
  const [showGraticule, setShowGraticule] = useState(false)
  const [showStateBorders, setShowStateBorders] = useState(false)
  const [showCapitals, setShowCapitals] = useState(false)
  const [showCapitalLabels, setShowCapitalLabels] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [showZoomControls, setShowZoomControls] = useState(true)
  const [showTooltip, setShowTooltip] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)

  const isGlobe = proj === 'orthographic'

  const bgColor = colorScheme === 'dark' ? '#0d1117' : '#ffffff'
  const borderColor = colorScheme === 'dark' ? '#2a3a4a' : '#ffffff'

  const customCountries: CountryConfig[] = highlighted
    ? [{ id: highlighted, color: '#e63946', borderColor: '#fff', borderWidth: 2 }]
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>🗺 react-world-map</div>
        <div style={{ fontSize: 12, color: '#aaa', marginLeft: 4 }}>
          SVG · D3-geo · No Google Maps
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Controls panel */}
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 16, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
            {([['genel', 'Genel'], ['katmanlar', 'Katmanlar'], ['tiklama', 'Tıklama Bilgisi']] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 20px', fontSize: 13, cursor: 'pointer', border: 'none',
                borderBottom: tab === t ? '2px solid #4361ee' : '2px solid transparent',
                background: 'transparent', color: tab === t ? '#4361ee' : '#888',
                fontWeight: tab === t ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: 16 }}>
            {/* ── Genel ── */}
            {tab === 'genel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={sectionLabel}>Projeksiyon</div>
                  {PROJECTIONS.map(({ value, label }) => (
                    <Btn key={value} active={proj === value} onClick={() => setProj(value)}>{label}</Btn>
                  ))}
                </div>
                <div>
                  <div style={sectionLabel}>Renk Şeması</div>
                  {COLOR_SCHEMES.map(({ value, label }) => (
                    <Btn key={label} active={colorScheme === value} onClick={() => setColorScheme(value)}>{label}</Btn>
                  ))}
                </div>
                <div>
                  <div style={sectionLabel}>Ülke Vurgula</div>
                  {['TUR', 'DEU', 'JPN', 'IND', 'NGA', 'BRA', 'USA', 'CHN', 'RUS'].map((id) => (
                    <Btn key={id} accent="#e63946"
                      active={highlighted === id}
                      onClick={() => setHighlighted(highlighted === id ? null : id)}
                    >{id}</Btn>
                  ))}
                </div>
                {isGlobe && (
                  <div>
                    <div style={sectionLabel}>Küre Seçenekleri</div>
                    <Toggle label="Otomatik döndür" value={autoRotate} onChange={setAutoRotate} />
                  </div>
                )}
              </div>
            )}

            {/* ── Katmanlar ── */}
            {tab === 'katmanlar' && (
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <Toggle label="Enlem/Boylam Izgara" value={showGraticule} onChange={setShowGraticule} />
                <Toggle label="İl/Eyalet Sınırları" value={showStateBorders} onChange={setShowStateBorders} />
                <Toggle label="Başkentler" value={showCapitals} onChange={setShowCapitals} />
                <Toggle label="Başkent İsimleri" value={showCapitalLabels} onChange={(v) => { setShowCapitalLabels(v); if (v) setShowCapitals(true) }} />
                <Toggle label="Ülke Adları" value={showLabels} onChange={setShowLabels} />
                <Toggle label="Zoom Butonları" value={showZoomControls} onChange={setShowZoomControls} />
                <Toggle label="Tooltip" value={showTooltip} onChange={setShowTooltip} />
                {!isGlobe && (
                  <div style={{ width: '100%', marginTop: 6, fontSize: 12, color: '#aaa' }}>
                    💡 Ülke adları için zoom yapın — yaklaştıkça daha fazla etiket görünür (çakışma önleme aktif)
                  </div>
                )}
                {isGlobe && (
                  <div style={{ width: '100%', marginTop: 6, fontSize: 12, color: '#888' }}>
                    🌍 Küreyi sürükleyerek döndürebilirsiniz
                  </div>
                )}
              </div>
            )}

            {/* ── Tıklama ── */}
            {tab === 'tiklama' && (
              <div style={{ fontSize: 13 }}>
                {lastClicked ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <Info label="Ülke" value={lastClicked.name} />
                    <Info label="Kode" value={lastClicked.id} />
                    <Info label="Tür" value={lastClicked.type} />
                    {lastClicked.properties.continent && (
                      <Info label="Kıta" value={lastClicked.properties.continent as string} accent="#4361ee" />
                    )}
                    {lastClicked.properties.subregion && (
                      <Info label="Alt Bölge" value={lastClicked.properties.subregion as string} />
                    )}
                    {lastClicked.properties.capitalName && (
                      <Info label="Başkent" value={lastClicked.properties.capitalName as string} accent="#e63946" />
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#bbb' }}>Haritada bir ülkeye tıklayın…</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 4px 28px rgba(0,0,0,0.13)',
          background: bgColor,
        }}>
          <WorldMap
            width="100%"
            height={540}
            projection={proj}
            backgroundColor={bgColor}
            defaultBorderColor={borderColor}
            defaultBorderWidth={0.5}
            colorScheme={colorScheme}
            countries={customCountries}
            zoomable={!isGlobe}
            minZoom={0.5}
            maxZoom={14}
            initialZoom={1}

            showTooltip={showTooltip}
            onCountryClick={(f) => { setLastClicked(f); setTab('tiklama') }}

            showGraticule={showGraticule || isGlobe}
            graticuleColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}

            showStateBorders={showStateBorders}
            statesData={showStateBorders ? (statesData as GeoJSON.FeatureCollection) : undefined}
            stateBorderColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'}
            stateBorderWidth={0.5}

            showCapitals={showCapitals || showCapitalLabels}
            showCapitalLabels={showCapitalLabels}
            capitalColor={colorScheme === 'dark' ? '#ccc' : '#222'}
            capitalSize={3}

            showLabels={showLabels}
            labelFontSize={11}
            labelColor={colorScheme === 'dark' ? '#ddd' : '#333'}

            showZoomControls={showZoomControls && !isGlobe}

            // Globe options
            initialRotate={[15, -25, 0]}
            autoRotate={isGlobe && autoRotate}
            rotateSpeed={8}
            rotateSensitivity={0.35}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: '#bbb', textAlign: 'center' }}>
          Natural Earth 110m (ülkeler) · 50m admin-1 (il/eyalet sınırları) · D3-geo SVG
        </div>
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#999',
  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
}

function Info({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: accent ?? '#1a1a2e' }}>{value}</div>
    </div>
  )
}
