export interface CigaretteTier {
  min: number;
  max: number;
  color: string;
  label: string;
}

export const cigaretteTiers: CigaretteTier[] = [
  { min: 0, max: 0.5, color: '#16a34a', label: 'Clean' },
  { min: 0.5, max: 1, color: '#65a30d', label: 'Moderate' },
  { min: 1, max: 1.5, color: '#ca8a04', label: 'Poor' },
  { min: 1.5, max: 2.5, color: '#ea580c', label: 'Unhealthy' },
  { min: 2.5, max: 4, color: '#dc2626', label: 'Very Unhealthy' },
  { min: 4, max: Infinity, color: '#7f1d1d', label: 'Hazardous' },
];

export function calculateCigarettes(pm25: number, minutesOutside: number): number {
  return (pm25 / 22) * (minutesOutside / 1440) * 1.5;
}

export function getTier(cigarettes: number): CigaretteTier {
  for (const tier of cigaretteTiers) {
    if (cigarettes >= tier.min && cigarettes < tier.max) {
      return tier;
    }
  }
  return cigaretteTiers[cigaretteTiers.length - 1];
}

export function getTierColor(cigarettes: number): string {
  return getTier(cigarettes).color;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  if (hours === 1) {
    return '1 hour';
  }
  if (hours === 6) {
    return '6 hours';
  }
  return `${hours} hours`;
}
