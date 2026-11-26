import { Heart, Search, X } from 'lucide-react';
import { CATEGORY_LIST } from '../data/categories';
import type { PlaceCategory } from '../types/place';

interface CategoryFilterBarProps {
  activeCategories: Set<PlaceCategory>;
  searchQuery: string;
  favouritesOnly: boolean;
  totalVisible: number;
  onToggleCategory: (category: PlaceCategory) => void;
  onSelectAllCategories: () => void;
  onSearchChange: (value: string) => void;
  onToggleFavouritesOnly: () => void;
}

export function CategoryFilterBar({
  activeCategories,
  searchQuery,
  favouritesOnly,
  totalVisible,
  onToggleCategory,
  onSelectAllCategories,
  onSearchChange,
  onToggleFavouritesOnly,
}: CategoryFilterBarProps) {
  const allSelected = activeCategories.size === CATEGORY_LIST.length && !favouritesOnly;

  return (
    <header className="top-overlay">
      <div className="search-card">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search cafes, bookshops, towns..."
          className="search-input"
          aria-label="Search places in Scotland"
        />
        {searchQuery ? (
          <button
            type="button"
            className="icon-clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : (
          <span className="count-pill">{totalVisible}</span>
        )}
      </div>

      <div className="chips-row" role="group" aria-label="Category filters">
        <button
          type="button"
          className={`filter-chip ${allSelected ? 'active' : ''}`}
          onClick={onSelectAllCategories}
        >
          All
        </button>

        {CATEGORY_LIST.map((cat) => {
          const isActive = activeCategories.has(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              className={`filter-chip ${isActive ? 'active' : ''}`}
              style={
                isActive
                  ? {
                      backgroundColor: cat.color,
                      borderColor: cat.color,
                      color: '#FAF6F0',
                    }
                  : undefined
              }
              onClick={() => onToggleCategory(cat.id)}
            >
              <span aria-hidden="true">{cat.emoji}</span>
              <span>{cat.pluralLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={`filter-chip ${favouritesOnly ? 'active-fav' : ''}`}
          onClick={onToggleFavouritesOnly}
        >
          <Heart size={14} fill={favouritesOnly ? 'currentColor' : 'none'} />
          <span>Saved</span>
        </button>
      </div>
    </header>
  );
}
