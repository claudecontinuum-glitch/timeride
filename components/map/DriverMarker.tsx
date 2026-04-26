"use client"

import L from "leaflet"
import type { DriverLocation } from "@/lib/types"
import SmoothMarker from "./SmoothMarker"

const TAXI_ICON_HTML = `
  <div style="
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      position: absolute;
      inset: 4px;
      background: #facc15;
      border: 1.5px solid rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    "></div>
    <span style="
      position: relative;
      font-size: 18px;
      line-height: 1;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
    ">🚕</span>
  </div>
`

const TAXI_ASSIGNED_ICON_HTML = `
  <div style="
    position: relative;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle at center, rgba(0,255,240,0.45) 0%, rgba(0,255,240,0.15) 40%, rgba(0,255,240,0) 70%);
      animation: timeride-taxi-halo 1.6s ease-in-out infinite;
    "></div>
    <div style="
      position: absolute;
      inset: 12px;
      background: #facc15;
      border: 2px solid rgba(255,255,255,0.95);
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(0,255,240,0.5), 0 4px 14px rgba(0,0,0,0.6);
    "></div>
    <span style="
      position: relative;
      font-size: 20px;
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
    @keyframes timeride-taxi-halo {
      0%, 100% {
        opacity: 0.5;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.1);
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
    iconSize: highlighted ? [56, 56] : [40, 40],
    iconAnchor: highlighted ? [28, 28] : [20, 20],
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
