interface TimeSelectorProps {
  minutes: number;
  onChange: (minutes: number) => void;
}

const timeOptions = [
  { label: '3h',  minutes: 180  },
  { label: '6h',  minutes: 360  },
  { label: '12h', minutes: 720  },
  { label: '24h', minutes: 1440 },
];

export function TimeSelector({ minutes, onChange }: TimeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
      {timeOptions.map(option => (
        <button
          key={option.minutes}
          onClick={() => onChange(option.minutes)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            minutes === option.minutes
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
