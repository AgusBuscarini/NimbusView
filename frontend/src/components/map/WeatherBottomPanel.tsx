import type { CurrentWeather } from '../../services/WeatherService'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { getWeatherTheme } from './weatherTheme'
import {
  getWeatherParticlesOptions,
  getWeatherVisualTokens,
} from './weatherParticles'
import './WeatherBottomPanel.css'

interface SelectedPoint {
  lat: number
  lon: number
}

interface WeatherBottomPanelProps {
  selectedPoint: SelectedPoint | null
  weather: CurrentWeather | null
  loading: boolean
  error: string | null
  onClose: () => void
  onHeightChange?: (height: number) => void
}

interface RainDrop {
  left: number
  delay: number
  duration: number
  length: number
  opacity: number
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function formatCoord(value: number): string {
  return value.toFixed(4)
}

export default function WeatherBottomPanel({
  selectedPoint,
  weather,
  loading,
  error,
  onClose,
  onHeightChange,
}: WeatherBottomPanelProps) {
  const [particlesReady, setParticlesReady] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setParticlesReady(true)
    })
  }, [])

  const theme = getWeatherTheme({
    weatherId: weather?.weatherId,
    icon: weather?.icon,
    main: weather?.main,
    description: weather?.description,
  })
  const visualTokens = getWeatherVisualTokens(theme)
  const particlesOptions = getWeatherParticlesOptions(theme)
  const showCloudLayer =
    theme.key === 'clouds' ||
    theme.key === 'rain' ||
    theme.key === 'drizzle' ||
    theme.key === 'thunderstorm' ||
    theme.key === 'mist'
  const showRainLayers =
    theme.key === 'rain' || theme.key === 'drizzle' || theme.key === 'thunderstorm'

  const themeKey = `${theme.key}-${theme.period}`
  const rainDrops = useMemo<RainDrop[]>(() => {
    if (!showRainLayers) {
      return []
    }

    const countByTheme = {
      drizzle: 22,
      rain: 34,
      thunderstorm: 46,
    }

    const dropsCount = countByTheme[theme.key as keyof typeof countByTheme] ?? 30
    const drops: RainDrop[] = []
    const themeSeed = `${theme.key}-${theme.period}`
      .split('')
      .reduce((accumulator, char, index) => accumulator + char.charCodeAt(0) * (index + 3), 0)

    for (let index = 0; index < dropsCount; index += 1) {
      const left = pseudoRandom(themeSeed + index * 3 + 1) * 100
      const delay = pseudoRandom(themeSeed + index * 5 + 2) * 1.6
      const durationBase = theme.key === 'thunderstorm' ? 1.05 : theme.key === 'rain' ? 1.25 : 1.55
      const duration = durationBase + pseudoRandom(themeSeed + index * 7 + 3) * 0.8
      const lengthBase = theme.key === 'thunderstorm' ? 14 : theme.key === 'rain' ? 11 : 9
      const length = lengthBase + pseudoRandom(themeSeed + index * 11 + 4) * 10
      const opacityBase = theme.key === 'thunderstorm' ? 0.34 : theme.key === 'rain' ? 0.28 : 0.2
      const opacity = opacityBase + pseudoRandom(themeSeed + index * 13 + 5) * 0.18

      drops.push({
        left,
        delay,
        duration,
        length,
        opacity,
      })
    }

    return drops
  }, [showRainLayers, theme.key, theme.period])

  useEffect(() => {
    if (!selectedPoint) {
      onHeightChange?.(0)
      return
    }

    const node = panelRef.current

    if (!node) {
      return
    }

    const reportHeight = () => {
      onHeightChange?.(Math.ceil(node.getBoundingClientRect().height))
    }

    reportHeight()

    const observer = new ResizeObserver(() => {
      reportHeight()
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
      onHeightChange?.(0)
    }
  }, [selectedPoint, onHeightChange, themeKey, loading, error, weather])

  if (!selectedPoint) {
    return null
  }

  return (
    <motion.section
      ref={panelRef}
      className="weather-bottom-panel"
      aria-live="polite"
      initial={{ y: 44, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={themeKey}
          className={`weather-bottom-panel__content weather-bottom-panel__content--${theme.key} weather-bottom-panel__content--${theme.period}`}
          style={{
            background: visualTokens.background,
            color: visualTokens.text,
            ['--weather-card-bg' as string]: visualTokens.cardBackground,
            ['--weather-card-border' as string]: visualTokens.cardBorder,
            ['--weather-accent' as string]: visualTokens.accent,
            ['--weather-button-bg' as string]: visualTokens.buttonBackground,
          }}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="weather-bottom-panel__effects" aria-hidden="true">
            {particlesReady && !showRainLayers && (
              <Particles
                id="weather-particles"
                className="weather-bottom-panel__particles"
                options={particlesOptions}
              />
            )}
            {showCloudLayer && (
              <div className="weather-bottom-panel__cloud-overlay">
                <span className="weather-cloud weather-cloud--one" />
                <span className="weather-cloud weather-cloud--two" />
                <span className="weather-cloud weather-cloud--three" />
              </div>
            )}
            {showRainLayers && (
              <div className={`weather-bottom-panel__rain weather-bottom-panel__rain--${theme.key}`} aria-hidden="true">
                {rainDrops.map((drop, index) => (
                  <span
                    key={`${themeKey}-${index}-${drop.left.toFixed(3)}`}
                    className="weather-bottom-panel__rain-drop"
                    style={{
                      left: `${drop.left}%`,
                      height: `${drop.length}px`,
                      opacity: drop.opacity,
                      animationDelay: `${drop.delay}s`,
                      animationDuration: `${drop.duration}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <span className="weather-bottom-panel__ambient weather-bottom-panel__ambient--left" />
            <span className="weather-bottom-panel__ambient weather-bottom-panel__ambient--right" />
            {theme.key === 'thunderstorm' && (
              <motion.span
                className="weather-bottom-panel__flash"
                animate={{ opacity: [0, 0, 0.34, 0.06, 0] }}
                transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
            {theme.key === 'clear' && theme.period === 'day' && (
              <motion.span
                className="weather-bottom-panel__sun-rays"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 26, ease: 'linear', repeat: Number.POSITIVE_INFINITY }}
              />
            )}
            {theme.key === 'clear' && theme.period === 'day' && (
              <motion.span
                className="weather-bottom-panel__sun-core"
                animate={{ scale: [0.98, 1.04, 0.98], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 4.6, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
            {theme.period === 'night' && <span className="weather-bottom-panel__moon" />}
          </div>

          <header className="weather-bottom-panel__header">
            <div>
              <p className="weather-bottom-panel__eyebrow">{theme.label}</p>
              <h2 className="weather-bottom-panel__title">
                {weather?.locationName ?? 'Ubicacion seleccionada'}
              </h2>
              <p className="weather-bottom-panel__coords">
                Lat {formatCoord(selectedPoint.lat)} / Lon {formatCoord(selectedPoint.lon)}
              </p>
            </div>

            <button
              type="button"
              className="weather-bottom-panel__close"
              onClick={onClose}
              aria-label="Cerrar panel del clima"
            >
              Cerrar
            </button>
          </header>

          {loading && <p className="weather-bottom-panel__message">Cargando clima...</p>}

          {error && !loading && <p className="weather-bottom-panel__message">{error}</p>}

          {!loading && !error && weather && (
            <motion.div
              className="weather-bottom-panel__grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              <motion.article
                className="weather-card"
                variants={{ hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <p className="weather-card__label">Temperatura</p>
                <p className="weather-card__value">{weather.temperature} C</p>
              </motion.article>

              <motion.article
                className="weather-card"
                variants={{ hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <p className="weather-card__label">Sensacion termica</p>
                <p className="weather-card__value">{weather.feelsLike} C</p>
              </motion.article>

              <motion.article
                className="weather-card"
                variants={{ hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <p className="weather-card__label">Humedad</p>
                <p className="weather-card__value">{weather.humidity}%</p>
              </motion.article>

              <motion.article
                className="weather-card"
                variants={{ hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <p className="weather-card__label">Viento</p>
                <p className="weather-card__value">{weather.windSpeed} m/s</p>
              </motion.article>

              <motion.article
                className="weather-card"
                variants={{ hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <p className="weather-card__label">Estado</p>
                <p className="weather-card__value weather-card__value--state">
                  {weather.description}
                </p>
              </motion.article>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}
