import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Station } from '../hooks/useDelhiAQI';
import { calculateCigarettes, getCigaretteTier } from '../lib/cigarettes';
import { cleanStationName } from './Heatmap';

interface WorstZonesProps {
  stations: Station[];
  minutesOutside: number;
  onStationClick: (station: Station) => void;
}

export function WorstZones({ stations, minutesOutside, onStationClick }: WorstZonesProps) {
  const worstStations = useMemo(() => {
    return [...stations]
      .map((station) => ({
        ...station,
        cigarettes: calculateCigarettes(station.pm25, minutesOutside),
      }))
      .sort((a, b) => b.cigarettes - a.cigarettes)
      .slice(0, 4);
  }, [stations, minutesOutside]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-red-500" />
        <h3 className="text-white font-semibold text-lg">Most Polluted Zones</h3>
      </div>
      <div className="space-y-2">
        {worstStations.map((station, index) => {
          const tier = getCigaretteTier(station.cigarettes);
          return (
            <button
              key={station.id}
              onClick={() => onStationClick(station)}
              className="w-full flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-semibold text-sm w-5">{index + 1}</span>
                <div>
                  <p className="text-white font-medium">{cleanStationName(station.name)}</p>
                  <p className="text-gray-400 text-sm">{station.city ? `${station.city} · ` : ''}{station.pm25} µg/m³</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: tier.color }}>
                  {station.cigarettes.toFixed(1)}
                </p>
                <p className="text-gray-500 text-xs">cigarettes</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
