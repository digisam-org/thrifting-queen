export type PlaceCategory = 'cafe' | 'bookshop' | 'charity' | 'antiques';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  openingHours?: string;
  website?: string;
  phone?: string;
  description?: string;
  personalNote?: string;
  isPersonalPick?: boolean;
  source: 'osm' | 'seed' | 'personal';
}

export interface PlacesDataset {
  version: number;
  generatedAt: string;
  region: string;
  counts?: Partial<Record<PlaceCategory, number>>;
  places: Place[];
}

export interface PersonalPicksOverlay {
  places: Omit<Place, 'source'>[];
  notesByPlaceId: Record<string, string>;
}

export interface UserPlaceRecord {
  favourite: boolean;
  visited: boolean;
  visitedAt?: string;
  note?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}
