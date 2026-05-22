import { useState } from 'react';
import { Search } from 'lucide-react';
import { areas, Area } from '../data/areas';
import { Station } from '../hooks/useDelhiAQI';
import { findAreaByPincode, findAreaByName, findNearestStation } from '../lib/haversine';

interface SearchBarProps {
  stations: Station[];
  onSelectArea: (area: Area, station: Station) => void;
}

export function SearchBar({ stations, onSelectArea }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleSearch = () => {
    if (!query.trim()) {
      setError('Please enter a pincode or area name');
      return;
    }

    let area: Area | null = null;
    const numericQuery = query.trim().replace(/\D/g, '');

    if (numericQuery.length === 6) {
      area = findAreaByPincode(numericQuery, areas);
    }

    if (!area) {
      area = findAreaByName(query.trim(), areas);
    }

    if (!area) {
      setError('Area not found. Try another pincode or area name.');
      return;
    }

    setError('');
    setQuery('');
    const station = findNearestStation(area.lat, area.lng, stations);
    onSelectArea(area, station);
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder="Enter pincode or area (e.g., 110001 or Connaught Place)"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Search size={18} />
          Get report
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
