interface TimeSelectorProps {
  minutes: number;
  onChange: (minutes: number) => void;
}

const timeOptions = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
];

export function TimeSelector({ minutes, onChange }: TimeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
      {timeOptions.map((option) => (
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
