import { useMemo, useEffect, useState } from 'react';
import { Delaunay } from 'd3-delaunay';
import { Station } from '../hooks/useDelhiAQI';
import { delhiOutline } from '../data/delhi-outline';
import { calculateCigarettes, getPm25TierColor } from '../lib/cigarettes';

interface HeatmapProps {
  stations: Station[];
  minutesOutside: number;
  onStationClick: (station: Station) => void;
  selectedStation: Station | null;
}

const BOUNDS = {
  minLat: 28.40,
  maxLat: 28.88,
  minLng: 76.84,
  maxLng: 77.40,
};

const PADDING = 30;

const VIEWBOX = {
  width: 680 + PADDING * 2,
  height: 460 + PADDING * 2
};

type LngLat = [number, number];

function projectToSvg(lat: number, lng: number): [number, number] {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VIEWBOX.width + PADDING;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEWBOX.height + PADDING;
  return [x, y];
}

export function Heatmap({ stations, minutesOutside, onStationClick, selectedStation }: HeatmapProps) {
  const [delhiBoundary, setDelhiBoundary] = useState<LngLat[] | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datameet/maps/master/States/Delhi/delhi.geojson')
      .then(res => res.json())
      .then(geojson => {
        const coordinates = geojson.features?.[0]?.geometry?.coordinates?.[0]?.[0] || geojson.features?.[0]?.geometry?.coordinates?.[0];
        if (coordinates && Array.isArray(coordinates)) {
          setDelhiBoundary(coordinates.map((coord: number[]) => [coord[0], coord[1]]));
        } else {
          setDelhiBoundary(delhiOutline);
        }
      })
      .catch(() => {
        setDelhiBoundary(delhiOutline);
      });
  }, []);

  const boundarySvgPath = useMemo(() => {
    const boundary = delhiBoundary || delhiOutline;
    const projected = boundary.map(([lng, lat]) => projectToSvg(lat, lng));
    return `M${projected.map(p => `${p[0]},${p[1]}`).join('L')}Z`;
  }, [delhiBoundary]);

  const voronoiData = useMemo(() => {
    const points: [number, number][] = stations.map((s) => projectToSvg(s.lat, s.lng));
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, VIEWBOX.width, VIEWBOX.height]);

    const cells = stations.map((station) => {
      const cigarettes = calculateCigarettes(station.pm25, minutesOutside);
      const color = getPm25TierColor(station.pm25);
      const polygon = voronoi.cellPolygon(stations.indexOf(station));
      const path = polygon ? `M${polygon.join('L')}Z` : '';

      return {
        station,
        path,
        color,
        cigarettes,
        center: points[stations.indexOf(station)],
      };
    });

    return cells;
  }, [stations, minutesOutside]);

  const shouldShowLabel = (stationName: string): boolean => {
    const labelNames = [
      'Anand Vihar',
      'ITO',
      'Dwarka',
      'Rohini',
      'Lodhi Road',
      'Bawana',
      'JNU',
      'IGI Airport',
      'Mundka',
      'Jahangirpuri',
    ];
    return labelNames.some(name => stationName.includes(name));
  };

  const getLabelPosition = (
    centerX: number,
    centerY: number,
    textWidth: number
  ): { x: number; y: number; anchor: string } => {
    const labelHeight = 35;
    const topY = centerY - labelHeight / 2;

    if (centerX - textWidth / 2 < PADDING) {
      return { x: centerX + 10, y: topY, anchor: 'start' };
    }
    if (centerX + textWidth / 2 > VIEWBOX.width - PADDING) {
      return { x: centerX - 10, y: topY, anchor: 'end' };
    }
    return { x: centerX, y: topY, anchor: 'middle' };
  };

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
      >
        <defs>
          <clipPath id="delhi-clip">
            <path d={boundarySvgPath} />
          </clipPath>
        </defs>

        <g clipPath="url(#delhi-clip)">
          {voronoiData.map(({ station, path, color }) => (
            <path
              key={station.id}
              d={path}
              fill={color}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => onStationClick(station)}
            />
          ))}
        </g>

        <path
          d={boundarySvgPath}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1.5}
        />

        {voronoiData.map(({ station, cigarettes, center }) => {
          if (!shouldShowLabel(station.name)) return null;

          const textWidth = station.name.length * 6;
          const labelPos = getLabelPosition(center[0], center[1], textWidth);

          return (
            <g key={station.id}>
              <circle
                cx={center[0]}
                cy={center[1]}
                r={selectedStation?.id === station.id ? 5 : 3}
                fill="white"
                className="transition-all"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor={labelPos.anchor}
                fill="rgba(255,255,255,0.6)"
                fontSize="9"
                fontWeight="600"
                letterSpacing="0.05em"
                className="select-none pointer-events-none"
              >
                {station.name}
              </text>
              <text
                x={labelPos.x}
                y={labelPos.y + 14}
                textAnchor={labelPos.anchor}
                fill="rgba(255,255,255,0.9)"
                fontSize="10"
                fontWeight="700"
                className="select-none pointer-events-none"
              >
                {cigarettes.toFixed(1)} cigs
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
