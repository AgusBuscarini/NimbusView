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

const API_BASE_URL = 'http://localhost:5073/api'

export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const response = await fetch(`${API_BASE_URL}/weather/current?lat=${lat}&lon=${lon}`)

  if (!response.ok) {
    throw new Error('No se pudo obtener el clima')
  }

  return response.json()
}
