export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  pm25: number; // µg/m³ - placeholder values
}

export const stations: Station[] = [
  { id: '1', name: 'Anand Vihar', lat: 28.6519, lng: 77.3156, pm25: 342 },
  { id: '2', name: 'ITO', lat: 28.6315, lng: 77.2407, pm25: 287 },
  { id: '3', name: 'Dwarka Sec-8', lat: 28.5856, lng: 77.0614, pm25: 198 },
  { id: '4', name: 'Rohini', lat: 28.7315, lng: 77.0708, pm25: 256 },
  { id: '5', name: 'Lodhi Road', lat: 28.5918, lng: 77.2306, pm25: 145 },
  { id: '6', name: 'Bawana', lat: 28.7806, lng: 77.0374, pm25: 310 },
  { id: '7', name: 'JNU', lat: 28.5417, lng: 77.1688, pm25: 124 },
  { id: '8', name: 'IGI Airport', lat: 28.5562, lng: 77.1000, pm25: 167 },
  { id: '9', name: 'Mundka', lat: 28.6815, lng: 77.0618, pm25: 298 },
  { id: '10', name: 'Jahangirpuri', lat: 28.7279, lng: 77.1543, pm25: 234 },
  { id: '11', name: 'Punjabi Bagh', lat: 28.6652, lng: 77.1310, pm25: 278 },
  { id: '12', name: 'R.K. Puram', lat: 28.5734, lng: 77.1874, pm25: 186 },
  { id: '13', name: 'Shadipur', lat: 28.6487, lng: 77.1523, pm25: 245 },
  { id: '14', name: 'Wazirpur', lat: 28.7168, lng: 77.1561, pm25: 289 },
  { id: '15', name: 'Vivek Vihar', lat: 28.6758, lng: 77.3271, pm25: 267 },
  { id: '16', name: 'Ashok Vihar', lat: 28.6910, lng: 77.1701, pm25: 223 },
  { id: '17', name: 'Burari', lat: 28.7539, lng: 77.2057, pm25: 251 },
  { id: '18', name: 'IHBAS', lat: 28.7134, lng: 77.3057, pm25: 268 },
  { id: '19', name: 'Karni Nagar', lat: 28.6148, lng: 77.0935, pm25: 189 },
  { id: '20', name: 'CRRI', lat: 28.6078, lng: 77.2267, pm25: 176 },
  { id: '21', name: 'Najafgarh', lat: 28.6097, lng: 76.9789, pm25: 312 },
  { id: '22', name: 'Narela', lat: 28.8452, lng: 77.0936, pm25: 278 },
  { id: '23', name: ' Sonia Vihar', lat: 28.7452, lng: 77.2654, pm25: 289 },
  { id: '24', name: 'Siri Fort', lat: 28.5508, lng: 77.2167, pm25: 134 },
  { id: '25', name: 'Mandir Marg', lat: 28.6363, lng: 77.2041, pm25: 156 },
  { id: '26', name: 'Civil Lines', lat: 28.6913, lng: 77.2213, pm25: 198 },
  { id: '27', name: 'DTI', lat: 28.4980, lng: 77.0846, pm25: 167 },
  { id: '28', name: 'DTU', lat: 28.7501, lng: 77.1122, pm25: 213 },
  { id: '29', name: 'Pusa', lat: 28.5899, lng: 77.0953, pm25: 145 },
  { id: '30', name: 'Okhla', lat: 28.5282, lng: 77.2587, pm25: 234 },
];

export const labeledStations = new Set([
  'Anand Vihar',
  'ITO',
  'Dwarka Sec-8',
  'Rohini',
  'Lodhi Road',
  'Bawana',
  'JNU',
  'IGI Airport',
  'Mundka',
  'Jahangirpuri',
]);
