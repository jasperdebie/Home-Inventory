'use client';

import { RecipeCategory } from '@/lib/supabase/types';

const CATEGORIES: { value: RecipeCategory; label: string; emoji: string }[] = [
  { value: 'hapje',        label: 'Hapje',        emoji: '🥨' },
  { value: 'voorgerecht',  label: 'Voorgerecht',  emoji: '🥗' },
  { value: 'hoofdgerecht', label: 'Hoofdgerecht', emoji: '🍽️' },
  { value: 'dessert',      label: 'Dessert',      emoji: '🍰' },
];

interface CategoryFilterProps {
  selected: RecipeCategory | '';
  onChange: (cat: RecipeCategory | '') => void;
  counts?: Partial<Record<RecipeCategory, number>>;
}

export function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
          ${selected === ''
            ? 'bg-[var(--cb-accent)] text-white'
            : 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)]'
          }`}
      >
        Alles
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(selected === cat.value ? '' : cat.value)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${selected === cat.value
              ? 'bg-[var(--cb-accent)] text-white'
              : 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)]'
            }`}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
          {counts?.[cat.value] !== undefined && (
            <span className={`text-xs ${selected === cat.value ? 'opacity-75' : 'opacity-60'}`}>
              {counts[cat.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export { CATEGORIES };
