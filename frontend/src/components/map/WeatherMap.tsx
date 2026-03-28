import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
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

type LocationPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported'

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
  const [userLocation, setUserLocation] = useState<SelectedPoint | null>(null)
  const [locationPermission, setLocationPermission] = useState<LocationPermissionState>('unknown')
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [panelHeight, setPanelHeight] = useState(0)

  const fetchWeatherAt = useCallback(async (lat: number, lon: number) => {
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
  }, [])

  const centerMapAt = useCallback((lat: number, lon: number, zoom = 10) => {
    const safePoint = clampCoordinates(lat, lon)
    setFlyToTarget({ lat: safePoint.lat, lon: safePoint.lon, zoom })
  }, [])

  const requestUserLocation = useCallback(
    async ({ fetchWeather }: { fetchWeather: boolean }) => {
      if (!('geolocation' in navigator)) {
        setLocationPermission('unsupported')
        setLocationMessage('Tu navegador no soporta geolocalizacion')
        return
      }

      setIsRequestingLocation(true)
      setLocationMessage(null)

      try {
        const point = await new Promise<SelectedPoint>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve(clampCoordinates(position.coords.latitude, position.coords.longitude))
            },
            (geoError) => {
              reject(geoError)
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            },
          )
        })

        setLocationPermission('granted')
        setUserLocation(point)
        centerMapAt(point.lat, point.lon)

        if (fetchWeather) {
          await fetchWeatherAt(point.lat, point.lon)
        }
      } catch (geoError) {
        setLocationPermission('denied')

        const code =
          typeof geoError === 'object' && geoError !== null && 'code' in geoError
            ? Number(geoError.code)
            : null

        if (code === 1) {
          setLocationMessage('Permiso de ubicacion denegado')
        } else {
          setLocationMessage('No se pudo obtener tu ubicacion')
        }
      } finally {
        setIsRequestingLocation(false)
      }
    },
    [centerMapAt, fetchWeatherAt],
  )

  useEffect(() => {
    void requestUserLocation({ fetchWeather: true })
  }, [requestUserLocation])

  useEffect(() => {
    if (!locationMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setLocationMessage(null)
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [locationMessage])

  const handleMapClick = async (lat: number, lon: number) => {
    await fetchWeatherAt(lat, lon)
  }

  const handleSearchSelect = async (lat: number, lon: number) => {
    const safePoint = clampCoordinates(lat, lon)

    centerMapAt(safePoint.lat, safePoint.lon)
    await fetchWeatherAt(safePoint.lat, safePoint.lon)
  }

  const handleLocateClick = async () => {
    if (locationPermission === 'granted' && userLocation) {
      centerMapAt(userLocation.lat, userLocation.lon)
      await fetchWeatherAt(userLocation.lat, userLocation.lon)
      return
    }

    await requestUserLocation({ fetchWeather: true })
  }

  const handleClosePanel = () => {
    setSelectedPoint(null)
    setWeather(null)
    setLoading(false)
    setError(null)
    setPanelHeight(0)
  }

  const shellStyle = {
    ['--weather-panel-height' as string]: `${panelHeight}px`,
  } as CSSProperties

  return (
    <div className={`weather-map-shell ${selectedPoint ? 'weather-map-shell--panel-open' : ''}`} style={shellStyle}>
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

      <button
        type="button"
        className="weather-map-shell__locate"
        onClick={() => {
          void handleLocateClick()
        }}
        disabled={isRequestingLocation}
        aria-label="Ir a mi ubicacion"
        title={locationMessage ?? 'Ir a mi ubicacion'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C8.69 2 6 4.69 6 8c0 4.44 4.8 9.52 5 9.73a1.39 1.39 0 0 0 2 0c.2-.21 5-5.29 5-9.73 0-3.31-2.69-6-6-6Zm0 8.2A2.2 2.2 0 1 1 14.2 8 2.2 2.2 0 0 1 12 10.2Zm0 9.1c-.67.72-1.53 1.67-2.4 2.7a1 1 0 0 0 1.53 1.28C11.54 22.77 12 22.26 12 22.26s.46.51.87 1.02a1 1 0 1 0 1.53-1.28c-.87-1.03-1.73-1.98-2.4-2.7Z" />
        </svg>
      </button>

      {locationMessage && (
        <div className="weather-map-shell__location-toast" role="status" aria-live="polite">
          {locationMessage}
        </div>
      )}

      <WeatherBottomPanel
        selectedPoint={selectedPoint}
        weather={weather}
        loading={loading}
        error={error}
        onClose={handleClosePanel}
        onHeightChange={setPanelHeight}
      />
    </div>
  )
}
