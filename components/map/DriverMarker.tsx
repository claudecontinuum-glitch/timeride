"use client"

import L from "leaflet"
import type { DriverLocation } from "@/lib/types"
import SmoothMarker from "./SmoothMarker"

// SVG de auto top-down (vista cenital) — profesional, no emoji
const TAXI_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <rect x="6" y="3" width="12" height="18" rx="3" fill="#facc15" stroke="#1c1917" stroke-width="1.5"/>
  <rect x="8" y="5" width="8" height="5" rx="1" fill="#1c1917"/>
  <rect x="8" y="14" width="8" height="5" rx="1" fill="#1c1917" opacity="0.5"/>
  <circle cx="12" cy="12" r="0.8" fill="#1c1917"/>
</svg>`

const TAXI_ICON_HTML = `
  <div style="
    position: relative;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #25252f;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 50%;
    box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.4);
  ">
    ${TAXI_SVG}
  </div>
`

const TAXI_ASSIGNED_ICON_HTML = `
  <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
    <div style="
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      animation: timeride-taxi-ring 2s ease-out 3;
    "></div>
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #25252f;
      border: 1.5px solid #6366f1;
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(0,0,0,0.4);
    ">
      ${TAXI_SVG}
    </div>
  </div>
`

let pulseInjected = false
function ensurePulseStyle() {
  if (pulseInjected || typeof document === "undefined") return
  pulseInjected = true
  const style = document.createElement("style")
  style.textContent = `
    @keyframes timeride-taxi-ring {
      0% {
        opacity: 0.6;
        transform: scale(0.85);
      }
      80% {
        opacity: 0;
        transform: scale(1.4);
      }
      100% {
        opacity: 0;
        transform: scale(1.4);
      }
    }
  `
  document.head.appendChild(style)
}

function createTaxiIcon(highlighted: boolean) {
  ensurePulseStyle()
  return L.divIcon({
    html: highlighted ? TAXI_ASSIGNED_ICON_HTML : TAXI_ICON_HTML,
    className: "timeride-taxi-marker",
    iconSize: highlighted ? [48, 48] : [32, 32],
    iconAnchor: highlighted ? [24, 24] : [16, 16],
    popupAnchor: [0, -16],
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
