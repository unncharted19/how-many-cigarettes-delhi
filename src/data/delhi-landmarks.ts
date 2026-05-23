export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  type: 'education' | 'landmark' | 'area' | 'mall' | 'hospital';
  aliases?: string[];
}

export const DELHI_LANDMARKS: Landmark[] = [
  { name: 'IIT Delhi',            lat: 28.5450, lng: 77.1925, type: 'education',  aliases: ['IIT'] },
  { name: 'AIIMS',                lat: 28.5672, lng: 77.2100, type: 'hospital',   aliases: ['All India Institute'] },
  { name: 'JNU',                  lat: 28.5402, lng: 77.1662, type: 'education' },
  { name: 'DTU',                  lat: 28.7501, lng: 77.1177, type: 'education' },
  { name: 'Jamia Millia Islamia', lat: 28.5610, lng: 77.2812, type: 'education',  aliases: ['Jamia'] },
  { name: 'DU North Campus',      lat: 28.6863, lng: 77.2102, type: 'education',  aliases: ['Delhi University'] },
  { name: 'Red Fort',             lat: 28.6562, lng: 77.2410, type: 'landmark' },
  { name: 'India Gate',           lat: 28.6129, lng: 77.2295, type: 'landmark' },
  { name: 'Qutub Minar',          lat: 28.5245, lng: 77.1855, type: 'landmark' },
  { name: 'Lotus Temple',         lat: 28.5535, lng: 77.2588, type: 'landmark' },
  { name: 'Akshardham',           lat: 28.6127, lng: 77.2773, type: 'landmark' },
  { name: 'Connaught Place',      lat: 28.6315, lng: 77.2167, type: 'area',       aliases: ['CP', 'Rajiv Chowk'] },
  { name: 'Khan Market',          lat: 28.5993, lng: 77.2275, type: 'area' },
  { name: 'Hauz Khas',            lat: 28.5535, lng: 77.1949, type: 'area',       aliases: ['HKV'] },
  { name: 'Lajpat Nagar',         lat: 28.5705, lng: 77.2426, type: 'area' },
  { name: 'Greater Kailash',      lat: 28.5380, lng: 77.2462, type: 'area',       aliases: ['GK', 'GK1', 'GK2'] },
  { name: 'Saket',                lat: 28.5244, lng: 77.2066, type: 'area' },
  { name: 'Dwarka',               lat: 28.5921, lng: 77.0460, type: 'area' },
  { name: 'Rohini',               lat: 28.7041, lng: 77.1025, type: 'area' },
  { name: 'IGI Airport',          lat: 28.5562, lng: 77.0999, type: 'landmark',   aliases: ['Delhi Airport', 'T3'] },
  { name: 'Select Citywalk',      lat: 28.5283, lng: 77.2192, type: 'mall' },
  { name: 'Karol Bagh',           lat: 28.6519, lng: 77.1909, type: 'area' },
  // NCR
  { name: 'Cyber Hub',            lat: 28.4946, lng: 77.0879, type: 'area',      aliases: ['DLF Cyber City', 'Cyber City'] },
  { name: 'Cyber City Gurgaon',   lat: 28.4946, lng: 77.0879, type: 'area' },
  { name: 'Sector 18 Noida',      lat: 28.5715, lng: 77.3236, type: 'area',      aliases: ['Noida Sector 18', 'Atta Market'] },
  { name: 'Noida City Centre',    lat: 28.5759, lng: 77.3560, type: 'area' },
  { name: 'Indira Gandhi Airport', lat: 28.5562, lng: 77.0999, type: 'landmark' },
  { name: 'MG Road Gurgaon',      lat: 28.4799, lng: 77.0789, type: 'area' },
  { name: 'Sohna Road',           lat: 28.4097, lng: 77.0344, type: 'area' },
  { name: 'Sector 62 Noida',      lat: 28.6213, lng: 77.3713, type: 'area' },
];
