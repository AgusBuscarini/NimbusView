import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'
import * as L from 'leaflet'
import type { LeafletMouseEvent } from 'leaflet'
import {
  getCurrentWeather,
  type CurrentWeather,
} from '../../services/WeatherService'
import WeatherBottomPanel from './WeatherBottomPanel'
import MapSearchBar from './MapSearchBar'
import './WeatherMap.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type SelectedPoint = {
  lat: number
  lon: number
}

type FlyToTarget = {
  lat: number
  lon: number
  zoom: number
} | null

const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-85, -180],
  [85, 180],
]

function clampCoordinates(lat: number, lon: number): SelectedPoint {
  return {
    lat: Math.max(-85, Math.min(85, lat)),
    lon: Math.max(-180, Math.min(180, lon)),
  }
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lon: number) => void
}) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      const { lat, lng } = event.latlng
      onMapClick(lat, lng)
    },
  })

  return null
}

function MapFlyTo({ target }: { target: FlyToTarget }) {
  const map = useMap()

  useEffect(() => {
    if (!target) {
      return
    }

    map.flyTo([target.lat, target.lon], target.zoom, {
      animate: true,
      duration: 0.9,
    })
  }, [map, target])

  return null
}

export default function WeatherMap() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null)
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget>(null)

  const fetchWeatherAt = async (lat: number, lon: number) => {
    const safePoint = clampCoordinates(lat, lon)

    setSelectedPoint(safePoint)
    setLoading(true)
    setError(null)
    setWeather(null)

    try {
      const data = await getCurrentWeather(safePoint.lat, safePoint.lon)
      setWeather(data)
    } catch {
      setError('No se pudo obtener el clima')
    } finally {
      setLoading(false)
    }
  }

  const handleMapClick = async (lat: number, lon: number) => {
    await fetchWeatherAt(lat, lon)
  }

  const handleSearchSelect = async (lat: number, lon: number) => {
    const safePoint = clampCoordinates(lat, lon)

    setFlyToTarget({ lat: safePoint.lat, lon: safePoint.lon, zoom: 10 })
    await fetchWeatherAt(safePoint.lat, safePoint.lon)
  }

  const handleClosePanel = () => {
    setSelectedPoint(null)
    setWeather(null)
    setLoading(false)
    setError(null)
  }

  return (
    <div className="weather-map-shell">
      <MapContainer
        center={[-31.42, -64.18]}
        zoom={6}
        minZoom={3}
        maxZoom={10}
        zoomControl={false}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          noWrap={true}
        />

        <MapClickHandler onMapClick={handleMapClick} />
        <MapFlyTo target={flyToTarget} />

        {selectedPoint && <Marker position={[selectedPoint.lat, selectedPoint.lon]} />}
      </MapContainer>

      <MapSearchBar onSelect={handleSearchSelect} />

      <WeatherBottomPanel
        selectedPoint={selectedPoint}
        weather={weather}
        loading={loading}
        error={error}
        onClose={handleClosePanel}
      />
    </div>
  )
}
