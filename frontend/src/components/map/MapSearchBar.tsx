import { useEffect, useRef, useState } from 'react'
import './MapSearchBar.css'

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

interface Suggestion {
  displayName: string
  shortName: string
  lat: number
  lon: number
}

interface MapSearchBarProps {
  onSelect: (lat: number, lon: number) => void
}

function normalizeSuggestion(result: SearchResult): Suggestion {
  return {
    displayName: result.display_name,
    shortName: result.display_name.split(',')[0]?.trim() || result.display_name,
    lat: Number(result.lat),
    lon: Number(result.lon),
  }
}

export default function MapSearchBar({ onSelect }: MapSearchBarProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setActiveIndex(-1)
      setLoading(false)
      setError(null)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query.trim())}`,
          {
            headers: {
              'Accept-Language': 'es',
            },
          },
        )

        if (!response.ok) {
          throw new Error('Busqueda no disponible')
        }

        const data = (await response.json()) as SearchResult[]
        const normalized = data
          .map(normalizeSuggestion)
          .filter((item) => !Number.isNaN(item.lat) && !Number.isNaN(item.lon))

        setSuggestions(normalized)
        setActiveIndex(normalized.length > 0 ? 0 : -1)
        setOpen(true)
      } catch {
        setError('No se pudo buscar ubicaciones')
        setSuggestions([])
        setActiveIndex(-1)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) {
        return
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)

    return () => {
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [])

  const selectSuggestion = (item: Suggestion) => {
    setQuery(item.shortName)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    onSelect(item.lat, item.lon)
  }

  const handleEnterSearch = async () => {
    const picked = suggestions[activeIndex] ?? suggestions[0]

    if (picked) {
      selectSuggestion(picked)
      return
    }

    if (query.trim().length < 2) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        },
      )

      if (!response.ok) {
        throw new Error('Busqueda no disponible')
      }

      const data = (await response.json()) as SearchResult[]
      const first = data[0]

      if (!first) {
        setError('No se encontraron resultados')
        return
      }

      selectSuggestion(normalizeSuggestion(first))
    } catch {
      setError('No se pudo buscar ubicaciones')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="map-search" ref={rootRef}>
      <div className="map-search__input-wrap">
        <span className="map-search__icon" aria-hidden="true">
          🔎
        </span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && suggestions.length > 0) {
              event.preventDefault()
              setActiveIndex((current) => (current + 1) % suggestions.length)
              return
            }

            if (event.key === 'ArrowUp' && suggestions.length > 0) {
              event.preventDefault()
              setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
              return
            }

            if (event.key === 'Enter') {
              event.preventDefault()
              void handleEnterSearch()
            }
          }}
          className="map-search__input"
          type="search"
          placeholder="Buscar ciudad"
          aria-label="Buscar ciudad"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && (loading || error || suggestions.length > 0) && (
        <div className="map-search__panel">
          {loading && <p className="map-search__status">Buscando...</p>}

          {!loading && error && <p className="map-search__status">{error}</p>}

          {!loading && !error && suggestions.length === 0 && query.trim().length >= 2 && (
            <p className="map-search__status">Sin resultados</p>
          )}

          {!loading &&
            !error &&
            suggestions.map((item, index) => (
              <button
                key={`${item.lat}-${item.lon}-${item.displayName}`}
                type="button"
                className={`map-search__item ${index === activeIndex ? 'map-search__item--active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(item)}
              >
                <span className="map-search__item-title">{item.shortName}</span>
                <span className="map-search__item-subtitle">{item.displayName}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
