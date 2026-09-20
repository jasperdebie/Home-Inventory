import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  Complaint,
  DayLog,
  FoodItem,
  MealSlot,
  MEAL_SLOTS,
} from '@/lib/food-diary/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function emptyDay(date: string): DayLog {
  const meals = {} as Record<MealSlot, FoodItem[]>;
  const complaints = {} as Record<MealSlot, Complaint[]>;
  for (const { slot } of MEAL_SLOTS) {
    meals[slot] = [];
    complaints[slot] = [];
  }
  return { date, meals, complaints };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    if (date) {
      if (!DATE_RE.test(date)) {
        return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
      }

      const [items, complaints] = await Promise.all([
        sql`
          SELECT id, log_date::text AS log_date, slot, name, type,
                 comment, ingredients, sort_order, created_at
          FROM food_diary_items
          WHERE log_date = ${date}
          ORDER BY slot ASC, sort_order ASC, created_at ASC
        `,
        sql`
          SELECT id, log_date::text AS log_date, slot, description, created_at
          FROM food_diary_complaints
          WHERE log_date = ${date}
          ORDER BY created_at ASC
        `,
      ]);

      const day = emptyDay(date);

      for (const row of items) {
        const slot = row.slot as MealSlot;
        if (!day.meals[slot]) continue;
        day.meals[slot].push({
          id: row.id as string,
          name: row.name as string,
          type: row.type as FoodItem['type'],
          comment: (row.comment as string | null) ?? undefined,
          ingredients: (row.ingredients as string | null) ?? undefined,
        });
      }

      for (const row of complaints) {
        const slot = row.slot as MealSlot;
        if (!day.complaints[slot]) continue;
        day.complaints[slot].push({
          id: row.id as string,
          description: row.description as string,
        });
      }

      return NextResponse.json(day);
    }

    if (from && to) {
      if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        return NextResponse.json({ error: 'Ongeldige datumreeks' }, { status: 400 });
      }

      const [foodRows, complaintRows] = await Promise.all([
        sql`
          SELECT DISTINCT log_date::text AS log_date
          FROM food_diary_items
          WHERE log_date >= ${from} AND log_date <= ${to}
        `,
        sql`
          SELECT DISTINCT log_date::text AS log_date
          FROM food_diary_complaints
          WHERE log_date >= ${from} AND log_date <= ${to}
        `,
      ]);

      return NextResponse.json({
        foodDates: foodRows.map((r) => r.log_date as string),
        complaintDates: complaintRows.map((r) => r.log_date as string),
      });
    }

    return NextResponse.json({ error: 'Geef date of from/to op' }, { status: 400 });
  } catch (error) {
    console.error('Food diary query failed', error);
    return NextResponse.json({ error: 'Eetdagboek laden mislukt' }, { status: 500 });
  }
}
