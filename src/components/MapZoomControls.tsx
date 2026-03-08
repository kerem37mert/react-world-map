import React from 'react'

interface MapZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  border: '1px solid rgba(0,0,0,0.15)',
  background: 'rgba(255,255,255,0.95)',
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 700,
  color: '#333',
  lineHeight: 1,
  userSelect: 'none',
  transition: 'background 0.1s',
  boxSizing: 'border-box',
}

function MapZoomControls({ onZoomIn, onZoomOut, onReset }: MapZoomControlsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        zIndex: 10,
      }}
    >
      <button
        style={{ ...btnBase, borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
        onClick={onZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        style={{ ...btnBase, borderBottom: 'none', borderRadius: 0, fontSize: 11 }}
        onClick={onReset}
        title="Reset zoom"
        aria-label="Reset zoom"
      >
        ⌂
      </button>
      <button
        style={{ ...btnBase, borderRadius: '0 0 6px 6px' }}
        onClick={onZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  )
}

export default MapZoomControls
