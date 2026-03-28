export type WeatherThemeKey =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'fallback'

export type WeatherPeriod = 'day' | 'night'

export interface WeatherThemeInput {
  weatherId?: number
  icon?: string
  main?: string
  description?: string
}

export interface WeatherTheme {
  key: WeatherThemeKey
  period: WeatherPeriod
  label: string
}

const themeLabelMap: Record<WeatherThemeKey, string> = {
  clear: 'Despejado',
  clouds: 'Nublado',
  rain: 'Lluvia',
  drizzle: 'Llovizna',
  thunderstorm: 'Tormenta',
  snow: 'Nieve',
  mist: 'Neblina',
  fallback: 'Clima actual',
}

function getThemeFromWeatherId(weatherId?: number): WeatherThemeKey | null {
  if (!weatherId || weatherId <= 0) {
    return null
  }

  if (weatherId >= 200 && weatherId < 300) {
    return 'thunderstorm'
  }

  if (weatherId >= 300 && weatherId < 400) {
    return 'drizzle'
  }

  if (weatherId >= 500 && weatherId < 600) {
    return 'rain'
  }

  if (weatherId >= 600 && weatherId < 700) {
    return 'snow'
  }

  if (weatherId >= 700 && weatherId < 800) {
    return 'mist'
  }

  if (weatherId === 800) {
    return 'clear'
  }

  if (weatherId === 801) {
    return 'clear'
  }

  if (weatherId > 800 && weatherId < 900) {
    return 'clouds'
  }

  return null
}

function getThemeFromIcon(icon?: string): WeatherThemeKey | null {
  const iconCode = icon?.slice(0, 2)

  if (!iconCode) {
    return null
  }

  if (iconCode === '01') {
    return 'clear'
  }

  if (iconCode === '02') {
    return 'clear'
  }

  if (iconCode === '03' || iconCode === '04') {
    return 'clouds'
  }

  if (iconCode === '09') {
    return 'drizzle'
  }

  if (iconCode === '10') {
    return 'rain'
  }

  if (iconCode === '11') {
    return 'thunderstorm'
  }

  if (iconCode === '13') {
    return 'snow'
  }

  if (iconCode === '50') {
    return 'mist'
  }

  return null
}

function getThemeFromText(text: string): WeatherThemeKey {
  if (/torment|thunder/.test(text)) {
    return 'thunderstorm'
  }

  if (/llovizna|drizzle/.test(text)) {
    return 'drizzle'
  }

  if (/lluvia|rain|shower/.test(text)) {
    return 'rain'
  }

  if (/nieve|snow|sleet|granizo/.test(text)) {
    return 'snow'
  }

  if (/niebla|mist|fog|haze|humo|smoke|dust|polvo/.test(text)) {
    return 'mist'
  }

  if (/nube|cloud|overcast/.test(text)) {
    return 'clouds'
  }

  if (/despejado|clear|soleado|sun/.test(text)) {
    return 'clear'
  }

  return 'fallback'
}

export function getWeatherTheme(input: WeatherThemeInput): WeatherTheme {
  const period: WeatherPeriod = input.icon?.endsWith('n') ? 'night' : 'day'

  const byId = getThemeFromWeatherId(input.weatherId)

  if (byId) {
    return {
      key: byId,
      period,
      label: themeLabelMap[byId],
    }
  }

  const byIcon = getThemeFromIcon(input.icon)

  if (byIcon) {
    return {
      key: byIcon,
      period,
      label: themeLabelMap[byIcon],
    }
  }

  const text = `${input.main ?? ''} ${input.description ?? ''}`.toLowerCase().trim()
  const byText = getThemeFromText(text)

  return {
    key: byText,
    period,
    label: themeLabelMap[byText],
  }
}
