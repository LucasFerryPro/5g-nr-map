'use client';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});

const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});

export default function Page() {
  return (
    <MapContainer
      center={[40.7128, -74.0060]}
      zoom={13}
      style={{ height: '100vh'}}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  )
}
