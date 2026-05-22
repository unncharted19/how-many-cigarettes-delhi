import { useState, useMemo } from 'react';
import { Cigarette } from 'lucide-react';
import { useDelhiAQI } from './hooks/useDelhiAQI';
import { Heatmap } from './components/Heatmap';
import { TimeSelector } from './components/TimeSelector';
import { SearchBar } from './components/SearchBar';
import { WorstZones } from './components/WorstZones';
import { ShareCard } from './components/ShareCard';
import { Station } from './data/stations';
import { Area } from './data/areas';
import { haversineDistance } from './lib/haversine';

function App() {
  const stations = useDelhiAQI();
  const [minutesOutside, setMinutesOutside] = useState(30);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [locationName, setLocationName] = useState('Delhi Average');
  const [pincode, setPincode] = useState<string | undefined>(undefined);
  const [distance, setDistance] = useState<number | undefined>(undefined);

  const delhiAverageStation = useMemo(() => {
    const avgPm25 = stations.reduce((sum, s) => sum + s.pm25, 0) / stations.length;
    return {
      id: 'delhi-average',
      name: 'Delhi Average',
      lat: 28.6139,
      lng: 77.2090,
      pm25: Math.round(avgPm25),
    };
  }, [stations]);

  const currentStation = selectedStation || delhiAverageStation;

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setLocationName(station.name);
    setPincode(undefined);
    setDistance(undefined);
  };

  const handleAreaSelect = (area: Area, station: Station) => {
    const dist = haversineDistance(area.lat, area.lng, station.lat, station.lng);
    setSelectedStation(station);
    setLocationName(area.name);
    setPincode(area.pincode);
    setDistance(dist);
  };

  const tierLabels = [
    { label: 'Clean', color: '#16a34a', range: '<0.5' },
    { label: 'Moderate', color: '#65a30d', range: '0.5-1' },
    { label: 'Poor', color: '#ca8a04', range: '1-1.5' },
    { label: 'Unhealthy', color: '#ea580c', range: '1.5-2.5' },
    { label: 'Very Unhealthy', color: '#dc2626', range: '2.5-4' },
    { label: 'Hazardous', color: '#7f1d1d', range: '4+' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cigarette size={32} className="text-red-500" />
            <h1 className="text-2xl font-bold">How Many Cigarettes?</h1>
          </div>
          <TimeSelector minutes={minutesOutside} onChange={setMinutesOutside} />
        </div>

        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#0a0a0a' }}>
          <div className="h-[350px] md:h-[600px]">
            <Heatmap
              stations={stations}
              minutesOutside={minutesOutside}
              onStationClick={handleStationClick}
              selectedStation={selectedStation}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SearchBar onSelectArea={handleAreaSelect} />
          <WorstZones
            stations={stations}
            minutesOutside={minutesOutside}
            onStationClick={handleStationClick}
          />
        </div>

        <ShareCard
          location={locationName}
          pincode={pincode}
          distance={distance}
          station={currentStation}
          minutesOutside={minutesOutside}
        />

        <div className="mt-12 pt-8 border-t border-gray-800">
          <h3 className="text-gray-500 text-sm font-medium mb-4">Cigarette Equivalents</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {tierLabels.map((tier) => (
              <div key={tier.label} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tier.color }}
                />
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
