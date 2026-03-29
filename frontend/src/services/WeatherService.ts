export interface CurrentWeather {
  locationName: string
  lat: number
  lon: number
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  weatherId: number
  main: string
  description: string
  icon: string
}

export interface HourlyForecastItem {
  forecastTime: string
  temperature: number
  weatherId: number
  description: string
  icon: string
  precipitationProbability: number
}

export interface DailyForecastItem {
  date: string
  minTemperature: number
  maxTemperature: number
  description: string
  icon: string
}

export interface WeatherForecast {
  locationName: string
  lat: number
  lon: number
  next24Hours: HourlyForecastItem[]
  next5Days: DailyForecastItem[]
}

export type WeatherOverlayLayer = 'clouds_new' | 'precipitation_new' | 'wind_new'

export interface RadarFrame {
  id: number
  timestamp: string
}

interface RadarFramesResponse {
  frames: RadarFrame[]
}

const API_BASE_URL = 'http://localhost:5073/api'

export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const response = await fetch(`${API_BASE_URL}/weather/current?lat=${lat}&lon=${lon}`)

  if (!response.ok) {
    throw new Error('No se pudo obtener el clima')
  }

  return response.json()
}

export async function getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast> {
  const response = await fetch(`${API_BASE_URL}/weather/forecast?lat=${lat}&lon=${lon}`)

  if (!response.ok) {
    throw new Error('No se pudo obtener el pronostico')
  }

  return response.json()
}

export function getWeatherOverlayTileUrl(layer: WeatherOverlayLayer): string {
  return `${API_BASE_URL}/weather/layers/${layer}/{z}/{x}/{y}.png`
}

export function getRadarTileUrl(frameId: number): string {
  return `${API_BASE_URL}/weather/radar/${frameId}/{z}/{x}/{y}.png`
}

export async function getRadarFrames(): Promise<RadarFrame[]> {
  const response = await fetch(`${API_BASE_URL}/weather/radar/frames`)

  if (!response.ok) {
    throw new Error('No se pudo obtener los frames de radar')
  }

  const data = (await response.json()) as RadarFramesResponse
  return data.frames
}
