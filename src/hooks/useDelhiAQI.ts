import { useState, useEffect } from 'react';

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  pm25: number;
  lastUpdate: string;
}

interface CacheData {
  timestamp: number;
  stations: Station[];
}

interface UseDelhiAQIResult {
  data: Station[];
  loading: boolean;
  error: string | null;
  stale: boolean;
}

const CACHE_KEY = 'delhi_aqi_v1';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms
const REFETCH_INTERVAL = 30 * 60 * 1000; // 30 minutes in ms

function cleanStationName(rawName: string): string {
  return rawName
    .replace(/\s*-\s*(DPCC|CPCB)$/, '')
    .trim();
}

function getCachedData(): { stations: Station[]; stale: boolean } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    const stale = age > CACHE_TTL;

    return { stations: data.stations, stale };
  } catch {
    return null;
  }
}

function setCachedData(stations: Station[]): void {
  try {
    const data: CacheData = {
      timestamp: Date.now(),
      stations,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache data:', err);
  }
}

export function useDelhiAQI(): UseDelhiAQIResult {
  const [data, setData] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const fetchData = async (isRefetch = false) => {
    if (!isRefetch) {
      setLoading(true);
    }

    const apiKey = import.meta.env.VITE_DATAGOV_KEY;
    if (!apiKey) {
      setError('Missing VITE_DATAGOV_KEY environment variable');
      setLoading(false);

      // Try fallback to cache
      const cached = getCachedData();
      if (cached) {
        setData(cached.stations);
        setStale(true);
      }
      return;
    }

    try {
      const url = `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${apiKey}&format=json&filters[city]=Delhi&limit=500`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const json = await response.json();

      if (!json.records || !Array.isArray(json.records)) {
        throw new Error('Invalid API response format');
      }

      // Filter to PM2.5 only
      const pm25Records = json.records.filter(
        (r: Record<string, string>) => r.pollutant_id === 'PM2.5'
      );

      // Parse and clean
      const stationMap = new Map<string, Station>();

      for (const record of pm25Records) {
        const avgValue = parseFloat(record.avg_value);
        if (isNaN(avgValue)) continue; // Skip "NA" values

        const lat = parseFloat(record.latitude);
        const lng = parseFloat(record.longitude);
        if (isNaN(lat) || isNaN(lng)) continue;

        const cleanName = cleanStationName(record.station);
        if (!cleanName) continue;

        // Dedupe by cleaned name
        if (!stationMap.has(cleanName)) {
          stationMap.set(cleanName, {
            id: cleanName.toLowerCase().replace(/\s+/g, '-'),
            name: cleanName,
            lat,
            lng,
            pm25: Math.round(avgValue),
            lastUpdate: record.last_update || '',
          });
        }
      }

      const stations = Array.from(stationMap.values());

      if (stations.length === 0) {
        throw new Error('No valid PM2.5 stations found');
      }

      console.log('Parsed Delhi AQI stations:', stations);

      setCachedData(stations);
      setData(stations);
      setError(null);
      setStale(false);
    } catch (err) {
      console.error('Failed to fetch AQI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');

      // Fallback to cached data (any age)
      const cached = getCachedData();
      if (cached) {
        setData(cached.stations);
        setStale(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Refetch every 30 minutes
    const intervalId = setInterval(() => {
      fetchData(true);
    }, REFETCH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  return { data, loading, error, stale };
}
