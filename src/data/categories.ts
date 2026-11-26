import type { PlaceCategory } from '../types/place';

export interface CategoryMeta {
  id: PlaceCategory;
  label: string;
  pluralLabel: string;
  color: string;
  softBg: string;
  emoji: string;
}

export const CATEGORIES: Record<PlaceCategory, CategoryMeta> = {
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    pluralLabel: 'Cafes',
    color: '#C67D3B',
    softBg: '#F9EFE4',
    emoji: '☕',
  },
  bookshop: {
    id: 'bookshop',
    label: 'Bookshop',
    pluralLabel: 'Bookshops',
    color: '#2E6F5E',
    softBg: '#E6F2EE',
    emoji: '📚',
  },
  charity: {
    id: 'charity',
    label: 'Charity Shop',
    pluralLabel: 'Charity Shops',
    color: '#C44569',
    softBg: '#FBEAF0',
    emoji: '🛍️',
  },
  antiques: {
    id: 'antiques',
    label: 'Antique Shop',
    pluralLabel: 'Antiques',
    color: '#7B4B94',
    softBg: '#F2EBF7',
    emoji: '🏺',
  },
};

export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORIES.cafe,
  CATEGORIES.bookshop,
  CATEGORIES.charity,
  CATEGORIES.antiques,
];
