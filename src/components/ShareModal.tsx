import { useEffect } from 'react';
import { X, Download, MessageCircle, Linkedin, Twitter } from 'lucide-react';
import { formatCigCount, formatDuration } from '../lib/cigarettes';

interface ShareModalProps {
  cigarettes: number;
  location: string;
  pm25: number;
  minutesOutside: number;
  onClose: () => void;
  onDownload: () => void;
}

export function ShareModal({ cigarettes, location, pm25, minutesOutside, onClose, onDownload }: ShareModalProps) {
  const cleanLocation = location.replace(/, Delhi$/i, '');
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://howmanycigarettes.in';
  const durationLabel = formatDuration(minutesOutside);
  const shareText = `I "smoke" ${formatCigCount(cigarettes)} cigarettes ${durationLabel === 'a year' ? 'a year' : `in ${durationLabel}`} just by breathing the air in ${cleanLocation}. Delhi NCR PM2.5: ${pm25} µg/m³. Check yours →`;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const buttons = [
    {
      label: 'Download Image',
      icon: <Download size={18} />,
      color: '#374151',
      onClick: () => { onDownload(); onClose(); },
    },
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={18} />,
      color: '#16a34a',
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank'),
    },
    {
      label: 'LinkedIn',
      icon: <Linkedin size={18} />,
      color: '#0a66c2',
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      label: 'Twitter / X',
      icon: <Twitter size={18} />,
      color: '#18181b',
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="text-white font-semibold text-lg mb-1">Share your result</h2>
        <p className="text-gray-500 text-sm mb-5">
          {formatCigCount(cigarettes)} cigarettes in {durationLabel} · {cleanLocation}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {buttons.map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: btn.color }}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>

        <p className="text-gray-600 text-xs text-center">
          Download the image first, then upload manually to Instagram
        </p>
      </div>
    </div>
  );
}
