import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [summary] = await sql<{
      database: string;
      products: number;
      books: number;
      recipes: number;
      people: number;
    }[]>`
      SELECT
        current_database() AS database,
        (SELECT count(*)::int FROM products) AS products,
        (SELECT count(*)::int FROM books) AS books,
        (SELECT count(*)::int FROM recipes) AS recipes,
        (SELECT count(*)::int FROM people) AS people
    `;

    return NextResponse.json({
      ok: true,
      database: summary.database,
      counts: {
        products: summary.products,
        books: summary.books,
        recipes: summary.recipes,
        people: summary.people,
      },
    });
  } catch (error) {
    console.error('PostgreSQL health check failed', error);
    return NextResponse.json(
      { ok: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
