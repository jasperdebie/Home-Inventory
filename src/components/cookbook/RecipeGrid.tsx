'use client';

import { Recipe } from '@/lib/supabase/types';
import { RecipeCard } from './RecipeCard';

type SortKey = 'newest' | 'oldest' | 'name' | 'preptime';

interface RecipeGridProps {
  recipes: Recipe[];
  sort: SortKey;
  onOpen: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, value: boolean) => void;
}

function sortRecipes(recipes: Recipe[], sort: SortKey): Recipe[] {
  return [...recipes].sort((a, b) => {
    switch (sort) {
      case 'newest':   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name':     return a.title.localeCompare(b.title, 'nl');
      case 'preptime': {
        const at = a.prep_time ?? Infinity;
        const bt = b.prep_time ?? Infinity;
        return at - bt;
      }
    }
  });
}

export function RecipeGrid({ recipes, sort, onOpen, onEdit, onDelete, onToggleFavorite }: RecipeGridProps) {
  const sorted = sortRecipes(recipes, sort);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">🍽️</p>
        <p className="text-[var(--cb-muted)] text-base">Geen gerechten gevonden</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

export type { SortKey };
