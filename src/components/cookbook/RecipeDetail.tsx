'use client';

import { useState } from 'react';
import { Recipe, RecipeCategory } from '@/lib/supabase/types';
import { CATEGORIES } from './CategoryFilter';

const CATEGORY_EMOJI: Record<RecipeCategory, string> = {
  hapje:        '🥨',
  voorgerecht:  '🥗',
  hoofdgerecht: '🍽️',
  dessert:      '🍰',
};

const RATING_LABELS: Record<string, { label: string; emoji: string }> = {
  zeer_goed: { label: 'Zeer goed', emoji: '😍' },
  goed:      { label: 'Goed',      emoji: '🙂' },
  matig:     { label: 'Matig',     emoji: '😐' },
  minder:    { label: 'Minder',    emoji: '🙁' },
  slecht:    { label: 'Slecht',    emoji: '😖' },
};

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onToggleFavorite: (id: string, value: boolean) => void;
  onOpenSubRecipe?: (id: string) => void;
}

export function RecipeDetail({ recipe, onClose, onEdit, onToggleFavorite, onOpenSubRecipe }: RecipeDetailProps) {
  const [servings, setServings] = useState(recipe.servings);
  const scale = servings / recipe.servings;
  const categoryLabel = CATEGORIES.find((c) => c.value === recipe.category)?.label ?? recipe.category;

  function formatQty(qty: number | null): string {
    if (qty == null) return '';
    const scaled = qty * scale;
    // Show up to 2 decimal places, strip trailing zeros
    return parseFloat(scaled.toFixed(2)).toString();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--cb-bg)] overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--cb-bg)] border-b border-[var(--cb-line)]">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[var(--cb-line)] text-[var(--cb-ink)] text-lg"
            aria-label="Sluiten"
          >
            ←
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onToggleFavorite(recipe.id, !recipe.is_favorite)}
              className={`w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[var(--cb-line)] text-xl transition-colors
                ${recipe.is_favorite ? 'text-[var(--cb-accent)]' : 'text-[var(--cb-muted)]'}`}
              aria-label={recipe.is_favorite ? 'Uit favorieten' : 'Aan favorieten'}
            >
              {recipe.is_favorite ? '♥' : '♡'}
            </button>
            <button
              onClick={() => onEdit(recipe)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[var(--cb-line)] text-[var(--cb-ink)]"
              aria-label="Bewerken"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Photo */}
        {recipe.image_url ? (
          <div className="mt-4 rounded-2xl overflow-hidden h-56 sm:h-72">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl h-40 bg-[var(--cb-accent-soft)] flex items-center justify-center">
            <span className="text-6xl">{CATEGORY_EMOJI[recipe.category]}</span>
          </div>
        )}

        {/* Title + category */}
        <div className="mt-5">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] rounded-full font-medium mb-2">
            {CATEGORY_EMOJI[recipe.category]} {categoryLabel}
          </span>
          <h1 className="text-2xl font-bold text-[var(--cb-ink)] leading-tight">{recipe.title}</h1>
        </div>

        {/* Made + rating */}
        {(recipe.is_made || recipe.rating || recipe.star_rating || recipe.health_rating) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.is_made && (
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                🍳 Al gemaakt
              </span>
            )}
            {recipe.rating && RATING_LABELS[recipe.rating] && (
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-white border border-[var(--cb-line)] text-[var(--cb-ink)] rounded-full font-medium">
                {RATING_LABELS[recipe.rating].emoji} {RATING_LABELS[recipe.rating].label}
              </span>
            )}
            {recipe.star_rating && (
              <span
                className="inline-flex items-center gap-0.5 text-sm px-3 py-1 bg-white border border-[var(--cb-line)] rounded-full font-medium"
                title={`${recipe.star_rating}/5 sterren`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= recipe.star_rating! ? 'text-amber-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </span>
            )}
            {recipe.health_rating && (
              <span
                className="inline-flex items-center gap-0.5 text-sm px-3 py-1 bg-white border border-[var(--cb-line)] rounded-full font-medium"
                title={`${recipe.health_rating}/5 gezond`}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <span key={level} className={level <= recipe.health_rating! ? '' : 'opacity-25 grayscale'}>
                    🥦
                  </span>
                ))}
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-[var(--cb-muted)]">
          {recipe.prep_time && (
            <span className="flex items-center gap-1">⏱ <strong className="text-[var(--cb-ink)]">{recipe.prep_time} min</strong></span>
          )}
          {recipe.extra_time && (
            <span className="flex items-center gap-1">
              ⏳ <strong className="text-[var(--cb-ink)]">{recipe.extra_time}</strong>
              {recipe.extra_time_label && <span>{recipe.extra_time_label}</span>}
            </span>
          )}
          {/* Portion adjuster */}
          <div className="flex items-center gap-2">
            <span>👤</span>
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-full bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] font-bold flex items-center justify-center"
              aria-label="Minder porties"
            >
              −
            </button>
            <strong className="text-[var(--cb-ink)] w-6 text-center">{servings}</strong>
            <button
              onClick={() => setServings((s) => s + 1)}
              className="w-7 h-7 rounded-full bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] font-bold flex items-center justify-center"
              aria-label="Meer porties"
            >
              +
            </button>
            <span>pers.</span>
          </div>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {recipe.tags.map((tag) => (
              <span key={tag} className="text-xs px-3 py-1 bg-[var(--cb-bg)] border border-[var(--cb-line)] text-[var(--cb-muted)] rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients */}
        {(recipe.recipe_ingredients?.length ?? 0) > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-[var(--cb-ink)] mb-3">Ingrediënten</h2>
            <ul className="space-y-2">
              {[...(recipe.recipe_ingredients ?? [])]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((ing) => (
                  <li key={ing.id} className="flex items-center gap-3 py-2 border-b border-[var(--cb-line)] last:border-0">
                    <span className="text-sm text-[var(--cb-muted)] w-16 shrink-0 text-right">
                      {ing.quantity != null ? `${formatQty(ing.quantity)}${ing.unit ? ` ${ing.unit}` : ''}` : ing.unit ?? ''}
                    </span>
                    <span className="text-sm text-[var(--cb-ink)]">{ing.name}</span>
                  </li>
                ))}
            </ul>
            {scale !== 1 && (
              <p className="mt-2 text-xs text-[var(--cb-muted)] italic">
                Hoeveelheden aangepast voor {servings} personen (origineel: {recipe.servings} pers.)
              </p>
            )}
          </section>
        )}

        {/* Equipment / benodigdheden */}
        {(recipe.recipe_equipment?.length ?? 0) > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-[var(--cb-ink)] mb-3">Benodigdheden</h2>
            <ul className="space-y-2">
              {[...(recipe.recipe_equipment ?? [])]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((eq) => (
                  <li key={eq.id} className="flex items-center gap-3 py-2 border-b border-[var(--cb-line)] last:border-0">
                    <span className="text-sm text-[var(--cb-muted)] w-16 shrink-0 text-right">
                      {eq.quantity != null ? eq.quantity : ''}
                    </span>
                    <span className="text-sm text-[var(--cb-ink)]">{eq.name}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Sub-recipes / subrecepten */}
        {(recipe.recipe_components?.length ?? 0) > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-[var(--cb-ink)] mb-3">Subrecepten</h2>
            <div className="space-y-2">
              {[...(recipe.recipe_components ?? [])]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((comp) => {
                  const child = comp.child_recipe;
                  const clickable = Boolean(child && onOpenSubRecipe);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      disabled={!clickable}
                      onClick={() => child && onOpenSubRecipe?.(child.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border border-[var(--cb-line)] bg-white text-left transition-colors
                        ${clickable ? 'hover:border-[var(--cb-accent)] active:scale-[0.99]' : 'opacity-70'}`}
                    >
                      <span className="w-11 h-11 rounded-xl bg-[var(--cb-accent-soft)] flex items-center justify-center text-xl shrink-0 overflow-hidden">
                        {child?.image_url
                          ? <img src={child.image_url} alt={child.title} className="w-full h-full object-cover" />
                          : (child ? CATEGORY_EMOJI[child.category] : '🍽️')}
                      </span>
                      <span className="min-w-0 flex-1">
                        {comp.label && (
                          <span className="block text-xs text-[var(--cb-muted)]">{comp.label}</span>
                        )}
                        <span className="block text-sm font-medium text-[var(--cb-ink)] truncate">
                          {child?.title ?? 'Onbekend recept'}
                        </span>
                        {child?.prep_time != null && (
                          <span className="block text-xs text-[var(--cb-muted)]">⏱ {child.prep_time} min</span>
                        )}
                      </span>
                      {clickable && <span className="text-[var(--cb-muted)] shrink-0">›</span>}
                    </button>
                  );
                })}
            </div>
          </section>
        )}

        {/* Preparation */}
        {recipe.preparation && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-[var(--cb-ink)] mb-3">Bereiding</h2>
            <div className="space-y-3">
              {recipe.preparation.split('\n').filter(Boolean).map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--cb-accent)] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-[var(--cb-ink)] leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {recipe.notes && (
          <section className="mt-6 p-4 bg-white rounded-2xl border border-[var(--cb-line)]">
            <h2 className="text-sm font-semibold text-[var(--cb-muted)] mb-2">📝 Notities</h2>
            <p className="text-sm text-[var(--cb-ink)] leading-relaxed">{recipe.notes}</p>
          </section>
        )}

        {/* Source */}
        {recipe.source && (
          <section className="mt-4 p-4 bg-white rounded-2xl border border-[var(--cb-line)]">
            <h2 className="text-sm font-semibold text-[var(--cb-muted)] mb-2">🔗 Bron</h2>
            {recipe.source.startsWith('http') ? (
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--cb-accent)] underline break-all"
              >
                {recipe.source}
              </a>
            ) : (
              <p className="text-sm text-[var(--cb-ink)]">{recipe.source}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
