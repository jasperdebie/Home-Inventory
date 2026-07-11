'use client';

import { Recipe, RecipeCategory } from '@/lib/supabase/types';
import { CATEGORIES } from './CategoryFilter';

interface RecipeCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, value: boolean) => void;
}

const CATEGORY_EMOJI: Record<RecipeCategory, string> = {
  hapje:        '🥨',
  voorgerecht:  '🥗',
  hoofdgerecht: '🍽️',
  dessert:      '🍰',
};

export function RecipeCard({ recipe, onOpen, onEdit, onDelete, onToggleFavorite }: RecipeCardProps) {
  const categoryLabel = CATEGORIES.find((c) => c.value === recipe.category)?.label ?? recipe.category;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-[var(--cb-line)] cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => onOpen(recipe)}
    >
      {/* Photo */}
      {recipe.image_url ? (
        <div className="h-40 overflow-hidden">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-36 bg-[var(--cb-accent-soft)] flex items-center justify-center">
          <span className="text-4xl">{CATEGORY_EMOJI[recipe.category]}</span>
        </div>
      )}

      <div className="p-4">
        {/* Category badge */}
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] rounded-full font-medium mb-2">
          {CATEGORY_EMOJI[recipe.category]} {categoryLabel}
        </span>

        <h3 className="font-semibold text-[var(--cb-ink)] leading-snug mb-1 line-clamp-2">
          {recipe.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-[var(--cb-muted)] mb-3">
          {recipe.prep_time && (
            <span>⏱ {recipe.prep_time} min</span>
          )}
          {recipe.extra_time && (
            <span>⏳ {recipe.extra_time}{recipe.extra_time_label ? ` ${recipe.extra_time_label}` : ''}</span>
          )}
          <span>👤 {recipe.servings} pers.</span>
          {(recipe.recipe_ingredients?.length ?? 0) > 0 && (
            <span>🥕 {recipe.recipe_ingredients!.length} ing.</span>
          )}
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-[var(--cb-bg)] text-[var(--cb-muted)] rounded-full border border-[var(--cb-line)]">
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-xs text-[var(--cb-muted)]">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleFavorite(recipe.id, !recipe.is_favorite)}
            className={`text-xl transition-transform active:scale-110 ${recipe.is_favorite ? 'text-[var(--cb-accent)]' : 'text-[var(--cb-line)]'}`}
            aria-label={recipe.is_favorite ? 'Uit favorieten' : 'Aan favorieten'}
          >
            {recipe.is_favorite ? '♥' : '♡'}
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(recipe)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--cb-muted)] hover:bg-[var(--cb-bg)] transition-colors"
              aria-label="Bewerken"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                if (confirm(`"${recipe.title}" verwijderen?`)) onDelete(recipe.id);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--cb-muted)] hover:bg-red-50 hover:text-red-600 transition-colors"
              aria-label="Verwijderen"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
