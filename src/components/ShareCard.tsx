import { useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Station } from '../data/stations';
import { calculateCigarettes, getTier, formatDuration } from '../lib/cigarettes';

interface ShareCardProps {
  location: string;
  pincode?: string;
  distance?: number;
  station: Station | null;
  minutesOutside: number;
}

export function ShareCard({ location, pincode, distance, station, minutesOutside }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const pm25 = station?.pm25 || 0;
  const cigarettes = calculateCigarettes(pm25, minutesOutside);
  const tier = getTier(cigarettes);

  const handleSave = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#0a0a0a',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `delhi-air-${location.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'How Many Cigarettes?',
          text: `The air in ${location} equals ${cigarettes.toFixed(1)} cigarettes in just ${formatDuration(minutesOutside)} outside. Check your area at HowManyCigarettes.com`,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      handleSave();
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="w-full relative overflow-hidden rounded-2xl p-8"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(220,38,38,0.3) 0%, #0a0a0a 50%, #0a0a0a 100%)',
          minHeight: '280px',
        }}
      >
        <div className="relative z-10">
          <p className="text-gray-400 text-xs tracking-widest uppercase mb-3">Your air, in cigarettes</p>

          <div className="mb-6">
            <p className="text-gray-300 text-base">
              Standing in <span className="text-white font-semibold">{location}</span>
              {pincode && (
                <span className="text-gray-500"> · {pincode}</span>
              )}
              {distance !== undefined && (
                <span className="text-gray-500"> · {distance.toFixed(1)} km from station</span>
              )}
            </p>
          </div>

          <div className="flex items-end gap-3 mb-2">
            <span
              className="font-bold leading-none"
              style={{
                fontSize: '96px',
                color: tier.color,
              }}
            >
              {cigarettes.toFixed(1)}
            </span>
            <span className="text-2xl text-gray-300 mb-4">cigarettes</span>
          </div>

          <p className="text-gray-400 text-lg">
            in just {formatDuration(minutesOutside)} outside
          </p>

          <div className="mt-6 flex items-center gap-2">
            <span style={{ color: tier.color }} className="text-sm font-medium">
              {tier.label}
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500 text-sm">{pm25} µg/m³ PM2.5</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-600 text-xs">
          Formula: (PM2.5/22) × (min/1440) × 1.5
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Download size={16} />
            Save card
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
