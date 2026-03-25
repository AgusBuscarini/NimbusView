import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { useState } from "react";
import * as L from "leaflet"
import type { LeafletMouseEvent } from "leaflet";

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

function MapClickHandler({
  onSelectPoint,
}: {
  onSelectPoint: (point: SelectedPoint) => void;
}) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      const { lat, lng } = event.latlng;
      onSelectPoint({ lat, lon: lng });
    },
  });

  return null;
}

export default function WeatherMap() {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);

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

      <MapClickHandler onSelectPoint={setSelectedPoint} />

      {selectedPoint && (
        <Marker position={[selectedPoint.lat, selectedPoint.lon]}>
          <Popup>
            <div>
              <strong>Punto seleccionado</strong>
              <br />
              Lat: {selectedPoint.lat.toFixed(4)}
              <br />
              Lon: {selectedPoint.lon.toFixed(4)}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
