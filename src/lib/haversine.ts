import { Station } from '../hooks/useDelhiAQI';
import { Area } from '../data/areas';

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function findNearestStation(lat: number, lng: number, stations: Station[]): Station {
  let nearest = stations[0];
  let minDist = haversineDistance(lat, lng, nearest.lat, nearest.lng);
  for (let i = 1; i < stations.length; i++) {
    const dist = haversineDistance(lat, lng, stations[i].lat, stations[i].lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = stations[i];
    }
  }
  return nearest;
}

export function findAreaByPincode(pincode: string, areas: Area[]): Area | null {
  return areas.find((a) => a.pincode === pincode) || null;
}

export function findAreaByName(query: string, areas: Area[]): Area | null {
  const lowerQuery = query.toLowerCase();
  return areas.find((a) => a.name.toLowerCase().includes(lowerQuery)) || null;
}
