import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
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

// GET ?date=YYYY-MM-DD            → volledige dag (meals + complaints)
// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD → maandsamenvatting (foodDates, complaintDates)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (date) {
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
    }

    const [itemsRes, complaintsRes] = await Promise.all([
      supabase
        .from('food_diary_items')
        .select('*')
        .eq('log_date', date)
        .order('slot', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('food_diary_complaints')
        .select('*')
        .eq('log_date', date)
        .order('created_at', { ascending: true }),
    ]);

    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }
    if (complaintsRes.error) {
      return NextResponse.json({ error: complaintsRes.error.message }, { status: 500 });
    }

    const day = emptyDay(date);
    for (const row of itemsRes.data ?? []) {
      const slot = row.slot as MealSlot;
      if (!day.meals[slot]) continue;
      day.meals[slot].push({
        id: row.id,
        name: row.name,
        type: row.type,
        comment: row.comment ?? undefined,
        ingredients: row.ingredients ?? undefined,
      });
    }
    for (const row of complaintsRes.data ?? []) {
      const slot = row.slot as MealSlot;
      if (!day.complaints[slot]) continue;
      day.complaints[slot].push({ id: row.id, description: row.description });
    }

    return NextResponse.json(day);
  }

  if (from && to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: 'Ongeldige datumreeks' }, { status: 400 });
    }

    const [itemsRes, complaintsRes] = await Promise.all([
      supabase
        .from('food_diary_items')
        .select('log_date')
        .gte('log_date', from)
        .lte('log_date', to),
      supabase
        .from('food_diary_complaints')
        .select('log_date')
        .gte('log_date', from)
        .lte('log_date', to),
    ]);

    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }
    if (complaintsRes.error) {
      return NextResponse.json({ error: complaintsRes.error.message }, { status: 500 });
    }

    const foodDates = [...new Set((itemsRes.data ?? []).map((r) => r.log_date as string))];
    const complaintDates = [
      ...new Set((complaintsRes.data ?? []).map((r) => r.log_date as string)),
    ];

    return NextResponse.json({ foodDates, complaintDates });
  }

  return NextResponse.json({ error: 'Geef date of from/to op' }, { status: 400 });
}
