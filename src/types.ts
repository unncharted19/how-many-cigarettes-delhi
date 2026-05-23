import { Station } from './hooks/useDelhiAQI';

export interface LocationResult {
  name: string;
  station: Station;
  distanceKm: number;
  pincode?: string;
}
