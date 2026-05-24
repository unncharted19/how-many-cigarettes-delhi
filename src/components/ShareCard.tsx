import { useRef, useState, useId, useEffect, useMemo } from 'react';
import { Download, Share2 } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import QRCode from 'qrcode';
import { Station } from '../hooks/useDelhiAQI';
import {
  calculateCigarettes, getCigaretteTier, getPm25Tier,
  formatDuration, formatCigCount,
} from '../lib/cigarettes';
import { ShareModal } from './ShareModal';

interface ShareCardProps {
  location: string;
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

// ── Cigarette Grid ─────────────────────────────────────────────────────────────

function CigaretteGrid({ count, scale = 1, compact }: { count: number; scale?: number; compact?: boolean }) {
  const capped = Math.min(Math.max(Math.round(count), 0), 5000);
  const overflow = Math.round(count) > 5000 ? Math.round(count) - 5000 : 0;

  let w: number, h: number, gap: number;
  if (compact)            { w = 4;   h = 1.5; gap = 1.5; }
  else if (capped < 50)   { w = 24;  h = 5;   gap = 7;   }
  else if (capped < 200)  { w = 16;  h = 4;   gap = 5;   }
  else if (capped < 500)  { w = 10;  h = 3;   gap = 3;   }
  else if (capped < 1500) { w = 7;   h = 2;   gap = 2;   }
  else                    { w = 4;   h = 1.5; gap = 1.5; }

  w *= scale; h *= scale; gap *= scale;

  const icons = useMemo(() => Array.from({ length: capped }), [capped]);

  return (
    <div style={{ width: '100%', padding: scale > 1 ? 20 : 8, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: gap, opacity: 0.75 }}>
        {icons.map((_, i) => (
          <svg key={i} width={w} height={h} viewBox="0 0 12 3" style={{ display: 'block', flexShrink: 0 }}>
            <rect x="0" y="0" width="2" height="3" fill="#ff6650" />
            <rect x="2" y="0" width="7" height="3" fill="rgba(255,255,255,0.75)" />
            <rect x="9" y="0" width="3" height="3" fill="rgba(255,255,255,0.45)" />
          </svg>
        ))}
      </div>
      {overflow > 0 && (
        <div style={{
          marginTop: scale > 1 ? 16 : 6,
          fontSize: scale > 1 ? 22 : 10,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          + {overflow.toLocaleString()} more
        </div>
      )}
    </div>
  );
}

// ── Breakdown Ladder ───────────────────────────────────────────────────────────

const LADDER_ROWS = [
  { label: 'Per day',   minutes: 1440   },
  { label: 'Per week',  minutes: 10080  },
  { label: 'Per month', minutes: 43200  },
  { label: 'Per year',  minutes: 525600 },
];

function BreakdownLadder({ pm25, minutesOutside, tierColor, scale = 1 }: {
  pm25: number;
  minutesOutside: number;
  tierColor: string;
  scale?: number;
}) {
  const exp = scale > 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: exp ? 14 : 3, marginTop: exp ? 36 : 10 }}>
      {LADDER_ROWS.map(({ label, minutes }) => {
        const cigs = calculateCigarettes(pm25, minutes);
        const sel = minutesOutside === minutes;
        return (
          <div key={minutes} style={{
            display: 'flex',
            alignItems: 'center',
            borderLeft: `${exp ? 6 : 3}px solid ${sel ? tierColor : 'transparent'}`,
            paddingLeft: exp ? 18 : 7,
            opacity: sel ? 1 : 0.38,
          }}>
            <span style={{
              fontSize: exp ? (sel ? 30 : 24) : (sel ? 13 : 11),
              fontWeight: sel ? 700 : 400,
              color: 'white',
              fontFamily: 'system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {label} · {formatCigCount(cigs)} cigs
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── QR Block ───────────────────────────────────────────────────────────────────

function QrBlock({ qrDataUrl, size, exp }: { qrDataUrl: string; size: number; exp?: boolean }) {
  if (!qrDataUrl) return null;
  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <img src={qrDataUrl} alt="" crossOrigin="anonymous" style={{ width: size, height: size, display: 'block', marginLeft: 'auto' }} />
      <div style={{
        fontSize: exp ? 20 : 9,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginTop: exp ? 8 : 3,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Scan to check yours
      </div>
      <div style={{ fontSize: exp ? 18 : 8, color: 'rgba(255,255,255,0.35)', marginTop: exp ? 4 : 1, fontFamily: 'system-ui, sans-serif' }}>
        howmanycigarettes.in
      </div>
    </div>
  );
}

// ── Film Grain ─────────────────────────────────────────────────────────────────

function Grain({ id }: { id: string }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none' }}
      aria-hidden
    >
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

// ── Card Content ───────────────────────────────────────────────────────────────

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
  qrDataUrl: string;
  isExport?: boolean;
}

function CardContent({
  location, distance, station, cigarettes, tierColor, pm25, pm25Label, pm25Color,
  minutesOutside, heroSize, grainId, qrDataUrl, isExport,
}: CardContentProps) {
  const cleanLocation = location.replace(/, Delhi$/i, '');
  const stationLabel = station?.name
    .replace(/,\s*Delhi/i, '')
    .replace(/\s*-\s*(DPCC|CPCB|IITM)/i, '')
    .trim() ?? 'station';
  const cigCount = Math.round(cigarettes);
  const exp = !!isExport;

  const footerInfo = (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: exp ? 22 : 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
        {distance !== undefined ? `${distance.toFixed(1)} km from ${stationLabel}` : 'CPCB monitor'}
      </div>
      <div style={{ fontSize: exp ? 28 : 13, fontWeight: 600 }}>
        <span style={{ color: pm25Color }}>{pm25Label}</span>
        <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: exp ? 12 : 8, fontWeight: 400, fontSize: exp ? 24 : 11 }}>
          PM2.5 {pm25} µg/m³
        </span>
      </div>
    </div>
  );

  const footer = (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      paddingTop: exp ? 40 : 10,
      marginTop: exp ? 0 : 6,
      flexShrink: 0,
    }}>
      {footerInfo}
      {exp && <QrBlock qrDataUrl={qrDataUrl} size={140} exp />}
    </div>
  );

  if (exp) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <Grain id={grainId} />
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          height: '100%',
          padding: '100px 96px',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 60, fontFamily: 'system-ui, sans-serif' }}>
            Your Air · Delhi NCR
          </div>
          <div style={{ fontSize: heroSize, fontWeight: 700, lineHeight: 0.88, color: tierColor, fontFamily: 'system-ui, sans-serif', marginBottom: 28 }}>
            {formatCigCount(cigarettes)}
          </div>
          <div style={{ fontSize: 52, fontWeight: 400, color: 'rgba(255,255,255,0.88)', fontFamily: 'system-ui, sans-serif', marginBottom: 16 }}>
            cigarettes
          </div>
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.62)', fontFamily: 'system-ui, sans-serif', lineHeight: 1.4, maxWidth: 800, marginBottom: 24 }}>
            in {formatDuration(minutesOutside)} of breathing the air in{' '}
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{cleanLocation}</span>
          </div>
          <CigaretteGrid count={cigCount} scale={2.2} />
          <BreakdownLadder pm25={pm25} minutesOutside={minutesOutside} tierColor={tierColor} scale={2.2} />
          <div style={{ flex: 1 }} />
          {footer}
        </div>
      </div>
    );
  }

  // Inline — responsive: single-column on mobile, 2-column on desktop
  return (
    <div className="relative w-full overflow-hidden sm:h-full">
      <Grain id={grainId} />

      {/* ── MOBILE layout (<640px): single column, auto height ───────────── */}
      <div
        className="block sm:hidden relative z-[1] flex flex-col gap-2"
        style={{ padding: '18px 20px 16px', fontFamily: 'system-ui, sans-serif' }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Your Air · Delhi NCR
        </div>
        <div style={{ fontSize: 'clamp(48px, 15vw, 68px)', fontWeight: 700, lineHeight: 0.88, color: tierColor }}>
          {formatCigCount(cigarettes)}
        </div>
        <div style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.88)' }}>cigarettes</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.4 }}>
          in {formatDuration(minutesOutside)} of breathing the air in{' '}
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{cleanLocation}</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          {distance !== undefined ? `${distance.toFixed(1)} km from ${stationLabel}` : 'CPCB monitor'}
        </div>
        <BreakdownLadder pm25={pm25} minutesOutside={minutesOutside} tierColor={tierColor} />
        <div style={{ overflow: 'hidden', maxHeight: 96 }}>
          <CigaretteGrid count={cigCount} compact />
        </div>
        {qrDataUrl && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <QrBlock qrDataUrl={qrDataUrl} size={56} />
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, marginTop: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: pm25Color }}>{pm25Label}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>
            PM2.5 {pm25} µg/m³
          </span>
        </div>
      </div>

      {/* ── DESKTOP layout (≥640px): 2-column, fills sm:aspect-video ────────── */}
      <div
        className="hidden sm:flex flex-col absolute inset-0 z-[1]"
        style={{ padding: '22px 28px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}
      >
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 10, flexShrink: 0,
        }}>
          Your Air · Delhi NCR
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: 'clamp(52px, 14vw, 140px)', fontWeight: 700, lineHeight: 0.88, color: tierColor, marginBottom: 6 }}>
              {formatCigCount(cigarettes)}
            </div>
            <div style={{ fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.88)', marginBottom: 6 }}>
              cigarettes
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.4 }}>
              in {formatDuration(minutesOutside)} of breathing the air in{' '}
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{cleanLocation}</span>
            </div>
            <BreakdownLadder pm25={pm25} minutesOutside={minutesOutside} tierColor={tierColor} />
            <div style={{ flex: 1 }} />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
              <CigaretteGrid count={cigCount} />
            </div>
            <QrBlock qrDataUrl={qrDataUrl} size={60} />
          </div>
        </div>

        {footer}
      </div>
    </div>
  );
}

// ── ShareCard ──────────────────────────────────────────────────────────────────

export function ShareCard({ location, distance, station, minutesOutside }: ShareCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const inlineGrainId = useId().replace(/:/g, '');
  const exportGrainId = useId().replace(/:/g, '');

  const pm25 = station?.pm25 || 0;
  const cigarettes = calculateCigarettes(pm25, minutesOutside);
  const cigaretteTier = getCigaretteTier(cigarettes);
  const pm25Tier = getPm25Tier(pm25);
  const gradient = getCardGradient(pm25Tier.label);
  const cleanLocation = location.replace(/, Delhi$/i, '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (cleanLocation) params.set('location', cleanLocation);
    params.set('time', String(minutesOutside));
    const url = `${window.location.origin}/?${params.toString()}`;
    QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(setQrDataUrl).catch(console.error);
  }, [cleanLocation, minutesOutside]);

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
    qrDataUrl,
  };

  const generatePng = async (): Promise<string | null> => {
    if (!exportRef.current) return null;
    await document.fonts.ready;
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    return domToPng(exportRef.current, {
      scale: 2,
      width: 1080,
      height: 1920,
      backgroundColor: '#0a0a0a',
      features: { removeControlCharacter: false },
      font: { loadingTimeout: 5000 },
    });
  };

  const handleSave = async () => {
    setGenerating(true);
    try {
      const dataUrl = await generatePng();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `delhi-air-${cleanLocation.replace(/\s+/g, '-').toLowerCase()}.png`;
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
            text: `I "smoke" ${formatCigCount(cigarettes)} cigarettes ${formatDuration(minutesOutside) === 'a year' ? 'a year' : `in ${formatDuration(minutesOutside)}`} just by breathing the air in ${cleanLocation}. Check yours →`,
          });
          return;
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
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
        className="w-full rounded-2xl overflow-hidden sm:aspect-video"
        style={{ background: gradient }}
      >
        <CardContent {...sharedProps} heroSize={140} grainId={inlineGrainId} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
        <p className="text-gray-600 text-xs">
          Formula: (PM2.5 / 22) × (days) × 1.5
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            <Download size={16} />
            {generating ? 'Generating…' : 'Download'}
          </button>
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
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
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <CardContent {...sharedProps} heroSize={240} grainId={exportGrainId} isExport />
      </div>

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
