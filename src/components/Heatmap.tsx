import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Delaunay } from 'd3-delaunay';
import * as turf from '@turf/turf';
import { Station } from '../hooks/useDelhiAQI';
import { DELHI_BOUNDARY } from '../data/delhi-outline';
import { LocationResult } from '../types';
import { calculateCigarettes, getPm25TierColor, formatCigCount } from '../lib/cigarettes';
import { haversineDistance, findNearestStation } from '../lib/haversine';

interface HeatmapProps {
  stations: Station[];
  minutesOutside: number;
  onStationClick: (station: Station) => void;
  selectedStation: Station | null;
  onMapReady?: (map: maplibregl.Map) => void;
  onLocationResult?: (result: LocationResult) => void;
}

const NCR_CENTER: [number, number] = [77.20, 28.60];
const INITIAL_ZOOM = 9.2;
const VORONOI_BOUNDS: [number, number, number, number] = [76.75, 28.25, 77.55, 28.95];
const NCR_BOUNDS = { minLat: 28.25, maxLat: 28.95, minLng: 76.75, maxLng: 77.55 };

// Circular clip region — 35 km radius, computed once at module load
const NCR_CIRCLE = turf.buffer(turf.point([77.20, 28.55]), 35, { units: 'kilometers' })!;

const DELHI_GEOJSON_URLS = [
  'https://raw.githubusercontent.com/datameet/maps/master/States/Delhi/delhi.geojson',
  'https://raw.githubusercontent.com/india-geo/india-geojson/main/states/delhi.geojson',
  'https://raw.githubusercontent.com/Project-OSRM/osrm-backend/master/test/data/india/delhi.geojson',
];

const MAJOR_STATION_NAMES = [
  'Anand Vihar', 'ITO', 'Dwarka', 'Rohini', 'Lodhi',
  'Bawana', 'JNU', 'IGI Airport', 'Mundka', 'Jahangirpuri',
];

// NCR city label positions (approximate centroids)
const NCR_CITY_LABELS = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [77.17, 28.67] }, properties: { label: 'DELHI',     major: true  } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [77.03, 28.46] }, properties: { label: 'GURUGRAM',  major: false } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [77.39, 28.54] }, properties: { label: 'NOIDA',     major: false } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [77.32, 28.41] }, properties: { label: 'FARIDABAD', major: false } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [77.45, 28.67] }, properties: { label: 'GHAZIABAD', major: false } },
  ],
};

// Inject popup CSS once — removes MapLibre's default white frame
if (typeof document !== 'undefined') {
  const id = 'hmcd-popup-style';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent =
      '.maplibregl-popup-content{background:transparent!important;padding:0!important;box-shadow:none!important;border-radius:10px!important}' +
      '.maplibregl-popup-tip{display:none!important}';
    document.head.appendChild(s);
  }
}

export function cleanStationName(name: string): string {
  return name
    .replace(/,\s*Delhi/i, '')
    .replace(/\s*-\s*(DPCC|CPCB|IITM)/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

function buildVoronoiGeoJSON(stations: Station[]) {
  if (stations.length === 0) return { type: 'FeatureCollection' as const, features: [] };

  const delaunay = Delaunay.from(stations, s => s.lng, s => s.lat);
  const voronoi = delaunay.voronoi(VORONOI_BOUNDS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features: any[] = [];
  stations.forEach((station, i) => {
    const ring = voronoi.cellPolygon(i);
    if (!ring || ring.length < 3) return;
    const coords = (ring as [number, number][]).map((p): [number, number] => [p[0], p[1]]);
    const cellPoly = turf.polygon([coords]);
    let clipped: ReturnType<typeof turf.intersect> | null = null;
    try {
      clipped = turf.intersect(turf.featureCollection([cellPoly, NCR_CIRCLE as never]));
    } catch { clipped = null; }
    if (!clipped) return;
    features.push({
      type: 'Feature',
      id: i,
      geometry: clipped.geometry,
      properties: {
        stationId: station.id,
        stationCity: station.city ?? '',
        color: getPm25TierColor(station.pm25),
      },
    });
  });

  return { type: 'FeatureCollection' as const, features };
}

function buildStationsGeoJSON(stations: Station[], minutesOutside: number) {
  return {
    type: 'FeatureCollection' as const,
    features: stations.map((station, i) => {
      const short = cleanStationName(station.name);
      const cigs = calculateCigarettes(station.pm25, minutesOutside);
      return {
        type: 'Feature' as const,
        id: i,
        geometry: { type: 'Point' as const, coordinates: [station.lng, station.lat] },
        properties: {
          stationId: station.id,
          shortName: short,
          cigarettesLabel: `${formatCigCount(cigs)} cigs`,
          showLabel: MAJOR_STATION_NAMES.some(n => short.includes(n)),
        },
      };
    }),
  };
}

async function fetchDelhiBoundary(): Promise<unknown | null> {
  for (const url of DELHI_GEOJSON_URLS) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.features?.length) return data;
    } catch { continue; }
  }
  return null;
}

export function Heatmap({
  stations, minutesOutside, onStationClick, selectedStation, onMapReady, onLocationResult,
}: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const minutesOutsideRef = useRef(minutesOutside);
  minutesOutsideRef.current = minutesOutside;
  const onStationClickRef = useRef(onStationClick);
  onStationClickRef.current = onStationClick;
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;
  const onLocationResultRef = useRef(onLocationResult);
  onLocationResultRef.current = onLocationResult;

  const selectedFeatureIdRef = useRef<number | null>(null);
  const geoMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [showGeoBanner, setShowGeoBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('geo_banner_dismissed') && !sessionStorage.getItem('geo_used');
  });
  const [geoToast, setGeoToast] = useState<string | null>(null);

  // ── 1. Map initialization ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: NCR_CENTER,
      zoom: INITIAL_ZOOM,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    let hoveredId: number | null = null;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '240px' });

    map.on('load', () => {
      // ── Voronoi fill + border layers ────────────────────────────────────
      map.addSource('voronoi', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'voronoi-fills',
        type: 'fill',
        source: 'voronoi',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.80,
            ['boolean', ['feature-state', 'hovered'],  false], 0.65,
            0.52,
          ],
        },
      });

      map.addLayer({
        id: 'voronoi-borders',
        type: 'line',
        source: 'voronoi',
        paint: { 'line-color': 'rgba(255,255,255,0.18)', 'line-width': 0.5 },
      });

      map.addLayer({
        id: 'voronoi-borders-selected',
        type: 'line',
        source: 'voronoi',
        filter: ['==', ['id'], -1],
        paint: { 'line-color': 'rgba(255,255,255,0.9)', 'line-width': 2.5 },
      });

      // ── Station dots + labels ───────────────────────────────────────────
      map.addSource('stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'station-dots',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 6, 3],
          'circle-color': 'rgba(255,255,255,0.75)',
          'circle-stroke-color': 'rgba(0,0,0,0.5)',
          'circle-stroke-width': 0.5,
        },
      });

      map.addLayer({
        id: 'station-labels',
        type: 'symbol',
        source: 'stations',
        filter: ['==', ['get', 'showLabel'], true],
        layout: {
          'text-field': ['concat', ['get', 'shortName'], '\n', ['get', 'cigarettesLabel']],
          'text-size': 11,
          'text-offset': [0, -1.6],
          'text-anchor': 'bottom',
          'text-font': ['Noto Sans Bold', 'Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-max-width': 12,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.95)',
          'text-halo-color': 'rgba(0,0,0,0.9)',
          'text-halo-width': 1.5,
        },
      });

      // ── NCR circle boundary — soft edge showing clip region ────────────
      map.addSource('ncr-region', {
        type: 'geojson',
        data: NCR_CIRCLE as never,
      });

      map.addLayer({
        id: 'ncr-boundary',
        type: 'line',
        source: 'ncr-region',
        paint: {
          'line-color': 'rgba(255,255,255,0.15)',
          'line-width': 1,
          'line-blur': 2,
        },
      });

      // ── Delhi boundary — fallback polygon, upgrade via fetch ────────────
      map.addSource('delhi-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [DELHI_BOUNDARY] },
        } as never,
      });

      map.addLayer({
        id: 'delhi-outline',
        type: 'line',
        source: 'delhi-boundary',
        paint: {
          'line-color': 'rgba(255,255,255,0.7)',
          'line-width': 1.5,
          'line-dasharray': [3, 3],
        },
      });

      fetchDelhiBoundary().then(geojson => {
        if (geojson && mapRef.current) {
          (map.getSource('delhi-boundary') as maplibregl.GeoJSONSource | undefined)
            ?.setData(geojson as never);
        }
      });

      // ── NCR city labels ─────────────────────────────────────────────────
      map.addSource('ncr-labels', { type: 'geojson', data: NCR_CITY_LABELS as never });

      map.addLayer({
        id: 'ncr-city-labels',
        type: 'symbol',
        source: 'ncr-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': ['case', ['get', 'major'], 14, 10],
          'text-font': ['Noto Sans Bold', 'Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-letter-spacing': 0.15,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['case', ['get', 'major'], 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.45)'],
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      });

      // ── Hover ───────────────────────────────────────────────────────────
      map.on('mouseenter', 'voronoi-fills', e => {
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features?.[0]?.id as number | undefined;
        if (id === undefined) return;
        if (hoveredId !== null) map.setFeatureState({ source: 'voronoi', id: hoveredId }, { hovered: false });
        hoveredId = id;
        map.setFeatureState({ source: 'voronoi', id }, { hovered: true });
      });
      map.on('mouseleave', 'voronoi-fills', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'voronoi', id: hoveredId }, { hovered: false });
          hoveredId = null;
        }
      });

      // ── Click ───────────────────────────────────────────────────────────
      map.on('click', 'voronoi-fills', e => {
        const feature = e.features?.[0];
        if (!feature) return;

        const stationId   = feature.properties?.stationId   as string | undefined;
        const stationCity = feature.properties?.stationCity as string | undefined;
        const featureNumId = feature.id as number;
        const station = stationsRef.current.find(s => s.id === stationId);
        if (!station) return;

        if (selectedFeatureIdRef.current !== null) {
          map.setFeatureState({ source: 'voronoi',  id: selectedFeatureIdRef.current }, { selected: false });
          map.setFeatureState({ source: 'stations', id: selectedFeatureIdRef.current }, { selected: false });
        }
        map.setFeatureState({ source: 'voronoi',  id: featureNumId }, { selected: true });
        map.setFeatureState({ source: 'stations', id: featureNumId }, { selected: true });
        map.setFilter('voronoi-borders-selected', ['==', ['id'], featureNumId]);
        selectedFeatureIdRef.current = featureNumId;

        onStationClickRef.current(station);

        // Popup — show station name with city
        const cigs = calculateCigarettes(station.pm25, minutesOutsideRef.current);
        const tierColor = getPm25TierColor(station.pm25);
        const cityLabel = stationCity ?? station.city;
        const displayName = cleanStationName(station.name) + (cityLabel ? `, ${cityLabel}` : '');
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="background:#111827;color:white;padding:12px 14px;border-radius:10px;font-family:system-ui,sans-serif;min-width:180px">` +
            `<div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);margin-bottom:4px">${displayName}</div>` +
            `<div style="font-size:30px;font-weight:700;line-height:1;color:${tierColor}">${formatCigCount(cigs)}</div>` +
            `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px">cigarettes · PM2.5 ${station.pm25} µg/m³</div>` +
            `</div>`
          )
          .addTo(map);
      });

      map.on('click', e => {
        if (map.queryRenderedFeatures(e.point, { layers: ['voronoi-fills'] }).length === 0) popup.remove();
      });

      onMapReadyRef.current?.(map);
      setMapLoaded(true);
    });

    mapRef.current = map;
    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── 2. Refresh sources ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map) return;
    (map.getSource('voronoi') as maplibregl.GeoJSONSource | undefined)
      ?.setData(buildVoronoiGeoJSON(stations) as never);
    (map.getSource('stations') as maplibregl.GeoJSONSource | undefined)
      ?.setData(buildStationsGeoJSON(stations, minutesOutside) as never);
  }, [stations, minutesOutside, mapLoaded]);

  // ── 3. Sync selectedStation prop → feature state ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map) return;

    if (selectedFeatureIdRef.current !== null) {
      try {
        map.setFeatureState({ source: 'voronoi',  id: selectedFeatureIdRef.current }, { selected: false });
        map.setFeatureState({ source: 'stations', id: selectedFeatureIdRef.current }, { selected: false });
      } catch { /* ignore */ }
      selectedFeatureIdRef.current = null;
    }

    if (!selectedStation) {
      try { map.setFilter('voronoi-borders-selected', ['==', ['id'], -1]); } catch { /* ignore */ }
      return;
    }

    const idx = stationsRef.current.findIndex(s => s.id === selectedStation.id);
    if (idx === -1) {
      try { map.setFilter('voronoi-borders-selected', ['==', ['id'], -1]); } catch { /* ignore */ }
      return;
    }

    try {
      map.setFeatureState({ source: 'voronoi',  id: idx }, { selected: true });
      map.setFeatureState({ source: 'stations', id: idx }, { selected: true });
      map.setFilter('voronoi-borders-selected', ['==', ['id'], idx]);
      selectedFeatureIdRef.current = idx;
    } catch { /* mid-teardown */ }
  }, [selectedStation, mapLoaded]);

  // ── Geolocation ───────────────────────────────────────────────────────────
  const handleGeoClick = () => {
    setShowGeoBanner(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (
          lat < NCR_BOUNDS.minLat || lat > NCR_BOUNDS.maxLat ||
          lng < NCR_BOUNDS.minLng || lng > NCR_BOUNDS.maxLng
        ) {
          setGeoToast("You're outside Delhi NCR — search a Delhi area instead.");
          setTimeout(() => setGeoToast(null), 4000);
          return;
        }
        sessionStorage.setItem('geo_used', 'true');
        const station = findNearestStation(lat, lng, stationsRef.current);
        const distanceKm = haversineDistance(lat, lng, station.lat, station.lng);
        onLocationResultRef.current?.({ name: 'Your location', station, distanceKm });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 12.5, duration: 1500 });

        if (geoMarkerRef.current) geoMarkerRef.current.remove();
        const el = document.createElement('div');
        el.style.cssText = 'width:14px;height:14px;background:rgba(96,165,250,0.9);border-radius:50%;border:2px solid white;box-shadow:0 0 0 5px rgba(96,165,250,0.25)';
        geoMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);
      },
      () => {
        localStorage.setItem('geo_banner_dismissed', '1');
        setGeoToast('Location access denied — search below for your area');
        setTimeout(() => setGeoToast(null), 4000);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const handleGeoDismiss = () => {
    localStorage.setItem('geo_banner_dismissed', '1');
    setShowGeoBanner(false);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {showGeoBanner && (
        <div className="absolute top-3 left-3 right-14 z-10 flex items-center gap-3 px-4 py-3 bg-black/75 backdrop-blur-sm rounded-xl text-sm">
          <span className="text-gray-200 text-xs leading-snug">
            📍 Get your personal report — allow location or search below
          </span>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleGeoClick} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-semibold transition-colors">
              Use my location
            </button>
            <button onClick={handleGeoDismiss} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {geoToast && (
        <div className="absolute bottom-4 left-4 right-4 z-10 px-4 py-3 bg-gray-900/95 text-gray-200 text-sm rounded-xl text-center shadow-xl">
          {geoToast}
        </div>
      )}
    </div>
  );
}
