"use client"

import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"

type Point = { lat: number; lng: number }

type Props = {
  pickup?: Point | null
  dropoff?: Point | null
  driver?: Point | null
  route?: [number, number][]
}

function paint(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  group: import("leaflet").LayerGroup,
  props: Props,
  fit: boolean,
) {
  group.clearLayers()
  const bounds: import("leaflet").LatLngExpression[] = []
  if (props.route && props.route.length > 1) {
    L.polyline(props.route, { color: "#0E8C78", weight: 5, opacity: 0.95 }).addTo(group)
    bounds.push(...props.route)
  }
  const dot = (point: Point, color: string, radius: number) => {
    L.circleMarker([point.lat, point.lng], {
      radius,
      color: "#FFFFFF",
      weight: 3,
      fillColor: color,
      fillOpacity: 1,
    }).addTo(group)
    bounds.push([point.lat, point.lng])
  }
  if (props.pickup) dot(props.pickup, "#FF4D2A", 8)
  if (props.dropoff) dot(props.dropoff, "#121417", 8)
  if (props.driver) dot(props.driver, "#FF4D2A", 7)
  if (fit && bounds.length > 0) {
    const single = !props.dropoff && !(props.route && props.route.length > 1)
    map.fitBounds(L.latLngBounds(bounds), {
      paddingTopLeft: [32, 72],
      paddingBottomRight: [32, single ? 300 : 80],
      maxZoom: single ? 13 : 15,
    })
  }
}

export function RideMap(props: Props) {
  const node = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const groupRef = useRef<import("leaflet").LayerGroup | null>(null)
  const fitted = useRef("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let dead = false
    ;(async () => {
      const L = await import("leaflet")
      if (dead || !node.current || mapRef.current) return
      const map = L.map(node.current, { zoomControl: false }).setView([14.72, -17.46], 12)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          attribution: "Carte &copy; Esri",
        },
      ).addTo(map)
      const group = L.layerGroup().addTo(map)
      mapRef.current = map
      groupRef.current = group
      setReady(true)
      window.setTimeout(() => map.invalidateSize(), 250)
    })()
    return () => {
      dead = true
      mapRef.current?.remove()
      mapRef.current = null
      groupRef.current = null
      setReady(false)
    }
  }, [])

  const fitKey = `${props.pickup?.lat ?? ""},${props.pickup?.lng ?? ""}:${props.dropoff?.lat ?? ""},${props.dropoff?.lng ?? ""}`
  const routeKey = props.route?.length ?? 0

  useEffect(() => {
    let dead = false
    ;(async () => {
      const L = await import("leaflet")
      if (dead || !ready || !mapRef.current || !groupRef.current) return
      const shouldFit = fitted.current !== `${fitKey}:${routeKey}`
      paint(L, mapRef.current, groupRef.current, props, shouldFit)
      if (shouldFit) fitted.current = `${fitKey}:${routeKey}`
      mapRef.current.invalidateSize()
    })()
    return () => {
      dead = true
    }
  }, [fitKey, routeKey, props.driver?.lat, props.driver?.lng, props, ready])

  return <div ref={node} className="h-full w-full" />
}
