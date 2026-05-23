import { useRef, useState, useId } from 'react';
import { Download, Share2, Cigarette } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Station } from '../hooks/useDelhiAQI';
import { calculateCigarettes, getCigaretteTier, getPm25Tier, formatDuration, formatCigCount } from '../lib/cigarettes';
import { ShareModal } from './ShareModal';

interface ShareCardProps {
  location: string;
  pincode?: string;
  distance?: number;
  station: Station | null;
  minutesOutside: number;
}

function getCardGradient(tierLabel: string): string {
  if (['Good', 'Satisfactory'].includes(tierLabel))
    return 'linear-gradient(135deg, #0f172a 0%, #020617 100%)';
  if (['Moderate', 'Poor'].includes(tierLabel))
    return 'linear-gradient(135deg, #431407 0%, #0c0a09 100%)';
  return 'linear-gradient(135deg, #450a0a 0%, #0c0a09 100%)';
}

interface CardContentProps {
  location: string;
  distance?: number;
  station: Station | null;
  cigarettes: number;
  tierColor: string;
  pm25: number;
  pm25Label: string;
  pm25Color: string;
  minutesOutside: number;
  heroSize: number;
  grainId: string;
  isExport?: boolean;
}

function CardContent({
  location, distance, station, cigarettes, tierColor, pm25, pm25Label, pm25Color,
  minutesOutside, heroSize, grainId, isExport,
}: CardContentProps) {
  const cleanLocation = location.replace(/, Delhi$/i, '');
  const stationLabel = station?.name
    .replace(/,\s*Delhi/i, '')
    .replace(/\s*-\s*(DPCC|CPCB|IITM)/i, '')
    .trim() ?? 'station';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Film grain overlay */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none' }}
        aria-hidden
      >
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>

      {/* Faded cigarette icon watermark */}
      <div style={{
        position: 'absolute',
        top: isExport ? 80 : 16,
        right: isExport ? 80 : 16,
        opacity: 0.05,
        pointerEvents: 'none',
      }}>
        <Cigarette size={isExport ? 320 : 160} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: isExport ? '100px 96px' : '28px 32px',
        boxSizing: 'border-box',
      }}>
        {/* Eyebrow */}
        <div style={{
          fontSize: isExport ? 22 : 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: isExport ? 60 : 18,
          fontFamily: 'system-ui, sans-serif',
        }}>
          Your Air · Delhi NCR
        </div>

        {/* Hero number */}
        <div style={{
          fontSize: heroSize,
          fontWeight: 700,
          lineHeight: 0.88,
          color: tierColor,
          fontFamily: 'system-ui, sans-serif',
          marginBottom: isExport ? 28 : 8,
        }}>
          {formatCigCount(cigarettes)}
        </div>

        {/* "cigarettes" label */}
        <div style={{
          fontSize: isExport ? 52 : 26,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.88)',
          fontFamily: 'system-ui, sans-serif',
          marginBottom: isExport ? 48 : 12,
        }}>
          cigarettes
        </div>

        {/* Subline */}
        <div style={{
          fontSize: isExport ? 34 : 16,
          color: 'rgba(255,255,255,0.62)',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.4,
          maxWidth: isExport ? 800 : undefined,
        }}>
          in {formatDuration(minutesOutside)} of breathing the air in{' '}
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{cleanLocation}</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: isExport ? 40 : 14,
        }}>
          <div style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ fontSize: isExport ? 22 : 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
              {distance !== undefined
                ? `${distance.toFixed(1)} km from ${stationLabel}`
                : 'CPCB monitor'}
            </div>
            <div style={{ fontSize: isExport ? 28 : 14, fontWeight: 600 }}>
              <span style={{ color: pm25Color }}>{pm25Label}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 8, fontWeight: 400, fontSize: isExport ? 24 : 12 }}>
                PM2.5 {pm25} µg/m³
              </span>
            </div>
          </div>
          <div style={{
            fontSize: isExport ? 22 : 11,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '0.02em',
          }}>
            howmanycigarettes.in
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShareCard({ location, distance, station, minutesOutside }: ShareCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inlineGrainId = useId().replace(/:/g, '');
  const exportGrainId = useId().replace(/:/g, '');

  const pm25 = station?.pm25 || 0;
  const cigarettes = calculateCigarettes(pm25, minutesOutside);
  const cigaretteTier = getCigaretteTier(cigarettes);
  const pm25Tier = getPm25Tier(pm25);
  const gradient = getCardGradient(pm25Tier.label);

  const sharedProps: Omit<CardContentProps, 'heroSize' | 'grainId' | 'isExport'> = {
    location,
    distance,
    station,
    cigarettes,
    tierColor: cigaretteTier.color,
    pm25,
    pm25Label: pm25Tier.label,
    pm25Color: pm25Tier.color,
    minutesOutside,
  };

  const generatePng = async (): Promise<string | null> => {
    if (!exportRef.current) return null;
    return toPng(exportRef.current, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1920 });
  };

  const handleSave = async () => {
    setGenerating(true);
    try {
      const dataUrl = await generatePng();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `delhi-air-${location.replace(/, Delhi$/i, '').replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    setGenerating(true);
    try {
      const dataUrl = await generatePng();
      if (!dataUrl) return;

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'cigarettes-delhi.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'How Many Cigarettes?',
            text: `I "smoke" ${formatCigCount(cigarettes)} cigarettes ${formatDuration(minutesOutside) === 'a year' ? 'a year' : `in ${formatDuration(minutesOutside)}`} just by breathing the air in ${location.replace(/, Delhi$/i, '')}. Check yours →`,
          });
          return;
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          // fall through to modal
        }
      }

      setShareModalOpen(true);
    } catch (err) {
      console.error('Failed to share:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* ── Inline 16:9 preview ───────────────────────────────────────────── */}
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ aspectRatio: '16/9', background: gradient }}
      >
        <CardContent {...sharedProps} heroSize={140} grainId={inlineGrainId} />
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-gray-600 text-xs">
          Formula: (PM2.5 / 22) × (days) × 1.5
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            <Share2 size={16} />
            {generating ? 'Generating…' : 'Share'}
          </button>
        </div>
      </div>

      {/* ── Offscreen 9:16 export card (1080×1920) ───────────────────────── */}
      <div
        ref={exportRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1080px',
          height: '1920px',
          background: gradient,
          borderRadius: 0,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <CardContent {...sharedProps} heroSize={240} grainId={exportGrainId} isExport />
      </div>

      {/* ── Share modal ───────────────────────────────────────────────────── */}
      {shareModalOpen && (
        <ShareModal
          cigarettes={cigarettes}
          location={location}
          pm25={pm25}
          minutesOutside={minutesOutside}
          onClose={() => setShareModalOpen(false)}
          onDownload={handleSave}
        />
      )}
    </>
  );
}
