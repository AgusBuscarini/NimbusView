import type { CurrentWeather, DailyForecastItem, HourlyForecastItem, WeatherForecast } from '../../services/WeatherService'
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
  forecast: WeatherForecast | null
  loading: boolean
  error: string | null
  forecastError: string | null
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

function formatHour(value: string): string {
  const date = new Date(value)

  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`)

  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function formatTemperature(value: number): string {
  return `${Math.round(value)} C`
}

function getIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}

export default function WeatherBottomPanel({
  selectedPoint,
  weather,
  forecast,
  loading,
  error,
  forecastError,
  onClose,
  onHeightChange,
}: WeatherBottomPanelProps) {
  const [particlesReady, setParticlesReady] = useState(false)
  const [panelStep, setPanelStep] = useState(0)
  const panelRef = useRef<HTMLElement | null>(null)
  const wheelAccumulatedDeltaRef = useRef(0)
  const lastWheelStepAtRef = useRef(0)

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
  const hasHourlyForecast = (forecast?.next24Hours.length ?? 0) > 0
  const hasDailyForecast = (forecast?.next5Days.length ?? 0) > 0
  const showHourlyForecast = panelStep >= 1
  const showDailyForecast = panelStep >= 2

  const handlePanelWheel = (event: React.WheelEvent<HTMLElement>) => {
    const container = event.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = container
    const deltaY = event.deltaY
    const now = performance.now()

    const isScrollingDown = deltaY > 0
    const isScrollingUp = deltaY < 0

    const isAtTop = scrollTop <= 0
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
    const overflowY = window.getComputedStyle(container).overflowY
    const canScrollY = overflowY === 'auto' || overflowY === 'scroll'
    const hasScrollableContent = canScrollY && scrollHeight > clientHeight + 1

    if (hasScrollableContent) {
      if (isScrollingDown && !isAtBottom) {
        return
      }

      if (isScrollingUp && !isAtTop) {
        return
      }
    }

    if (now - lastWheelStepAtRef.current < 210) {
      return
    }

    wheelAccumulatedDeltaRef.current += event.deltaY

    if (Math.abs(wheelAccumulatedDeltaRef.current) < 44) {
      return
    }

    const direction = wheelAccumulatedDeltaRef.current > 0 ? 1 : -1
    wheelAccumulatedDeltaRef.current = 0
    lastWheelStepAtRef.current = now

    setPanelStep((currentStep) => {
      const nextStep = Math.max(0, Math.min(2, currentStep + direction))
      return nextStep
    })
  }

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
      initial={{ y: 220, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 180, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={themeKey}
          className={`weather-bottom-panel__content weather-bottom-panel__content--step-${panelStep} weather-bottom-panel__content--${theme.key} weather-bottom-panel__content--${theme.period}`}
          style={{
            background: visualTokens.background,
            color: visualTokens.text,
            ['--weather-card-bg' as string]: visualTokens.cardBackground,
            ['--weather-card-border' as string]: visualTokens.cardBorder,
            ['--weather-accent' as string]: visualTokens.accent,
            ['--weather-button-bg' as string]: visualTokens.buttonBackground,
            ['--weather-step' as string]: String(panelStep),
          }}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onWheel={handlePanelWheel}
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

          {!loading && !error && weather && (
            <p className="weather-bottom-panel__scroll-hint">
              Desliza con la rueda: abajo para expandir, arriba para colapsar.
            </p>
          )}

          {loading && <p className="weather-bottom-panel__message">Cargando clima...</p>}

          {error && !loading && <p className="weather-bottom-panel__message">{error}</p>}

          {!loading && !error && weather && (
            <>
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
                  <p className="weather-card__value">{formatTemperature(weather.temperature)}</p>
                </motion.article>

                <motion.article
                  className="weather-card"
                  variants={{ hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                >
                  <p className="weather-card__label">Sensacion termica</p>
                  <p className="weather-card__value">{formatTemperature(weather.feelsLike)}</p>
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

              {showHourlyForecast && forecastError && (
                <p className="weather-bottom-panel__message">{forecastError}</p>
              )}

              <section
                className={`weather-forecast-section weather-forecast-section--hourly ${showHourlyForecast ? 'is-visible' : ''}`}
                aria-hidden={!showHourlyForecast}
              >
                <div className="weather-forecast-section__header">
                  <h3>Proximas 24 horas</h3>
                </div>

                {!forecastError && hasHourlyForecast && (
                  <div className="weather-forecast-hourly-track">
                    {forecast?.next24Hours.map((item: HourlyForecastItem) => (
                      <article className="weather-forecast-hourly-card" key={item.forecastTime}>
                        <p className="weather-forecast-hourly-card__hour">{formatHour(item.forecastTime)}</p>
                        <img
                          src={getIconUrl(item.icon)}
                          alt={item.description}
                          className="weather-forecast-hourly-card__icon"
                        />
                        <p className="weather-forecast-hourly-card__temp">{formatTemperature(item.temperature)}</p>
                        <p className="weather-forecast-hourly-card__desc">{item.description}</p>
                        {item.precipitationProbability > 0 && (
                          <p className="weather-forecast-hourly-card__rain">Lluvia {Math.round(item.precipitationProbability)}%</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section
                className={`weather-forecast-section weather-forecast-section--daily ${showDailyForecast ? 'is-visible' : ''}`}
                aria-hidden={!showDailyForecast}
              >
                <div className="weather-forecast-section__header">
                  <h3>Proximos 5 dias</h3>
                </div>

                {!forecastError && hasDailyForecast && (
                  <div className="weather-forecast-daily-list">
                    {forecast?.next5Days.map((item: DailyForecastItem) => (
                      <article className="weather-forecast-daily-item" key={item.date}>
                        <p className="weather-forecast-daily-item__date">{formatDay(item.date)}</p>
                        <div className="weather-forecast-daily-item__summary">
                          <img
                            src={getIconUrl(item.icon)}
                            alt={item.description}
                            className="weather-forecast-daily-item__icon"
                          />
                          <p className="weather-forecast-daily-item__description">{item.description}</p>
                        </div>
                        <p className="weather-forecast-daily-item__temps">
                          {formatTemperature(item.maxTemperature)} / {formatTemperature(item.minTemperature)}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}
