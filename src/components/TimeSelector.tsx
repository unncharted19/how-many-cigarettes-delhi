interface TimeSelectorProps {
  minutes: number;
  onChange: (minutes: number) => void;
}

const timeOptions = [
  { label: '1 day',   shortLabel: '1d', minutes: 1440   },
  { label: '1 week',  shortLabel: '1w', minutes: 10080  },
  { label: '1 month', shortLabel: '1m', minutes: 43200  },
  { label: '1 year',  shortLabel: '1y', minutes: 525600 },
];

export function TimeSelector({ minutes, onChange }: TimeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-900 rounded-lg p-1">
      {timeOptions.map(option => (
        <button
          key={option.minutes}
          onClick={() => onChange(option.minutes)}
          className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-md font-medium transition-colors min-h-[36px] ${
            minutes === option.minutes
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <span className="sm:hidden">{option.shortLabel}</span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
