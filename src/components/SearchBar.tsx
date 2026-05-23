import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Search, MapPin, BookOpen, ShoppingBag, Loader2, X } from 'lucide-react';
import { DELHI_LANDMARKS } from '../data/delhi-landmarks';
import { areas } from '../data/areas';
import { Station } from '../hooks/useDelhiAQI';
import { LocationResult } from '../types';
import { haversineDistance, findNearestStation } from '../lib/haversine';

interface SearchBarProps {
  stations: Station[];
  onResultSelect: (result: LocationResult) => void;
  mapInstance?: maplibregl.Map | null;
}

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  source: 'local' | 'pincode' | 'nominatim';
  pincode?: string;
  landmarkType?: string;
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DELHI_BOUNDS = { minLat: 28.25, maxLat: 28.95, minLng: 76.75, maxLng: 77.55 };

// Inject pulsing marker CSS once
if (typeof document !== 'undefined') {
  const id = 'hmcd-search-marker-style';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes hmcd-ping{0%{transform:scale(0.8);opacity:0.9}100%{transform:scale(2.8);opacity:0}}.hmcd-ping{animation:hmcd-ping 1.5s ease-out infinite}';
    document.head.appendChild(s);
  }
}

function searchLandmarks(query: string): SearchResult[] {
  const q = query.toLowerCase();
  return DELHI_LANDMARKS
    .filter(lm =>
      lm.name.toLowerCase().includes(q) ||
      lm.aliases?.some(a => a.toLowerCase().includes(q))
    )
    .slice(0, 4)
    .map(lm => ({
      id: `local-${lm.name}`,
      name: lm.name,
      subtitle: lm.type.charAt(0).toUpperCase() + lm.type.slice(1),
      lat: lm.lat,
      lng: lm.lng,
      source: 'local' as const,
      landmarkType: lm.type,
    }));
}

function searchAreas(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const isFullPincode = /^\d{6}$/.test(query.trim());
  return areas
    .filter(a =>
      isFullPincode
        ? a.pincode === query.trim()
        : a.name.toLowerCase().includes(q) || a.pincode.startsWith(query.trim())
    )
    .slice(0, 3)
    .map(a => ({
      id: `area-${a.pincode}-${a.name}`,
      name: a.name,
      subtitle: a.pincode,
      lat: a.lat,
      lng: a.lng,
      source: 'pincode' as const,
      pincode: a.pincode,
    }));
}

async function fetchNominatim(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query + ' delhi')}` +
    `&format=json&limit=6` +
    `&viewbox=76.75,28.95,77.55,28.25&bounded=1&countrycodes=in`;

  const resp = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'HowManyCigarettesDelhi/1.0' },
  });
  if (!resp.ok) throw new Error('Nominatim error');

  const data: NominatimItem[] = await resp.json();
  return data
    .filter(r => {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      return (
        lat >= DELHI_BOUNDS.minLat && lat <= DELHI_BOUNDS.maxLat &&
        lng >= DELHI_BOUNDS.minLng && lng <= DELHI_BOUNDS.maxLng
      );
    })
    .map(r => {
      const parts = r.display_name.split(',');
      return {
        id: `nom-${r.place_id}`,
        name: parts[0].trim(),
        subtitle: parts.slice(1, 3).join(',').trim(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        source: 'nominatim' as const,
      };
    });
}

function mergeDeduped(a: SearchResult[], b: SearchResult[]): SearchResult[] {
  const seen = new Set(a.map(r => r.name.toLowerCase().trim()));
  return [...a, ...b.filter(r => !seen.has(r.name.toLowerCase().trim()))];
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.source === 'pincode') return <MapPin size={13} />;
  if (result.landmarkType === 'education') return <BookOpen size={13} />;
  if (result.landmarkType === 'mall') return <ShoppingBag size={13} />;
  return <MapPin size={13} />;
}

export function SearchBar({ stations, onResultSelect, mapInstance }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Click-outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    // Instant: local results
    const localResults = mergeDeduped(searchLandmarks(query), searchAreas(query));
    setResults(localResults.slice(0, 6));
    setIsOpen(true);

    // Debounced: Nominatim
    debounceRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const nomResults = await fetchNominatim(query, abortRef.current.signal);
        setResults(prev => {
          const nonNom = prev.filter(r => r.source !== 'nominatim');
          return mergeDeduped(nonNom, nomResults).slice(0, 6);
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') { /* ignore */ }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    if (stations.length === 0) return;
    const station = findNearestStation(result.lat, result.lng, stations);
    const distanceKm = haversineDistance(result.lat, result.lng, station.lat, station.lng);

    onResultSelect({ name: result.name, station, distanceKm, pincode: result.pincode });

    if (mapInstance) {
      mapInstance.flyTo({ center: [result.lng, result.lat], zoom: 12.5, duration: 1500 });

      // Drop pulsing marker, auto-removes after 5s
      if (searchMarkerRef.current) searchMarkerRef.current.remove();
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none';
      el.innerHTML =
        `<div style="position:relative;width:14px;height:14px">` +
        `<div style="position:absolute;inset:0;background:rgba(59,130,246,0.9);border-radius:50%;border:2px solid white;z-index:1"></div>` +
        `<div class="hmcd-ping" style="position:absolute;inset:0;background:rgba(59,130,246,0.5);border-radius:50%"></div>` +
        `</div>` +
        `<div style="margin-top:3px;padding:1px 5px;background:rgba(0,0,0,0.8);color:white;font-size:10px;border-radius:3px;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis">` +
        `${result.name}</div>`;

      searchMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'top' })
        .setLngLat([result.lng, result.lat])
        .addTo(mapInstance);

      const markerRef = searchMarkerRef;
      setTimeout(() => { markerRef.current?.remove(); markerRef.current = null; }, 5000);
    }

    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && results[highlightedIdx]) handleSelect(results[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIdx(-1);
    }
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setHighlightedIdx(-1); }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search any place in Delhi NCR…"
          autoComplete="off"
          className="w-full pl-9 pr-8 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors text-sm"
        />
        {loading && (
          <Loader2
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin"
          />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-2xl">
          {results.length > 0 ? (
            <>
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  onMouseDown={e => { e.preventDefault(); handleSelect(result); }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    highlightedIdx === idx ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                >
                  <span className="text-gray-500 shrink-0">
                    <ResultIcon result={result} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{result.name}</div>
                    <div className="text-gray-500 text-xs truncate">{result.subtitle}</div>
                  </div>
                  {result.source === 'nominatim' && (
                    <span className="shrink-0 text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded font-mono">
                      MAP
                    </span>
                  )}
                </button>
              ))}
              {loading && (
                <div className="px-4 py-2 flex items-center gap-2 text-gray-600 text-xs border-t border-gray-800">
                  <Loader2 size={11} className="animate-spin" /> Searching maps…
                </div>
              )}
            </>
          ) : loading ? (
            <div className="px-4 py-4 flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          ) : (
            <div className="px-4 py-4 text-gray-500 text-sm">
              No place found. Try a pincode or famous landmark.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
