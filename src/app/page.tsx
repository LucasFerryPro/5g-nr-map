'use client';

import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Circle, useMapEvents } from 'react-leaflet';

const TOMTOM_API_KEY = "RrGO4wlvJlzsKs2xRVAEcG2UqweDV4GM";

// Fonction pour récupérer les données Overpass
const useOverpassData = async (query: string) => {
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);

    // Vérification de la réponse
    if (!response.ok) {
      throw new Error(`Error while fetching datas : ${response.statusText}`);
    }

    // Vérification si la réponse est du JSON
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data;
    } catch (error) {
      console.error("JSON respons non valid ", text);
      throw new Error("JSON respons non valid");
    }
  } catch (error) {
    console.error("Error while request : ", error);
    throw error;
  }
};

export default function Page() {
  const [roadData, setRoadData] = useState<any[]>([]);
  const [buildingData, setBuildingData] = useState<any[]>([]);
  const [densityData, setDensityData] = useState<number | null>(null);
  const [trafficSpeed, setTrafficSpeed] = useState<number | null>(null);
  const [bestConfig, setBestConfig] = useState<string | null>(null);
  const [location, setLocation] = useState<[number, number]>([47.5103, 6.7984]);

  useEffect(() => {
    console.log("location changed", location);

    setBestConfig(null);
    setRoadData([]);
    setBuildingData([]);
    setDensityData(null);
    setTrafficSpeed(null);

    const fetchOSMData = async () => {
      const [lat, lon] = location;

      const roadQuery = `
        [out:json];
        way[highway](around:5000, ${lat}, ${lon});
        out body;
      `;

      const buildingQuery = `
        [out:json];
        way[building](around:5000, ${lat}, ${lon});
        out body;
      `;

      const densityQuery = `
        [out:json];
        way[landuse=residential](around:5000, ${lat}, ${lon});
        out body;
      `;

      try {
        const roadResponse = await useOverpassData(roadQuery);
        const buildingResponse = await useOverpassData(buildingQuery);
        const densityResponse = await useOverpassData(densityQuery);

        setRoadData(roadResponse.elements);
        setBuildingData(buildingResponse.elements);

        const densityLevel = densityResponse.elements.length / 5; // Ajustement de l'échelle
        setDensityData(densityLevel);

        await fetchTrafficData(lat, lon, densityLevel);
      } catch (error) {
        console.error("Error fetching datas : ", error);
      }
    };

    fetchOSMData();
    console.log("fetchOSMData");
  }, [location]);

  const fetchTrafficData = async (lat: number, lon: number, density: number) => {
    try {
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&unit=KMPH&key=${TOMTOM_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.flowSegmentData) {
        const speed = data.flowSegmentData.currentSpeed;
        setTrafficSpeed(speed);

        // Calcul des meilleurs paramètres 5G NR
        const config = compute5GConfig(speed, density);
        setBestConfig(config);
      }
    } catch (error) {
      console.error("Error getting datas :", error);
    }
  };

  // Fonction pour calculer la meilleure configuration 5G NR
  const compute5GConfig = (speed: number, density: number): string => {
    if (speed > 70 && density > 50) {
      return '120 kHz Subcarrier | mmWave (28 GHz) | Extended Cyclic Prefix';
    } else if (speed > 50 && density > 30) {
      return '60 kHz Subcarrier | C-band (3.5 GHz) | Normal Cyclic Prefix';
    } else {
      return '30 kHz Subcarrier | Low-band (700 MHz) | Normal Cyclic Prefix';
    }
  };

  // Composant pour gérer le clic sur la carte et changer `location`
  function LocationClickHandler() {
    useMapEvents({
      click(e) {
        setLocation([e.latlng.wrap().lat, e.latlng.wrap().lng]);
        //recalculer les données
      },
    });
    return null;
  }

  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">5G NR Network Configuration</h1>
      
      {/* Carte interactive */}
      <MapContainer center={location} zoom={13} style={{ height: '70vh', width: '90%' }} className="shadow-lg rounded-lg">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationClickHandler />

        {/* Affichage des routes */}
        {roadData.map((road, index) => (
          road.geometry && (
            <Polygon
              key={index}
              positions={road.geometry.map((point: any) => [point.lat, point.lon])}
              pathOptions={{ color: 'blue' }}
            >
              <Popup>Road segment</Popup>
            </Polygon>
          )
        ))}

        {/* Affichage des bâtiments */}
        {buildingData.map((building, index) => (
          building.geometry && (
            <Polygon
              key={index}
              positions={building.geometry.map((point: any) => [point.lat, point.lon])}
              pathOptions={{ color: 'gray' }}
            >
              <Popup>Building</Popup>
            </Polygon>
          )
        ))}

        {/* Affichage de la densité sous forme de cercle */}
        {densityData && (
          <Circle
            center={location}
            radius={densityData * 100}
            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}
          >
            <Popup>Estimated population density</Popup>
          </Circle>
        )}
      </MapContainer>

      {/* Résultats de l'analyse */}
      <div className="mt-6 bg-white p-4 shadow-md rounded-md w-full max-w-lg text-center">
        <h2 className="text-xl font-semibold">5G optimal network settings</h2>
        {bestConfig ? (
          <p className="text-lg mt-2 text-blue-600">{bestConfig}</p>
        ) : (
          <p className="text-gray-600">Loading...</p>
        )}
      </div>
    </div>
  );
}
