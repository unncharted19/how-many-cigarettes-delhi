import { useMemo } from 'react';
import { Delaunay } from 'd3-delaunay';
import { Station } from '../hooks/useDelhiAQI';
import { labeledStations } from '../data/stations';
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

const VIEWBOX = { width: 680, height: 460 };

function projectToSvg(lat: number, lng: number): [number, number] {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VIEWBOX.width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEWBOX.height;
  return [x, y];
}

function getLabelPosition(
  centerX: number,
  centerY: number,
  textWidth: number,
  padding: number = 8
): { x: number; y: number; anchor: string } {
  const halfWidth = textWidth / 2;

  if (centerX - halfWidth < padding) {
    return { x: centerX + 12, y: centerY, anchor: 'start' };
  }
  if (centerX + halfWidth > VIEWBOX.width - padding) {
    return { x: centerX - 12, y: centerY, anchor: 'end' };
  }
  return { x: centerX, y: centerY - 12, anchor: 'middle' };
}

export function Heatmap({ stations, minutesOutside, onStationClick, selectedStation }: HeatmapProps) {
  const voronoiData = useMemo(() => {
    const points: [number, number][] = stations.map((s) => projectToSvg(s.lat, s.lng));
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, VIEWBOX.width, VIEWBOX.height]);

    const cells = stations.map((station, i) => {
      const cigarettes = calculateCigarettes(station.pm25, minutesOutside);
      const color = getPm25TierColor(station.pm25);
      const polygon = voronoi.cellPolygon(i);
      const path = polygon ? `M${polygon.join('L')}Z` : '';

      return {
        station,
        path,
        color,
        cigarettes,
        center: points[i],
      };
    });

    return cells;
  }, [stations, minutesOutside]);

  const textWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    labeledStations.forEach((name) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '600 9px system-ui, -apple-system, sans-serif';
        widths[name] = ctx.measureText(name).width;
      }
    });
    return widths;
  }, []);

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
      >
        {voronoiData.map(({ station, path, color, cigarettes, center }) => {
          const textWidth = textWidths[station.name] || 60;
          const labelPos = labeledStations.has(station.name)
            ? getLabelPosition(center[0], center[1], textWidth)
            : null;

          return (
            <g key={station.id}>
              <path
                d={path}
                fill={color}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.5}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => onStationClick(station)}
              />
              {labeledStations.has(station.name) && labelPos && (
                <g>
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
                    fill="white"
                    fontSize="9"
                    fontWeight="600"
                    className="select-none pointer-events-none"
                  >
                    {station.name}
                  </text>
                  <text
                    x={labelPos.x}
                    y={labelPos.y + (labelPos.anchor === 'middle' ? 32 : 20)}
                    textAnchor={labelPos.anchor}
                    fill="rgba(255,255,255,0.7)"
                    fontSize="10"
                    className="select-none pointer-events-none"
                  >
                    {cigarettes.toFixed(1)} cigs
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
