'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRecipes, RecipeFormData } from '@/lib/hooks/useRecipes';
import { useToast } from '@/components/ui/Toast';
import { Recipe, RecipeCategory, CookbookProduct } from '@/lib/supabase/types';
import { CategoryFilter } from '@/components/cookbook/CategoryFilter';
import { ProductSearchBar } from '@/components/cookbook/ProductSearchBar';
import { RecipeGrid, SortKey } from '@/components/cookbook/RecipeGrid';
import { RecipeForm } from '@/components/cookbook/RecipeForm';
import { RecipeDetail } from '@/components/cookbook/RecipeDetail';

export default function CookbookPage() {
  const { recipes, loading, createRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { toast } = useToast();

  // Filter state
  const [titleSearch, setTitleSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | ''>('');
  const [selectedProducts, setSelectedProducts] = useState<CookbookProduct[]>([]);
  const [productMode, setProductMode] = useState<'AND' | 'OR'>('AND');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('newest');

  // UI state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  // ─── Filter logic ────────────────────────────────────────────────────

  const filtered = recipes.filter((recipe) => {
    if (selectedCategory && recipe.category !== selectedCategory) return false;

    if (titleSearch.trim()) {
      const q = titleSearch.trim().toLowerCase();
      if (
        !recipe.title.toLowerCase().includes(q) &&
        !recipe.tags.some((t) => t.toLowerCase().includes(q))
      ) return false;
    }

    if (selectedProducts.length > 0) {
      const recipeProductIds = new Set(
        (recipe.recipe_ingredients ?? [])
          .map((i) => i.cookbook_product_id)
          .filter(Boolean)
      );
      const recipeProductNorms = new Set(
        (recipe.recipe_ingredients ?? [])
          .map((i) => i.cookbook_product?.name_normalized ?? i.name.toLowerCase())
      );

      const matches = (p: CookbookProduct) =>
        recipeProductIds.has(p.id) || recipeProductNorms.has(p.name_normalized);

      if (productMode === 'AND') {
        if (!selectedProducts.every(matches)) return false;
      } else {
        if (!selectedProducts.some(matches)) return false;
      }
    }

    if (showFavoritesOnly && !recipe.is_favorite) return false;

    return true;
  });

  // Category counts (on unfiltered set)
  const counts: Partial<Record<RecipeCategory, number>> = {};
  for (const r of recipes) {
    counts[r.category] = (counts[r.category] ?? 0) + 1;
  }

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleAdd = () => {
    setEditingRecipe(null);
    setFormOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setDetailRecipe(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: RecipeFormData) => {
    if (editingRecipe) {
      const updated = await updateRecipe(editingRecipe.id, data);
      toast('Gerecht bijgewerkt');
      if (detailRecipe?.id === editingRecipe.id) setDetailRecipe(updated);
    } else {
      await createRecipe(data);
      toast('Gerecht toegevoegd');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe(id);
      toast('Gerecht verwijderd');
      if (detailRecipe?.id === id) setDetailRecipe(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Verwijderen mislukt', 'error');
    }
  };

  const handleToggleFavorite = async (id: string, value: boolean) => {
    try {
      const updated = await updateRecipe(id, { is_favorite: value } as Partial<RecipeFormData>);
      if (detailRecipe?.id === id) setDetailRecipe(updated);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Favoriet bijwerken mislukt', 'error');
    }
  };

  const hasFilters = titleSearch || selectedCategory || selectedProducts.length > 0 || showFavoritesOnly;

  // ─── Loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cb-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--cb-accent)] mx-auto mb-4" />
          <p className="text-[var(--cb-muted)]">Recepten laden…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cb-bg)]">
      {/* Detail overlay */}
      {detailRecipe && (
        <RecipeDetail
          recipe={detailRecipe}
          onClose={() => setDetailRecipe(null)}
          onEdit={handleEdit}
          onToggleFavorite={handleToggleFavorite}
          onOpenSubRecipe={(id) => {
            const target = recipes.find((r) => r.id === id);
            if (target) setDetailRecipe(target);
          }}
        />
      )}

      {/* Form sheet */}
      <RecipeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initial={editingRecipe}
        allRecipes={recipes}
      />

      <div className="max-w-4xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-[var(--cb-bg)] border-b border-[var(--cb-line)]">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[var(--cb-line)] text-[var(--cb-ink)] shadow-sm"
                  aria-label="Terug"
                >
                  ←
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--cb-ink)]">Mijn Kookboek</h1>
                  <p className="text-xs text-[var(--cb-muted)]">
                    {recipes.length} {recipes.length === 1 ? 'gerecht' : 'gerechten'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFavoritesOnly((v) => !v)}
                className={`w-10 h-10 flex items-center justify-center rounded-full border text-xl transition-colors
                  ${showFavoritesOnly
                    ? 'bg-[var(--cb-accent)] border-[var(--cb-accent)] text-white'
                    : 'bg-white border-[var(--cb-line)] text-[var(--cb-muted)]'
                  }`}
                aria-label="Toon favorieten"
                title="Toon favorieten"
              >
                ♥
              </button>
            </div>

            {/* Title search */}
            <div className="relative mb-3">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--cb-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                placeholder="Zoek op naam of tag…"
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[var(--cb-line)] bg-white text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-muted)] outline-none focus:border-[var(--cb-accent)]"
              />
              {titleSearch && (
                <button
                  onClick={() => setTitleSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--cb-muted)] hover:text-[var(--cb-ink)]"
                >
                  ×
                </button>
              )}
            </div>

            {/* Product search */}
            <ProductSearchBar
              selected={selectedProducts}
              mode={productMode}
              onAdd={(p) => setSelectedProducts((prev) => [...prev, p])}
              onRemove={(id) => setSelectedProducts((prev) => prev.filter((p) => p.id !== id))}
              onModeChange={setProductMode}
            />
          </div>

          {/* Category filter */}
          <div className="px-4 pb-3">
            <CategoryFilter
              selected={selectedCategory}
              onChange={setSelectedCategory}
              counts={counts}
            />
          </div>
        </div>

        {/* ─── Content ─────────────────────────────────────────────────── */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--cb-muted)]">
              {hasFilters
                ? `${filtered.length} van ${recipes.length} gerecht${recipes.length !== 1 ? 'en' : ''}`
                : `${recipes.length} gerecht${recipes.length !== 1 ? 'en' : ''}`
              }
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--cb-line)] bg-white text-[var(--cb-ink)] outline-none"
            >
              <option value="newest">Nieuwste eerst</option>
              <option value="oldest">Oudste eerst</option>
              <option value="name">Op naam</option>
              <option value="preptime">Bereidingstijd</option>
            </select>
          </div>

          <RecipeGrid
            recipes={filtered}
            sort={sort}
            onOpen={setDetailRecipe}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        <div className="h-24" />
      </div>

      {/* FAB */}
      <button
        onClick={handleAdd}
        className="fixed right-5 bottom-6 w-14 h-14 rounded-full bg-[var(--cb-accent)] text-white shadow-lg text-2xl flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="Nieuw gerecht toevoegen"
      >
        +
      </button>
    </div>
  );
}
