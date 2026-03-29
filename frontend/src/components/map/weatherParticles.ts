import type { WeatherTheme } from './weatherTheme'
import { MoveDirection, OutMode, type ISourceOptions } from '@tsparticles/engine'

interface ThemeVisuals {
  background: string
  cardBackground: string
  cardBorder: string
  accent: string
  buttonBackground: string
  text: string
}

const themeVisuals: Record<string, ThemeVisuals> = {
  'clear-day': {
    background:
      'radial-gradient(circle at 86% 18%, rgba(255, 205, 99, 0.55), rgba(255, 205, 99, 0) 34%), linear-gradient(142deg, rgba(255, 236, 180, 0.98), rgba(194, 229, 255, 0.9))',
    cardBackground: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(255, 255, 255, 0.82)',
    accent: '#b87500',
    buttonBackground: 'rgba(255, 255, 255, 0.5)',
    text: '#25354a',
  },
  'clear-night': {
    background:
      'radial-gradient(circle at 84% 16%, rgba(189, 213, 255, 0.26), rgba(189, 213, 255, 0) 36%), linear-gradient(145deg, rgba(17, 31, 58, 0.98), rgba(22, 43, 78, 0.9))',
    cardBackground: 'rgba(47, 67, 108, 0.56)',
    cardBorder: 'rgba(174, 203, 255, 0.28)',
    accent: '#d4e6ff',
    buttonBackground: 'rgba(61, 83, 126, 0.56)',
    text: '#edf3ff',
  },
  'clouds-day': {
    background:
      'radial-gradient(circle at 18% 22%, rgba(245, 248, 255, 0.42), rgba(245, 248, 255, 0) 30%), linear-gradient(140deg, rgba(210, 221, 238, 0.98), rgba(188, 203, 226, 0.9))',
    cardBackground: 'rgba(246, 250, 255, 0.56)',
    cardBorder: 'rgba(253, 255, 255, 0.78)',
    accent: '#4d6485',
    buttonBackground: 'rgba(240, 246, 255, 0.48)',
    text: '#22354d',
  },
  'clouds-night': {
    background:
      'radial-gradient(circle at 20% 12%, rgba(190, 209, 240, 0.14), rgba(190, 209, 240, 0) 32%), linear-gradient(145deg, rgba(28, 42, 67, 0.98), rgba(41, 57, 84, 0.92))',
    cardBackground: 'rgba(50, 70, 104, 0.56)',
    cardBorder: 'rgba(167, 196, 237, 0.25)',
    accent: '#d2e2ff',
    buttonBackground: 'rgba(62, 85, 121, 0.56)',
    text: '#ebf2ff',
  },
  'rain-day': {
    background:
      'radial-gradient(circle at 24% 8%, rgba(213, 234, 255, 0.24), rgba(213, 234, 255, 0) 30%), linear-gradient(138deg, rgba(120, 160, 204, 0.98), rgba(98, 136, 176, 0.94))',
    cardBackground: 'rgba(205, 225, 247, 0.42)',
    cardBorder: 'rgba(225, 239, 255, 0.42)',
    accent: '#deecff',
    buttonBackground: 'rgba(186, 210, 236, 0.38)',
    text: '#f4f9ff',
  },
  'rain-night': {
    background:
      'radial-gradient(circle at 10% 10%, rgba(109, 160, 221, 0.16), rgba(109, 160, 221, 0) 32%), linear-gradient(145deg, rgba(8, 20, 37, 0.99), rgba(14, 31, 55, 0.95))',
    cardBackground: 'rgba(30, 49, 76, 0.62)',
    cardBorder: 'rgba(140, 180, 232, 0.24)',
    accent: '#d5e7ff',
    buttonBackground: 'rgba(42, 67, 101, 0.56)',
    text: '#e9f2ff',
  },
  'drizzle-day': {
    background:
      'radial-gradient(circle at 84% 10%, rgba(222, 237, 255, 0.2), rgba(222, 237, 255, 0) 24%), linear-gradient(135deg, rgba(167, 197, 228, 0.97), rgba(143, 178, 213, 0.9))',
    cardBackground: 'rgba(222, 239, 255, 0.44)',
    cardBorder: 'rgba(237, 248, 255, 0.4)',
    accent: '#e4f1ff',
    buttonBackground: 'rgba(198, 223, 247, 0.38)',
    text: '#f4f9ff',
  },
  'drizzle-night': {
    background:
      'radial-gradient(circle at 88% 8%, rgba(119, 156, 198, 0.16), rgba(119, 156, 198, 0) 26%), linear-gradient(140deg, rgba(15, 28, 46, 0.99), rgba(24, 43, 69, 0.93))',
    cardBackground: 'rgba(37, 58, 89, 0.58)',
    cardBorder: 'rgba(157, 189, 234, 0.24)',
    accent: '#d7e8ff',
    buttonBackground: 'rgba(52, 78, 113, 0.56)',
    text: '#e8f0ff',
  },
  'thunderstorm-day': {
    background:
      'radial-gradient(circle at 82% 12%, rgba(218, 232, 255, 0.22), rgba(218, 232, 255, 0) 30%), linear-gradient(145deg, rgba(74, 94, 123, 0.98), rgba(47, 63, 93, 0.95))',
    cardBackground: 'rgba(145, 166, 199, 0.34)',
    cardBorder: 'rgba(219, 231, 255, 0.24)',
    accent: '#e8f2ff',
    buttonBackground: 'rgba(130, 152, 188, 0.4)',
    text: '#f4f7fc',
  },
  'thunderstorm-night': {
    background:
      'radial-gradient(circle at 16% 8%, rgba(114, 145, 198, 0.18), rgba(114, 145, 198, 0) 32%), linear-gradient(145deg, rgba(8, 14, 29, 0.99), rgba(13, 24, 45, 0.97))',
    cardBackground: 'rgba(29, 43, 69, 0.64)',
    cardBorder: 'rgba(147, 175, 221, 0.24)',
    accent: '#deecff',
    buttonBackground: 'rgba(44, 63, 96, 0.62)',
    text: '#eff5ff',
  },
  'snow-day': {
    background:
      'radial-gradient(circle at 14% 16%, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0) 34%), linear-gradient(145deg, rgba(236, 244, 255, 0.99), rgba(210, 226, 244, 0.9))',
    cardBackground: 'rgba(255, 255, 255, 0.7)',
    cardBorder: 'rgba(255, 255, 255, 0.88)',
    accent: '#3c5f87',
    buttonBackground: 'rgba(243, 250, 255, 0.52)',
    text: '#1f344e',
  },
  'snow-night': {
    background:
      'radial-gradient(circle at 86% 8%, rgba(195, 220, 255, 0.18), rgba(195, 220, 255, 0) 28%), linear-gradient(145deg, rgba(21, 33, 56, 0.99), rgba(29, 44, 71, 0.93))',
    cardBackground: 'rgba(50, 66, 101, 0.58)',
    cardBorder: 'rgba(176, 202, 245, 0.25)',
    accent: '#e3efff',
    buttonBackground: 'rgba(62, 83, 123, 0.58)',
    text: '#edf3ff',
  },
  'mist-day': {
    background:
      'radial-gradient(circle at 50% 6%, rgba(244, 248, 255, 0.28), rgba(244, 248, 255, 0) 30%), linear-gradient(145deg, rgba(190, 202, 217, 0.98), rgba(172, 186, 201, 0.9))',
    cardBackground: 'rgba(237, 244, 252, 0.5)',
    cardBorder: 'rgba(246, 251, 255, 0.7)',
    accent: '#4f647f',
    buttonBackground: 'rgba(228, 238, 248, 0.48)',
    text: '#24394f',
  },
  'mist-night': {
    background:
      'radial-gradient(circle at 44% 5%, rgba(170, 190, 222, 0.16), rgba(170, 190, 222, 0) 24%), linear-gradient(145deg, rgba(26, 35, 51, 0.99), rgba(34, 44, 62, 0.93))',
    cardBackground: 'rgba(56, 67, 90, 0.58)',
    cardBorder: 'rgba(170, 190, 220, 0.24)',
    accent: '#dde9ff',
    buttonBackground: 'rgba(72, 85, 111, 0.58)',
    text: '#eef3ff',
  },
  'fallback-day': {
    background: 'linear-gradient(135deg, rgba(226, 236, 248, 0.95), rgba(238, 243, 250, 0.88))',
    cardBackground: 'rgba(255, 255, 255, 0.58)',
    cardBorder: 'rgba(255, 255, 255, 0.72)',
    accent: '#4f6481',
    buttonBackground: 'rgba(248, 251, 255, 0.48)',
    text: '#213247',
  },
  'fallback-night': {
    background: 'linear-gradient(135deg, rgba(25, 38, 60, 0.98), rgba(31, 47, 74, 0.9))',
    cardBackground: 'rgba(49, 67, 99, 0.52)',
    cardBorder: 'rgba(169, 199, 240, 0.22)',
    accent: '#dbeaff',
    buttonBackground: 'rgba(61, 84, 124, 0.56)',
    text: '#edf4ff',
  },
}

function baseParticleOptions(
  color: string,
  speed: number,
  count = 60,
  direction: 'bottomRight' | 'bottomLeft' = 'bottomRight',
): NonNullable<ISourceOptions['particles']> {
  return {
    color: { value: color },
    move: {
      direction: direction === 'bottomRight' ? MoveDirection.bottomRight : MoveDirection.bottomLeft,
      enable: true,
      outModes: { default: OutMode.out },
      speed,
      straight: false,
      random: true,
    },
    number: {
      density: { enable: true },
      value: count,
    },
    opacity: { value: { min: 0.18, max: 0.34 } },
    shape: { type: 'line' },
    size: { value: { min: 4, max: 9 } },
  }
}

export function getWeatherVisualTokens(theme: WeatherTheme): ThemeVisuals {
  const key = `${theme.key}-${theme.period}`
  return themeVisuals[key] ?? themeVisuals['fallback-day']
}

export function getWeatherParticlesOptions(theme: WeatherTheme) {
  const base: ISourceOptions = {
    detectRetina: true,
    fpsLimit: 60,
    fullScreen: { enable: false },
    particles: {
      move: { enable: false },
      number: { value: 0 },
      opacity: { value: 0.25 },
      size: { value: 1 },
    },
  }

  if (theme.key === 'rain') {
    return {
      ...base,
      particles: {
        ...baseParticleOptions(
          theme.period === 'night' ? '#a5c7f2' : '#6f9ed8',
          7,
          42,
          'bottomRight',
        ),
        size: { value: { min: 4, max: 9 } },
        opacity: { value: { min: 0.22, max: 0.38 } },
      },
    }
  }

  if (theme.key === 'drizzle') {
    return {
      ...base,
      particles: {
        ...baseParticleOptions(
          theme.period === 'night' ? '#b7d1ef' : '#89afd9',
          5.5,
          30,
          'bottomRight',
        ),
        opacity: { value: { min: 0.16, max: 0.28 } },
        size: { value: { min: 3, max: 7 } },
      },
    }
  }

  if (theme.key === 'snow') {
    return {
      ...base,
      particles: {
        color: { value: '#ffffff' },
        move: {
          direction: MoveDirection.bottom,
          enable: true,
          outModes: { default: OutMode.out },
          speed: 2.8,
          straight: false,
          wobble: { enable: true, distance: 8, speed: 4 },
        },
        number: {
          density: { enable: true },
          value: 64,
        },
        opacity: { value: 0.9 },
        shape: { type: 'circle' },
        size: { value: { min: 2, max: 6 } },
      },
    }
  }

  if (theme.key === 'mist') {
    return {
      ...base,
      particles: {
        color: { value: theme.period === 'night' ? '#9fb4d1' : '#dce6f3' },
        move: {
          direction: MoveDirection.right,
          enable: true,
          outModes: { default: OutMode.out },
          speed: 0.5,
          straight: false,
        },
        number: {
          density: { enable: true },
          value: 14,
        },
        opacity: { value: 0.14 },
        shape: { type: 'circle' },
        size: { value: { min: 38, max: 130 } },
      },
    }
  }

  if (theme.key === 'clear') {
    return {
      ...base,
      particles: {
        color: { value: theme.period === 'night' ? '#d7e8ff' : '#ffd873' },
        move: {
          direction: MoveDirection.none,
          enable: true,
          outModes: { default: OutMode.bounce },
          speed: 0.32,
          straight: false,
        },
        number: {
          density: { enable: true },
          value: theme.period === 'night' ? 26 : 18,
        },
        opacity: { value: theme.period === 'night' ? 0.5 : 0.34 },
        shape: { type: 'circle' },
        size: { value: { min: 1, max: theme.period === 'night' ? 2.5 : 3.2 } },
      },
    }
  }

  if (theme.key === 'clouds') {
    return {
      ...base,
      particles: {
        color: { value: theme.period === 'night' ? '#9eb3d2' : '#d0dced' },
        move: {
          direction: MoveDirection.right,
          enable: true,
          outModes: { default: OutMode.out },
          speed: 0.4,
          straight: false,
        },
        number: {
          density: { enable: true },
          value: 28,
        },
        opacity: { value: 0.3 },
        shape: { type: 'circle' },
        size: { value: { min: 46, max: 120 } },
      },
    }
  }

  if (theme.key === 'thunderstorm') {
    return {
      ...base,
      particles: {
        ...baseParticleOptions('#9abbe9', 8.5, 52, 'bottomRight'),
        size: { value: { min: 5, max: 11 } },
        number: {
          density: { enable: true },
          value: 52,
        },
        opacity: { value: { min: 0.28, max: 0.46 } },
      },
    }
  }

  return base
}
