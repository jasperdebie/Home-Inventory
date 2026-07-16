import { createClient } from '@/lib/supabase/server';
import { MEAL_SLOT_VALUES } from '@/lib/food-diary/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES = ['food', 'drink'] as const;

export function isValidSlot(value: unknown): boolean {
  return typeof value === 'string' && (MEAL_SLOT_VALUES as string[]).includes(value);
}

export function isValidType(value: unknown): boolean {
  return typeof value === 'string' && (VALID_TYPES as readonly string[]).includes(value);
}

export function isValidDate(value: unknown): boolean {
  return typeof value === 'string' && DATE_RE.test(value);
}

/** Voeg een item toe aan de bibliotheek als het nog niet bestaat (naam + type). */
export async function upsertLibraryItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { name: string; type: string; comment?: string | null; ingredients?: string | null }
) {
  const normalized = input.name.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('food_diary_library')
    .select('id')
    .eq('name_normalized', normalized)
    .eq('type', input.type)
    .maybeSingle();

  if (existing) return;

  await supabase.from('food_diary_library').insert([
    {
      name: input.name.trim(),
      name_normalized: normalized,
      type: input.type,
      comment: input.comment?.trim() || null,
      ingredients: input.ingredients?.trim() || null,
    },
  ]);
}
