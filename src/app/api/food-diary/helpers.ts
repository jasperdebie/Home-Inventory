import { sql } from '@/lib/db';
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
  input: { name: string; type: string; comment?: string | null; ingredients?: string | null }
) {
  const normalized = input.name.trim().toLowerCase();

  await sql`
    INSERT INTO food_diary_library (
      name, name_normalized, type, comment, ingredients
    )
    VALUES (
      ${input.name.trim()},
      ${normalized},
      ${input.type},
      ${input.comment?.trim() || null},
      ${input.ingredients?.trim() || null}
    )
    ON CONFLICT (name_normalized, type) DO NOTHING
  `;
}
