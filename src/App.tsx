import { useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Cigarette, AlertCircle } from 'lucide-react';
import { useDelhiAQI } from './hooks/useDelhiAQI';
import { Heatmap, cleanStationName } from './components/Heatmap';
import { TimeSelector } from './components/TimeSelector';
import { SearchBar } from './components/SearchBar';
import { WorstZones } from './components/WorstZones';
import { ShareCard } from './components/ShareCard';
import { Station } from './hooks/useDelhiAQI';
import { LocationResult } from './types';

function App() {
  const { data: stations, loading, error, stale } = useDelhiAQI();
  const [minutesOutside, setMinutesOutside] = useState(360);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [locationName, setLocationName] = useState('NCR Average');
  const [distance, setDistance] = useState<number | undefined>(undefined);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);

  const delhiAverageStation = stations.length > 0
    ? {
        id: 'ncr-average',
        name: 'NCR Average',
        lat: 28.6139,
        lng: 77.2090,
        pm25: Math.round(stations.reduce((s, st) => s + st.pm25, 0) / stations.length),
        lastUpdate: stations[0]?.lastUpdate || '',
      }
    : null;

  const currentStation = selectedStation || delhiAverageStation;

  // Station clicked directly on map
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setLocationName(cleanStationName(station.name));
    setDistance(undefined);
  };

  // Result from SearchBar or geolocation banner
  const handleLocationResult = (result: LocationResult) => {
    setSelectedStation(result.station);
    setLocationName(result.name);
    setDistance(result.distanceKm);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cigarette size={32} className="text-red-500" />
            <h1 className="text-2xl font-bold">How Many Cigarettes? <span className="text-gray-500 font-normal text-lg">· Delhi NCR</span></h1>
          </div>
          <TimeSelector minutes={minutesOutside} onChange={setMinutesOutside} />
        </div>

        {stale && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm">
            <AlertCircle size={16} />
            <span>Showing cached data (API unavailable)</span>
          </div>
        )}

        {error && !stale && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl mb-6 flex items-center justify-center h-[350px] md:h-[600px]" style={{ background: '#0a0a0a' }}>
            <div className="text-gray-400">Loading air quality data...</div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#0a0a0a' }}>
              <div className="h-[350px] md:h-[600px]">
                <Heatmap
                  stations={stations}
                  minutesOutside={minutesOutside}
                  onStationClick={handleStationClick}
                  selectedStation={selectedStation}
                  onMapReady={setMapInstance}
                  onLocationResult={handleLocationResult}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <SearchBar
                stations={stations}
                onResultSelect={handleLocationResult}
                mapInstance={mapInstance}
              />
              <WorstZones
                stations={stations}
                minutesOutside={minutesOutside}
                onStationClick={handleStationClick}
              />
            </div>

            <ShareCard
              location={locationName}
              distance={distance}
              station={currentStation}
              minutesOutside={minutesOutside}
            />
          </>
        )}

        <div className="mt-12 pt-8 border-t border-gray-800">
          <h3 className="text-gray-500 text-sm font-medium mb-4">PM2.5 µg/m³</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: 'Good',        color: '#16a34a', range: '<30' },
              { label: 'Satisfactory', color: '#65a30d', range: '30-60' },
              { label: 'Moderate',    color: '#ca8a04', range: '60-90' },
              { label: 'Poor',        color: '#ea580c', range: '90-120' },
              { label: 'Very Poor',   color: '#dc2626', range: '120-250' },
              { label: 'Severe',      color: '#7f1d1d', range: '250+' },
            ].map(tier => (
              <div key={tier.label} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: tier.color }} />
                <span className="text-gray-400 text-sm">{tier.label}</span>
                <span className="text-gray-600 text-xs ml-auto">{tier.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
