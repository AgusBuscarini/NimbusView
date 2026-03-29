import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as L from 'leaflet'
import type { LeafletMouseEvent } from 'leaflet'
import {
  getCurrentWeather,
  getRadarFrames,
  getRadarTileUrl,
  getWeatherOverlayTileUrl,
  getWeatherForecast,
  type CurrentWeather,
  type RadarFrame,
  type WeatherOverlayLayer,
  type WeatherForecast,
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

const OVERLAY_LAYERS: Array<{ key: WeatherOverlayLayer; label: string }> = [
  { key: 'clouds_new', label: 'Nubes' },
  { key: 'precipitation_new', label: 'Precipitacion' },
  { key: 'wind_new', label: 'Viento' },
]

const TILE_ERROR_THRESHOLD = 20
const TILE_ERROR_WINDOW_MS = 60000
const LAYER_COOLDOWN_MS = 45000
const RADAR_FRAMES_LIMIT = 6
const RADAR_INTERVAL_MS = 2800

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

function MapInteractionHandler({
  onInteractionStart,
  onInteractionEnd,
}: {
  onInteractionStart: () => void
  onInteractionEnd: () => void
}) {
  useMapEvents({
    movestart() {
      onInteractionStart()
    },
    zoomstart() {
      onInteractionStart()
    },
    moveend() {
      onInteractionEnd()
    },
    zoomend() {
      onInteractionEnd()
    },
  })

  return null
}

export default function WeatherMap() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null)
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget>(null)
  const [userLocation, setUserLocation] = useState<SelectedPoint | null>(null)
  const [locationPermission, setLocationPermission] = useState<LocationPermissionState>('unknown')
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [panelHeight, setPanelHeight] = useState(0)
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false)
  const [isRadarEnabled, setIsRadarEnabled] = useState(true)
  const [activeOverlay, setActiveOverlay] = useState<WeatherOverlayLayer | null>('precipitation_new')
  const [overlayOpacity, setOverlayOpacity] = useState(68)
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([])
  const [radarFrameIndex, setRadarFrameIndex] = useState(0)
  const [isRadarPlaying, setIsRadarPlaying] = useState(true)
  const [radarActiveSlot, setRadarActiveSlot] = useState<'a' | 'b'>('a')
  const [radarSlotIndices, setRadarSlotIndices] = useState<{ a: number | null; b: number | null }>({
    a: null,
    b: null,
  })
  const [radarPendingSlot, setRadarPendingSlot] = useState<'a' | 'b' | null>(null)
  const [isRadarTransitioning, setIsRadarTransitioning] = useState(false)
  const [isRadarLoading, setIsRadarLoading] = useState(false)
  const [radarError, setRadarError] = useState<string | null>(null)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [isMapInteracting, setIsMapInteracting] = useState(false)
  const [layerMessage, setLayerMessage] = useState<string | null>(null)
  const [layerCooldownUntil, setLayerCooldownUntil] = useState<Record<WeatherOverlayLayer | 'radar', number | null>>({
    clouds_new: null,
    precipitation_new: null,
    wind_new: null,
    radar: null,
  })
  const tileErrorCountsRef = useRef<Record<WeatherOverlayLayer | 'radar', number>>({
    clouds_new: 0,
    precipitation_new: 0,
    wind_new: 0,
    radar: 0,
  })
  const tileErrorWindowStartRef = useRef<Record<WeatherOverlayLayer | 'radar', number>>({
    clouds_new: 0,
    precipitation_new: 0,
    wind_new: 0,
    radar: 0,
  })
  const layerRetryTimeoutsRef = useRef<Record<WeatherOverlayLayer | 'radar', number | null>>({
    clouds_new: null,
    precipitation_new: null,
    wind_new: null,
    radar: null,
  })
  const manuallyDisabledLayersRef = useRef<Record<WeatherOverlayLayer | 'radar', boolean>>({
    clouds_new: false,
    precipitation_new: false,
    wind_new: false,
    radar: false,
  })
  const activeOverlayRef = useRef<WeatherOverlayLayer | null>('precipitation_new')
  const isRadarEnabledRef = useRef(true)

  const fetchWeatherAt = useCallback(async (lat: number, lon: number) => {
    const safePoint = clampCoordinates(lat, lon)

    setSelectedPoint(safePoint)
    setLoading(true)
    setError(null)
    setForecastError(null)
    setWeather(null)
    setForecast(null)

    const [currentResult, forecastResult] = await Promise.allSettled([
      getCurrentWeather(safePoint.lat, safePoint.lon),
      getWeatherForecast(safePoint.lat, safePoint.lon),
    ])

    if (currentResult.status === 'fulfilled') {
      setWeather(currentResult.value)
    } else {
      setError('No se pudo obtener el clima actual')
    }

    if (forecastResult.status === 'fulfilled') {
      setForecast(forecastResult.value)
    } else {
      setForecastError('No se pudo obtener el pronostico')
    }

    setLoading(false)
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

  useEffect(() => {
    activeOverlayRef.current = activeOverlay
  }, [activeOverlay])

  useEffect(() => {
    isRadarEnabledRef.current = isRadarEnabled
  }, [isRadarEnabled])

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!layerMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setLayerMessage(null)
    }, 4200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [layerMessage])

  useEffect(() => {
    const currentTimeouts = layerRetryTimeoutsRef.current

    return () => {
      const timeoutEntries = Object.values(currentTimeouts)

      timeoutEntries.forEach((timeoutId) => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      })
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadRadarFrames = async () => {
      setIsRadarLoading(true)
      setRadarError(null)

      try {
        const frames = await getRadarFrames()

        if (!isMounted) {
          return
        }

        const limitedFrames = frames.slice(Math.max(0, frames.length - RADAR_FRAMES_LIMIT))
        setRadarFrames(limitedFrames)
        const initialIndex = Math.max(0, limitedFrames.length - 1)
        setRadarFrameIndex(initialIndex)
        setRadarActiveSlot('a')
        setRadarSlotIndices({ a: initialIndex, b: null })
        setRadarPendingSlot(null)
        setIsRadarTransitioning(false)
      } catch {
        if (isMounted) {
          setRadarError('No se pudo cargar la animacion de radar')
        }
      } finally {
        if (isMounted) {
          setIsRadarLoading(false)
        }
      }
    }

    void loadRadarFrames()

    return () => {
      isMounted = false
    }
  }, [])

  const queueRadarFrame = useCallback(
    (nextIndex: number) => {
      if (radarFrames.length === 0 || isRadarTransitioning) {
        return
      }

      const safeIndex = ((nextIndex % radarFrames.length) + radarFrames.length) % radarFrames.length

      if (safeIndex === radarFrameIndex) {
        return
      }

      const nextSlot = radarActiveSlot === 'a' ? 'b' : 'a'

      setRadarPendingSlot(nextSlot)
      setIsRadarTransitioning(true)
      setRadarSlotIndices((currentState) => ({
        ...currentState,
        [nextSlot]: safeIndex,
      }))
    },
    [isRadarTransitioning, radarActiveSlot, radarFrameIndex, radarFrames.length],
  )

  useEffect(() => {
    if (
      !isRadarEnabled ||
      !isRadarPlaying ||
      !isPageVisible ||
      isMapInteracting ||
      radarFrames.length < 2 ||
      isRadarTransitioning
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      queueRadarFrame(radarFrameIndex + 1)
    }, RADAR_INTERVAL_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    isRadarEnabled,
    isRadarPlaying,
    isPageVisible,
    isMapInteracting,
    radarFrames.length,
    radarFrameIndex,
    isRadarTransitioning,
    queueRadarFrame,
  ])

  useEffect(() => {
    if (!isRadarTransitioning || radarPendingSlot === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRadarSlotIndices((currentState) => ({
        ...currentState,
        [radarPendingSlot]: null,
      }))
      setRadarPendingSlot(null)
      setIsRadarTransitioning(false)
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isRadarTransitioning, radarPendingSlot])

  const currentRadarFrame = useMemo(() => {
    if (radarFrames.length === 0) {
      return null
    }

    return radarFrames[Math.min(radarFrameIndex, radarFrames.length - 1)]
  }, [radarFrameIndex, radarFrames])

  const radarFrameLabel = useMemo(() => {
    if (!currentRadarFrame) {
      return null
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(currentRadarFrame.timestamp))
  }, [currentRadarFrame])

  const pausedLayersLabel = useMemo(() => {
    const pausedLayers: string[] = []

    OVERLAY_LAYERS.forEach((layer) => {
      if (layerCooldownUntil[layer.key] !== null) {
        pausedLayers.push(layer.label)
      }
    })

    if (layerCooldownUntil.radar !== null) {
      pausedLayers.push('Radar')
    }

    if (pausedLayers.length === 0) {
      return null
    }

    return `En espera: ${pausedLayers.join(', ')}`
  }, [layerCooldownUntil])

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
    setForecast(null)
    setLoading(false)
    setError(null)
    setForecastError(null)
    setPanelHeight(0)
  }

  const handleRadarToggle = () => {
    const nextValue = !isRadarEnabled
    setIsRadarEnabled(nextValue)
    manuallyDisabledLayersRef.current.radar = !nextValue
    tileErrorCountsRef.current.radar = 0
    tileErrorWindowStartRef.current.radar = 0

    if (nextValue) {
      setLayerCooldownUntil((currentState) => ({
        ...currentState,
        radar: null,
      }))
    }

    if (layerRetryTimeoutsRef.current.radar !== null) {
      window.clearTimeout(layerRetryTimeoutsRef.current.radar)
      layerRetryTimeoutsRef.current.radar = null
    }
  }

  const handleOverlaySelect = (nextOverlay: WeatherOverlayLayer | null) => {
    setActiveOverlay(nextOverlay)

    OVERLAY_LAYERS.forEach((layer) => {
      const isSelected = layer.key === nextOverlay
      manuallyDisabledLayersRef.current[layer.key] = !isSelected
      setLayerCooldownUntil((currentState) => ({
        ...currentState,
        [layer.key]: null,
      }))

      if (isSelected) {
        tileErrorCountsRef.current[layer.key] = 0
        tileErrorWindowStartRef.current[layer.key] = 0
      }

      const retryTimeout = layerRetryTimeoutsRef.current[layer.key]

      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout)
        layerRetryTimeoutsRef.current[layer.key] = null
      }
    })
  }

  const handleLayerTileError = useCallback((layer: WeatherOverlayLayer | 'radar') => {
    const isVisible = layer === 'radar' ? isRadarEnabledRef.current : activeOverlayRef.current === layer

    if (!isVisible) {
      return
    }

    const now = Date.now()
    const windowStart = tileErrorWindowStartRef.current[layer] ?? 0

    if (windowStart === 0 || now - windowStart > TILE_ERROR_WINDOW_MS) {
      tileErrorWindowStartRef.current[layer] = now
      tileErrorCountsRef.current[layer] = 0
    }

    const nextCount = (tileErrorCountsRef.current[layer] ?? 0) + 1
    tileErrorCountsRef.current[layer] = nextCount

    if (nextCount < TILE_ERROR_THRESHOLD) {
      return
    }

    tileErrorCountsRef.current[layer] = 0
    tileErrorWindowStartRef.current[layer] = 0

    if (layer === 'radar') {
      setIsRadarEnabled(false)
    } else {
      setActiveOverlay((currentLayer) => (currentLayer === layer ? null : currentLayer))
    }

    const layerLabel = OVERLAY_LAYERS.find((item) => item.key === layer)?.label ?? 'Radar'
    const resumeAt = Date.now() + LAYER_COOLDOWN_MS
    setLayerCooldownUntil((currentState) => ({
      ...currentState,
      [layer]: resumeAt,
    }))
    setLayerMessage(`${layerLabel} entro en espera por errores de red y reintentara en 45s`)

    if (layerRetryTimeoutsRef.current[layer] !== null) {
      window.clearTimeout(layerRetryTimeoutsRef.current[layer] as number)
      layerRetryTimeoutsRef.current[layer] = null
    }

    layerRetryTimeoutsRef.current[layer] = window.setTimeout(() => {
      if (manuallyDisabledLayersRef.current[layer]) {
        return
      }

      if (layer === 'radar') {
        setIsRadarEnabled(true)
      } else {
        setActiveOverlay((currentLayer) => currentLayer ?? layer)
      }

      setLayerCooldownUntil((currentState) => ({
        ...currentState,
        [layer]: null,
      }))
      setLayerMessage(`${layerLabel} se reactivo automaticamente`)
    }, LAYER_COOLDOWN_MS)
  }, [])

  const moveRadarFrame = (direction: 'next' | 'prev') => {
    if (radarFrames.length === 0) {
      return
    }

    setIsRadarPlaying(false)

    if (direction === 'next') {
      queueRadarFrame(radarFrameIndex + 1)
      return
    }

    queueRadarFrame(radarFrameIndex - 1)
  }

  const handleRadarLayerLoad = useCallback(
    (slot: 'a' | 'b', loadedIndex: number | null) => {
      if (!isRadarTransitioning || radarPendingSlot !== slot || loadedIndex === null) {
        return
      }

      const otherSlot = slot === 'a' ? 'b' : 'a'

      setRadarFrameIndex(loadedIndex)
      setRadarActiveSlot(slot)
      setRadarPendingSlot(null)
      setIsRadarTransitioning(false)
      setRadarSlotIndices((currentState) => ({
        ...currentState,
        [otherSlot]: null,
      }))
    },
    [isRadarTransitioning, radarPendingSlot],
  )

  const shellStyle = {
    ['--weather-panel-height' as string]: `${panelHeight}px`,
  } as CSSProperties

  return (
    <div className={`weather-map-shell ${selectedPoint ? 'weather-map-shell--panel-open' : ''}`} style={shellStyle}>
      <MapContainer
        center={[0, 0]}
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

        {OVERLAY_LAYERS.map((layer) =>
          activeOverlay === layer.key ? (
            <TileLayer
              key={layer.key}
              url={getWeatherOverlayTileUrl(layer.key)}
              opacity={overlayOpacity / 100}
              noWrap={true}
              eventHandlers={{
                tileerror: () => {
                  handleLayerTileError(layer.key)
                },
              }}
            />
          ) : null,
        )}

        {isRadarEnabled && radarSlotIndices.a !== null && radarFrames[radarSlotIndices.a] && (
          <TileLayer
            key={`radar-a-${radarFrames[radarSlotIndices.a].id}`}
            url={getRadarTileUrl(radarFrames[radarSlotIndices.a].id)}
            opacity={radarActiveSlot === 'a' ? Math.min(0.95, overlayOpacity / 100 + 0.08) : 0}
            maxNativeZoom={7}
            noWrap={true}
            eventHandlers={{
              load: () => {
                handleRadarLayerLoad('a', radarSlotIndices.a)
              },
              tileerror: () => {
                handleLayerTileError('radar')
              },
            }}
          />
        )}

        {isRadarEnabled && radarSlotIndices.b !== null && radarFrames[radarSlotIndices.b] && (
          <TileLayer
            key={`radar-b-${radarFrames[radarSlotIndices.b].id}`}
            url={getRadarTileUrl(radarFrames[radarSlotIndices.b].id)}
            opacity={radarActiveSlot === 'b' ? Math.min(0.95, overlayOpacity / 100 + 0.08) : 0}
            maxNativeZoom={7}
            noWrap={true}
            eventHandlers={{
              load: () => {
                handleRadarLayerLoad('b', radarSlotIndices.b)
              },
              tileerror: () => {
                handleLayerTileError('radar')
              },
            }}
          />
        )}

        <MapClickHandler onMapClick={handleMapClick} />
        <MapFlyTo target={flyToTarget} />
        <MapInteractionHandler
          onInteractionStart={() => {
            setIsMapInteracting(true)
          }}
          onInteractionEnd={() => {
            setIsMapInteracting(false)
          }}
        />

        {selectedPoint && <Marker position={[selectedPoint.lat, selectedPoint.lon]} />}
      </MapContainer>

      <MapSearchBar onSelect={handleSearchSelect} />

      <div className="weather-map-shell__layers">
        <button
          type="button"
          className={`weather-map-shell__layers-trigger ${isLayersPanelOpen ? 'is-open' : ''}`}
          onClick={() => {
            setIsLayersPanelOpen((currentState) => !currentState)
          }}
          aria-label="Capas"
          title="Capas"
          aria-expanded={isLayersPanelOpen}
          aria-controls="weather-map-layer-panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 2.4 8 12 13 21.6 8 12 3Zm-8.4 8.5L12 16l8.4-4.5v3L12 19l-8.4-4.5v-3Zm0 4.5L12 20l8.4-4.5v3L12 23l-8.4-4.5v-3Z" />
          </svg>
        </button>

        {isLayersPanelOpen && (
          <div id="weather-map-layer-panel" className="weather-map-shell__layers-panel">
            <p className="weather-map-shell__layers-title">Visualizacion meteorologica</p>

            <div className="weather-map-shell__layer-list" role="group" aria-label="Capas disponibles">
              <button
                type="button"
                className={`weather-map-shell__layer-chip ${isRadarEnabled ? 'is-active' : ''}`}
                onClick={handleRadarToggle}
              >
                Radar
              </button>
            </div>

            <div className="weather-map-shell__layer-list" role="radiogroup" aria-label="Seleccion unica de capas">
              <button
                type="button"
                className={`weather-map-shell__layer-chip ${activeOverlay === null ? 'is-active' : ''}`}
                onClick={() => {
                  handleOverlaySelect(null)
                }}
                role="radio"
                aria-checked={activeOverlay === null}
              >
                Sin capa
              </button>
              {OVERLAY_LAYERS.map((layer) => (
                <button
                  key={layer.key}
                  type="button"
                  className={`weather-map-shell__layer-chip ${activeOverlay === layer.key ? 'is-active' : ''}`}
                  onClick={() => {
                    handleOverlaySelect(layer.key)
                  }}
                  role="radio"
                  aria-checked={activeOverlay === layer.key}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            <label className="weather-map-shell__opacity-control">
              Opacidad {overlayOpacity}%
              <input
                type="range"
                min={20}
                max={100}
                step={1}
                value={overlayOpacity}
                onChange={(event) => {
                  setOverlayOpacity(Number(event.target.value))
                }}
              />
            </label>

            <div className="weather-map-shell__radar-tools">
              <p className="weather-map-shell__radar-title">Animacion radar</p>
              {pausedLayersLabel && <p className="weather-map-shell__radar-status">{pausedLayersLabel}</p>}
              {isRadarLoading && <p className="weather-map-shell__radar-status">Cargando radar...</p>}
              {radarError && <p className="weather-map-shell__radar-status">{radarError}</p>}
              {!isRadarLoading && !radarError && radarFrames.length > 0 && (
                <>
                  <div className="weather-map-shell__radar-actions">
                    <button
                      type="button"
                      onClick={() => {
                        moveRadarFrame('prev')
                      }}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRadarPlaying((currentState) => !currentState)
                      }}
                    >
                      {isRadarPlaying ? 'Pausa' : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        moveRadarFrame('next')
                      }}
                    >
                      ▶
                    </button>
                  </div>
                  {radarFrameLabel && <p className="weather-map-shell__radar-status">Frame {radarFrameLabel}</p>}
                </>
              )}
            </div>
          </div>
        )}
      </div>

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

      {layerMessage && (
        <div className="weather-map-shell__layer-toast" role="status" aria-live="polite">
          {layerMessage}
        </div>
      )}

      <WeatherBottomPanel
        key={selectedPoint ? `${selectedPoint.lat}-${selectedPoint.lon}` : 'weather-panel-empty'}
        selectedPoint={selectedPoint}
        weather={weather}
        forecast={forecast}
        loading={loading}
        error={error}
        forecastError={forecastError}
        onClose={handleClosePanel}
        onHeightChange={setPanelHeight}
      />
    </div>
  )
}
