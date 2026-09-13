/** Curated point locations, not boundaries or addresses. No runtime lookup.
 * Extracted 2026-09-13; source snapshots, licences and selection notes:
 * docs/hackathon/PERSONAL-EVIDENCE.md. Coordinates are copied, never geocoded.
 */
export type CataloguePlace = Readonly<{
  id: string;
  label: string;
  region: string;
  lat: number;
  lon: number;
  source: 'natural-earth' | 'geonames';
  sourceId: string;
  searchNames: string;
}>;

export const placeCatalogue: readonly CataloguePlace[] = Object.freeze([
  Object.freeze({"id": "gn-1881952", "label": "Jurong East", "region": "Singapore", "lat": 1.32888, "lon": 103.73995, "source": "geonames", "sourceId": "1881952", "searchNames": "Jurong East"}),
  Object.freeze({"id": "gn-1882020", "label": "Kampong Gelam", "region": "Singapore", "lat": 1.30222, "lon": 103.86444, "source": "geonames", "sourceId": "1882020", "searchNames": "Kampong Glam"}),
  Object.freeze({"id": "gn-1882075", "label": "Punggol", "region": "Singapore", "lat": 1.39278, "lon": 103.9, "source": "geonames", "sourceId": "1882075", "searchNames": "Punggol"}),
  Object.freeze({"id": "gn-1882077", "label": "Queenstown", "region": "Singapore", "lat": 1.29944, "lon": 103.80583, "source": "geonames", "sourceId": "1882077", "searchNames": "Queenstown"}),
  Object.freeze({"id": "ne-1159151627", "label": "Singapore", "region": "Singapore", "lat": 1.294979, "lon": 103.853875, "source": "natural-earth", "sourceId": "1159151627", "searchNames": "Singapore"}),
  Object.freeze({"id": "gn-1882114", "label": "Tampines", "region": "Singapore", "lat": 1.37472, "lon": 103.94528, "source": "geonames", "sourceId": "1882114", "searchNames": "Tampines"}),
  Object.freeze({"id": "gn-1882147", "label": "Toa Payoh", "region": "Singapore", "lat": 1.33611, "lon": 103.85028, "source": "geonames", "sourceId": "1882147", "searchNames": "Toa Payoh"}),
  Object.freeze({"id": "gn-1882316", "label": "Woodlands", "region": "Singapore", "lat": 1.43801, "lon": 103.78877, "source": "geonames", "sourceId": "1882316", "searchNames": "Woodlands"}),
  Object.freeze({"id": "ne-1159151703", "label": "Auckland", "region": "New Zealand", "lat": -36.848055, "lon": 174.763027, "source": "natural-earth", "sourceId": "1159151703", "searchNames": "Auckland"}),
  Object.freeze({"id": "ne-1159151509", "label": "Bangkok", "region": "Thailand", "lat": 13.751945, "lon": 100.514699, "source": "natural-earth", "sourceId": "1159151509", "searchNames": "Bangkok"}),
  Object.freeze({"id": "ne-1159151595", "label": "Beijing", "region": "China", "lat": 39.90172, "lon": 116.394201, "source": "natural-earth", "sourceId": "1159151595", "searchNames": "Beijing"}),
  Object.freeze({"id": "ne-1159151529", "label": "Berlin", "region": "Germany", "lat": 52.523764, "lon": 13.399603, "source": "natural-earth", "sourceId": "1159151529", "searchNames": "Berlin"}),
  Object.freeze({"id": "ne-1159151601", "label": "Bogotá", "region": "Colombia", "lat": 4.598369, "lon": -74.08529, "source": "natural-earth", "sourceId": "1159151601", "searchNames": "Bogota"}),
  Object.freeze({"id": "ne-1159151559", "label": "Buenos Aires", "region": "Argentina", "lat": -34.610715, "lon": -58.432513, "source": "natural-earth", "sourceId": "1159151559", "searchNames": "Buenos Aires"}),
  Object.freeze({"id": "ne-1159151603", "label": "Cairo", "region": "Egypt", "lat": 30.051906, "lon": 31.248022, "source": "natural-earth", "sourceId": "1159151603", "searchNames": "Cairo"}),
  Object.freeze({"id": "ne-1159151583", "label": "Cape Town", "region": "South Africa", "lat": -33.918065, "lon": 18.433042, "source": "natural-earth", "sourceId": "1159151583", "searchNames": "Cape Town"}),
  Object.freeze({"id": "ne-1159150719", "label": "Colombo", "region": "Sri Lanka", "lat": 6.931966, "lon": 79.857751, "source": "natural-earth", "sourceId": "1159150719", "searchNames": "Colombo"}),
  Object.freeze({"id": "ne-1159151467", "label": "Dhaka", "region": "Bangladesh", "lat": 23.725006, "lon": 90.406634, "source": "natural-earth", "sourceId": "1159151467", "searchNames": "Dhaka"}),
  Object.freeze({"id": "ne-1159151497", "label": "Dubai", "region": "United Arab Emirates", "lat": 25.214912, "lon": 55.286946, "source": "natural-earth", "sourceId": "1159151497", "searchNames": "Dubai"}),
  Object.freeze({"id": "ne-1159151251", "label": "Hanoi", "region": "Vietnam", "lat": 21.035273, "lon": 105.848068, "source": "natural-earth", "sourceId": "1159151251", "searchNames": "Hanoi"}),
  Object.freeze({"id": "ne-1159151629", "label": "Hong Kong", "region": "Hong Kong", "lat": 22.306927, "lon": 114.183064, "source": "natural-earth", "sourceId": "1159151629", "searchNames": "Hong Kong"}),
  Object.freeze({"id": "ne-1159151579", "label": "Istanbul", "region": "Turkey", "lat": 41.017602, "lon": 28.974277, "source": "natural-earth", "sourceId": "1159151579", "searchNames": "Istanbul"}),
  Object.freeze({"id": "ne-1159151599", "label": "Jakarta", "region": "Indonesia", "lat": -6.172472, "lon": 106.827492, "source": "natural-earth", "sourceId": "1159151599", "searchNames": "Jakarta"}),
  Object.freeze({"id": "ne-1159150655", "label": "Kathmandu", "region": "Nepal", "lat": 27.718638, "lon": 85.314696, "source": "natural-earth", "sourceId": "1159150655", "searchNames": "Kathmandu"}),
  Object.freeze({"id": "ne-1159151317", "label": "Kuala Lumpur", "region": "Malaysia", "lat": 3.139797, "lon": 101.688699, "source": "natural-earth", "sourceId": "1159151317", "searchNames": "Kuala Lumpur"}),
  Object.freeze({"id": "ne-1159151591", "label": "Lagos", "region": "Nigeria", "lat": 6.445208, "lon": 3.389585, "source": "natural-earth", "sourceId": "1159151591", "searchNames": "Lagos"}),
  Object.freeze({"id": "ne-1159151511", "label": "Lima", "region": "Peru", "lat": -12.046067, "lon": -77.052008, "source": "natural-earth", "sourceId": "1159151511", "searchNames": "Lima"}),
  Object.freeze({"id": "ne-1159151273", "label": "Lisbon", "region": "Portugal", "lat": 38.724669, "lon": -9.146812, "source": "natural-earth", "sourceId": "1159151273", "searchNames": "Lisbon"}),
  Object.freeze({"id": "ne-1159151577", "label": "London", "region": "United Kingdom", "lat": 51.501941, "lon": -0.118668, "source": "natural-earth", "sourceId": "1159151577", "searchNames": "London"}),
  Object.freeze({"id": "ne-1159151525", "label": "Manila", "region": "Philippines", "lat": 14.606105, "lon": 120.980271, "source": "natural-earth", "sourceId": "1159151525", "searchNames": "Manila"}),
  Object.freeze({"id": "ne-1159151565", "label": "Melbourne", "region": "Australia", "lat": -37.818086, "lon": 144.97307, "source": "natural-earth", "sourceId": "1159151565", "searchNames": "Melbourne"}),
  Object.freeze({"id": "ne-1159151587", "label": "Mexico City", "region": "Mexico", "lat": 19.444388, "lon": -99.132934, "source": "natural-earth", "sourceId": "1159151587", "searchNames": "Mexico City"}),
  Object.freeze({"id": "ne-1159151611", "label": "Mumbai", "region": "India", "lat": 19.068408, "lon": 72.875839, "source": "natural-earth", "sourceId": "1159151611", "searchNames": "Mumbai"}),
  Object.freeze({"id": "ne-1159151597", "label": "Nairobi", "region": "Kenya", "lat": -1.281401, "lon": 36.814711, "source": "natural-earth", "sourceId": "1159151597", "searchNames": "Nairobi"}),
  Object.freeze({"id": "ne-1159151541", "label": "New Delhi", "region": "India", "lat": 28.600023, "lon": 77.19998, "source": "natural-earth", "sourceId": "1159151541", "searchNames": "New Delhi"}),
  Object.freeze({"id": "ne-1159151575", "label": "New York", "region": "United States", "lat": 40.721562, "lon": -73.995718, "source": "natural-earth", "sourceId": "1159151575", "searchNames": "New York"}),
  Object.freeze({"id": "ne-1159151613", "label": "Paris", "region": "France", "lat": 48.858092, "lon": 2.352992, "source": "natural-earth", "sourceId": "1159151613", "searchNames": "Paris"}),
  Object.freeze({"id": "ne-1159151593", "label": "Rome", "region": "Italy", "lat": 41.897902, "lon": 12.481313, "source": "natural-earth", "sourceId": "1159151593", "searchNames": "Rome"}),
  Object.freeze({"id": "ne-1159151479", "label": "San Francisco", "region": "United States", "lat": 37.784263, "lon": -122.3996, "source": "natural-earth", "sourceId": "1159151479", "searchNames": "San Francisco"}),
  Object.freeze({"id": "ne-1159151621", "label": "São Paulo", "region": "Brazil", "lat": -23.556734, "lon": -46.626966, "source": "natural-earth", "sourceId": "1159151621", "searchNames": "Sao Paulo"}),
  Object.freeze({"id": "ne-1159151523", "label": "Seoul", "region": "South Korea", "lat": 37.568295, "lon": 126.997785, "source": "natural-earth", "sourceId": "1159151523", "searchNames": "Seoul"}),
  Object.freeze({"id": "ne-1159151605", "label": "Shanghai", "region": "China", "lat": 31.218398, "lon": 121.434559, "source": "natural-earth", "sourceId": "1159151605", "searchNames": "Shanghai"}),
  Object.freeze({"id": "ne-1159151507", "label": "Stockholm", "region": "Sweden", "lat": 59.324127, "lon": 18.0663, "source": "natural-earth", "sourceId": "1159151507", "searchNames": "Stockholm"}),
  Object.freeze({"id": "ne-1159151623", "label": "Sydney", "region": "Australia", "lat": -33.871373, "lon": 151.212548, "source": "natural-earth", "sourceId": "1159151623", "searchNames": "Sydney"}),
  Object.freeze({"id": "ne-1159151567", "label": "Taipei", "region": "Taiwan", "lat": 25.035833, "lon": 121.568333, "source": "natural-earth", "sourceId": "1159151567", "searchNames": "Taipei"}),
  Object.freeze({"id": "ne-1159151609", "label": "Tokyo", "region": "Japan", "lat": 35.686963, "lon": 139.749462, "source": "natural-earth", "sourceId": "1159151609", "searchNames": "Tokyo"}),
  Object.freeze({"id": "ne-1159151557", "label": "Toronto", "region": "Canada", "lat": 43.664645, "lon": -79.389459, "source": "natural-earth", "sourceId": "1159151557", "searchNames": "Toronto"}),
  Object.freeze({"id": "ne-1159151555", "label": "Vancouver", "region": "Canada", "lat": 49.275362, "lon": -123.12359, "source": "natural-earth", "sourceId": "1159151555", "searchNames": "Vancouver"}),
]);

const byId = new Map(placeCatalogue.map(place => [place.id, place]));

export function cataloguePlace(id: string): CataloguePlace | undefined {
  return byId.get(id);
}

export function catalogueLabel(place: CataloguePlace): string {
  return place.label === place.region ? place.label : `${place.label}, ${place.region}`;
}
