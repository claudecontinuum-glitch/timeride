"use client"

import L from "leaflet"
import type { DriverLocation } from "@/lib/types"
import SmoothMarker from "./SmoothMarker"

const TAXI_ICON_HTML = `
  <div style="
    position: relative;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      position: absolute;
      inset: 0;
      background: #facc15;
      border: 2px solid #1a1a1a;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    "></div>
    <span style="
      position: relative;
      font-size: 22px;
      line-height: 1;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
    ">🚕</span>
  </div>
`

const TAXI_ASSIGNED_ICON_HTML = `
  <div style="
    position: relative;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      position: absolute;
      inset: 0;
      background: #4ade80;
      border: 3px solid #166534;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(74,222,128,0.25), 0 4px 14px rgba(22,101,52,0.4);
      animation: timeride-pulse 1.6s ease-out infinite;
    "></div>
    <span style="
      position: relative;
      font-size: 26px;
      line-height: 1;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
    ">🚕</span>
  </div>
`

let pulseInjected = false
function ensurePulseStyle() {
  if (pulseInjected || typeof document === "undefined") return
  pulseInjected = true
  const style = document.createElement("style")
  style.textContent = `
    @keyframes timeride-pulse {
      0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.55), 0 4px 14px rgba(22,101,52,0.4); }
      70% { box-shadow: 0 0 0 14px rgba(74,222,128,0), 0 4px 14px rgba(22,101,52,0.4); }
      100% { box-shadow: 0 0 0 0 rgba(74,222,128,0), 0 4px 14px rgba(22,101,52,0.4); }
    }
  `
  document.head.appendChild(style)
}

function createTaxiIcon(highlighted: boolean) {
  ensurePulseStyle()
  return L.divIcon({
    html: highlighted ? TAXI_ASSIGNED_ICON_HTML : TAXI_ICON_HTML,
    className: "timeride-taxi-marker",
    iconSize: highlighted ? [52, 52] : [44, 44],
    iconAnchor: highlighted ? [26, 26] : [22, 22],
    popupAnchor: [0, -22],
  })
}

interface DriverMarkerProps {
  driver: DriverLocation
  onClick?: (driver: DriverLocation) => void
  highlighted?: boolean
}

export default function DriverMarker({
  driver,
  onClick,
  highlighted = false,
}: DriverMarkerProps) {
  const icon = createTaxiIcon(highlighted)

  return (
    <SmoothMarker
      lat={driver.lat}
      lng={driver.lng}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(driver),
      }}
    />
  )
}
