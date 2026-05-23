import { useState, useEffect } from 'react';

export interface Station {
  id: string;
  name: string;
  city?: string;
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

const CACHE_KEY = 'ncr_aqi_v1'; // bumped — clears old Delhi-only cache
const CACHE_TTL = 30 * 60 * 1000;
const REFETCH_INTERVAL = 30 * 60 * 1000;

const NCR_CITIES = ['Delhi', 'Gurugram', 'Faridabad', 'Noida', 'Ghaziabad'];

function cleanName(raw: string): string {
  return raw
    .replace(/\s*-\s*(DPCC|CPCB)$/, '')
    .trim();
}

function getCachedData(): { stations: Station[]; stale: boolean } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data: CacheData = JSON.parse(cached);
    return { stations: data.stations, stale: Date.now() - data.timestamp > CACHE_TTL };
  } catch {
    return null;
  }
}

function setCachedData(stations: Station[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), stations }));
  } catch { /* ignore */ }
}

export function useDelhiAQI(): UseDelhiAQIResult {
  const [data, setData] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const fetchData = async (isRefetch = false) => {
    if (!isRefetch) setLoading(true);

    const apiKey = import.meta.env.VITE_DATAGOV_KEY;
    if (!apiKey) {
      setError('Missing VITE_DATAGOV_KEY environment variable');
      setLoading(false);
      const cached = getCachedData();
      if (cached) { setData(cached.stations); setStale(true); }
      return;
    }

    const fetchCity = async (city: string): Promise<{ records: Record<string, string>[] }> => {
      const url =
        `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` +
        `?api-key=${apiKey}&format=json` +
        `&filters[city]=${encodeURIComponent(city)}&limit=500`;
      const res = await fetch(url);
      if (!res.ok) return { records: [] };
      return res.json();
    };

    try {
      // Parallel fetch for all NCR cities
      const cityResults = await Promise.all(NCR_CITIES.map(fetchCity));

      // Gurgaon fallback — some API responses use old spelling
      if ((cityResults[1].records || []).length === 0) {
        const fallback = await fetchCity('Gurgaon');
        cityResults[1] = fallback;
      }

      // Flatten with city tag
      const tagged = cityResults.flatMap((result, idx) =>
        (result.records || []).map(rec => ({ rec, city: NCR_CITIES[idx] }))
      );

      // Build station map; dedup by city:cleanedName
      const stationMap = new Map<string, Station>();

      for (const { rec, city } of tagged) {
        if (rec.pollutant_id !== 'PM2.5') continue;
        const avgValue = parseFloat(rec.avg_value);
        if (isNaN(avgValue)) continue;
        const lat = parseFloat(rec.latitude);
        const lng = parseFloat(rec.longitude);
        if (isNaN(lat) || isNaN(lng)) continue;
        const cleaned = cleanName(rec.station);
        if (!cleaned) continue;

        const key = `${city}:${cleaned}`;
        if (!stationMap.has(key)) {
          stationMap.set(key, {
            id: `${city.toLowerCase()}-${cleaned.toLowerCase().replace(/\s+/g, '-')}`,
            name: cleaned,
            city,
            lat,
            lng,
            pm25: Math.round(avgValue),
            lastUpdate: rec.last_update || '',
          });
        }
      }

      const stations = Array.from(stationMap.values());
      if (stations.length === 0) throw new Error('No valid PM2.5 stations found');

      setCachedData(stations);
      setData(stations);
      setError(null);
      setStale(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      const cached = getCachedData();
      if (cached) { setData(cached.stations); setStale(true); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(true), REFETCH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return { data, loading, error, stale };
}
