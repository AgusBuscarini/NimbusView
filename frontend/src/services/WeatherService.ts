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
