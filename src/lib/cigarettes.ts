export interface Pm25Tier {
  min: number;
  max: number;
  color: string;
  label: string;
}

export const pm25Tiers: Pm25Tier[] = [
  { min: 0, max: 30, color: '#16a34a', label: 'Good' },
  { min: 30, max: 60, color: '#65a30d', label: 'Satisfactory' },
  { min: 60, max: 90, color: '#ca8a04', label: 'Moderate' },
  { min: 90, max: 120, color: '#ea580c', label: 'Poor' },
  { min: 120, max: 250, color: '#dc2626', label: 'Very Poor' },
  { min: 250, max: Infinity, color: '#7f1d1d', label: 'Severe' },
];

export function calculateCigarettes(pm25: number, minutesOutside: number): number {
  return (pm25 / 22) * (minutesOutside / 1440) * 1.5;
}

export function getCigaretteTier(cigarettes: number): { color: string; label: string } {
  const tiers = [
    { min: 0, max: 0.5, color: '#16a34a', label: 'Clean' },
    { min: 0.5, max: 1, color: '#65a30d', label: 'Moderate' },
    { min: 1, max: 1.5, color: '#ca8a04', label: 'Poor' },
    { min: 1.5, max: 2.5, color: '#ea580c', label: 'Unhealthy' },
    { min: 2.5, max: 4, color: '#dc2626', label: 'Very Unhealthy' },
    { min: 4, max: Infinity, color: '#7f1d1d', label: 'Hazardous' },
  ];
  for (const tier of tiers) {
    if (cigarettes >= tier.min && cigarettes < tier.max) {
      return tier;
    }
  }
  return tiers[tiers.length - 1];
}

export function getPm25Tier(pm25: number): Pm25Tier {
  for (const tier of pm25Tiers) {
    if (pm25 >= tier.min && pm25 < tier.max) {
      return tier;
    }
  }
  return pm25Tiers[pm25Tiers.length - 1];
}

export function getPm25TierColor(pm25: number): string {
  return getPm25Tier(pm25).color;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 1440) return 'a full day';
  const hours = minutes / 60;
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
