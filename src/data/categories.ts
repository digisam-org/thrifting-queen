import type { PlaceCategory } from '../types/place';

export interface CategoryMeta {
  id: PlaceCategory;
  label: string;
  pluralLabel: string;
  color: string;
  colorDark: string;
  softBg: string;
  tintBorder: string;
  emoji: string;
}

export const CATEGORIES: Record<PlaceCategory, CategoryMeta> = {
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    pluralLabel: 'Cafes',
    color: '#A85A32',
    colorDark: '#874321',
    softBg: '#FBF2EB',
    tintBorder: 'rgba(168, 90, 50, 0.22)',
    emoji: '☕',
  },
  bakery: {
    id: 'bakery',
    label: 'Bakery',
    pluralLabel: 'Bakeries',
    color: '#D4882A',
    colorDark: '#B36C18',
    softBg: '#FDF5E6',
    tintBorder: 'rgba(212, 136, 42, 0.24)',
    emoji: '🥐',
  },
  matcha: {
    id: 'matcha',
    label: 'Matcha Spot',
    pluralLabel: 'Matcha',
    color: '#4F8A47',
    colorDark: '#3A6B34',
    softBg: '#EDF6EB',
    tintBorder: 'rgba(79, 138, 71, 0.24)',
    emoji: '🍵',
  },
  bookshop: {
    id: 'bookshop',
    label: 'Bookshop',
    pluralLabel: 'Bookshops',
    color: '#1F6B6B',
    colorDark: '#155050',
    softBg: '#E7F4F4',
    tintBorder: 'rgba(31, 107, 107, 0.22)',
    emoji: '📚',
  },
  charity: {
    id: 'charity',
    label: 'Charity Shop',
    pluralLabel: 'Charity Shops',
    color: '#C8466B',
    colorDark: '#A13152',
    softBg: '#FCEEF2',
    tintBorder: 'rgba(200, 70, 107, 0.22)',
    emoji: '🛍️',
  },
  antiques: {
    id: 'antiques',
    label: 'Antique Shop',
    pluralLabel: 'Antiques',
    color: '#784898',
    colorDark: '#5B3277',
    softBg: '#F4EEFA',
    tintBorder: 'rgba(120, 72, 152, 0.22)',
    emoji: '🏺',
  },
};

export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORIES.cafe,
  CATEGORIES.bakery,
  CATEGORIES.matcha,
  CATEGORIES.bookshop,
  CATEGORIES.charity,
  CATEGORIES.antiques,
];
