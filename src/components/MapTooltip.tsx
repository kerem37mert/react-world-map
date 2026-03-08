import React from 'react'
import type { ReactNode } from 'react'
import type { MapFeature } from '../types'

interface MapTooltipProps {
  feature: MapFeature
  x: number
  y: number
  containerWidth: number
  containerHeight: number
  customContent?: (feature: MapFeature) => ReactNode
}

const TOOLTIP_WIDTH = 160
const TOOLTIP_HEIGHT = 50
const OFFSET = 12

function MapTooltip({
  feature,
  x,
  y,
  containerWidth,
  containerHeight,
  customContent,
}: MapTooltipProps) {
  // Adjust position to keep tooltip within container bounds
  let left = x + OFFSET
  let top = y + OFFSET

  if (left + TOOLTIP_WIDTH > containerWidth) {
    left = x - TOOLTIP_WIDTH - OFFSET
  }
  if (top + TOOLTIP_HEIGHT > containerHeight) {
    top = y - TOOLTIP_HEIGHT - OFFSET
  }
  if (left < 0) left = OFFSET
  if (top < 0) top = OFFSET

  const content = customContent ? (
    customContent(feature)
  ) : (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{feature.name}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
        {feature.type === 'country' ? feature.id : feature.type}
      </div>
    </div>
  )

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        padding: '6px 10px',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        zIndex: 1000,
        minWidth: 80,
        maxWidth: TOOLTIP_WIDTH,
        fontSize: 13,
        lineHeight: 1.4,
        color: '#333',
      }}
    >
      {content}
    </div>
  )
}

export default MapTooltip
