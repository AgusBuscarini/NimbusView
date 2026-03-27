import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import * as L from "leaflet"
import type { LeafletMouseEvent, Marker as LeafletMarker } from "leaflet";
import { getCurrentWeather } from "../../services/WeatherService";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type SelectedPoint = {
  lat: number;
  lon: number;
};

type CurrentWeather = {
  locationName: string;
  lat: number;
  lon: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      const { lat, lng } = event.latlng;
      onMapClick(lat, lng);
    },
  });

  return null;
}

export default function WeatherMap() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 0);
    }
  }, [selectedPoint, weather, error, loading]);

  const handleMapClick = async (lat: number, lon: number) => {
    setSelectedPoint({ lat, lon });
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const data = await getCurrentWeather(lat, lon);
      setWeather(data);
    } catch (err) {
      setError("No se pudo obtener el clima");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MapContainer
      center={[-31.42, -64.18]} // Córdoba
      zoom={6}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={handleMapClick} />

      {selectedPoint && (
        <Marker position={[selectedPoint.lat, selectedPoint.lon]} ref={markerRef}>
          <Popup>
            {loading && <p>Cargando clima...</p>}
            {error && <p>{error}</p>}

            {!loading && !error && weather && (
              <div>
                <strong>{weather.locationName}</strong>
                <br />
                Temperatura: {weather.temperature}°C
                <br />
                Sensación térmica: {weather.feelsLike}°C
                <br />
                Humedad: {weather.humidity}%
                <br />
                Viento: {weather.windSpeed} m/s
                <br />
                Estado: {weather.description}
              </div>
            )}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
