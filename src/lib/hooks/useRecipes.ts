'use client';

import { useEffect, useState } from 'react';
import { Recipe, RecipeIngredient } from '@/lib/supabase/types';

export type { Recipe, RecipeIngredient };

export interface IngredientInput {
  name: string;
  cookbook_product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

export interface EquipmentInput {
  name: string;
  cookbook_equipment_id?: string | null;
  quantity?: number | null;
}

export interface RecipeFormData extends Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'recipe_ingredients' | 'recipe_equipment'> {
  ingredients: IngredientInput[];
  equipment: EquipmentInput[];
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/recipes');
      if (!res.ok) throw new Error('Recepten laden mislukt');
      const data = await res.json();
      setRecipes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const createRecipe = async (data: RecipeFormData): Promise<Recipe> => {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Recept aanmaken mislukt');
    }
    const newRecipe: Recipe = await res.json();
    setRecipes((prev) => [newRecipe, ...prev]);
    return newRecipe;
  };

  const updateRecipe = async (id: string, data: Partial<RecipeFormData>): Promise<Recipe> => {
    const res = await fetch(`/api/recipes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Recept bijwerken mislukt');
    }
    const updated: Recipe = await res.json();
    setRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const deleteRecipe = async (id: string): Promise<void> => {
    const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Recept verwijderen mislukt');
    }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  return { recipes, loading, error, fetchRecipes, createRecipe, updateRecipe, deleteRecipe };
}
