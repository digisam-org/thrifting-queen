import { Heart, Search, Sparkles, X } from 'lucide-react';
import { CATEGORY_LIST } from '../data/categories';
import type { PlaceCategory } from '../types/place';

interface CategoryFilterBarProps {
  activeCategories: Set<PlaceCategory>;
  searchQuery: string;
  favouritesOnly: boolean;
  indiesOnly: boolean;
  totalVisible: number;
  onToggleCategory: (category: PlaceCategory) => void;
  onSelectAllCategories: () => void;
  onSearchChange: (value: string) => void;
  onToggleFavouritesOnly: () => void;
  onToggleIndiesOnly: () => void;
}

export function CategoryFilterBar({
  activeCategories,
  searchQuery,
  favouritesOnly,
  indiesOnly,
  totalVisible,
  onToggleCategory,
  onSelectAllCategories,
  onSearchChange,
  onToggleFavouritesOnly,
  onToggleIndiesOnly,
}: CategoryFilterBarProps) {
  const allSelected = activeCategories.size === CATEGORY_LIST.length && !favouritesOnly && !indiesOnly;

  return (
    <header className="top-overlay">
      <div className="search-card">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search cafes, bakeries, matcha, shops..."
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
                      background: `linear-gradient(135deg, ${cat.color}, ${cat.colorDark})`,
                      borderColor: cat.colorDark,
                      color: '#FFFDF9',
                      boxShadow: `0 4px 12px ${cat.tintBorder}`,
                    }
                  : undefined
              }
              onClick={() => onToggleCategory(cat.id)}
            >
              <span
                className="chip-emoji-dot"
                style={!isActive ? { backgroundColor: cat.softBg } : undefined}
                aria-hidden="true"
              >
                {cat.emoji}
              </span>
              <span>{cat.pluralLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={`filter-chip ${indiesOnly ? 'active' : ''}`}
          onClick={onToggleIndiesOnly}
          title="Hide big chain cafes like Starbucks, Costa, and Caffè Nero"
        >
          <Sparkles size={14} />
          <span>Indies only</span>
        </button>

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
