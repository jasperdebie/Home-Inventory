import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get('barcode');

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name`,
      { next: { revalidate: 86400 } } // Cache for 24h
    );

    if (!res.ok) {
      return NextResponse.json({ name: null });
    }

    const data = await res.json();
    const name = data?.product?.product_name || null;

    return NextResponse.json({ name, barcode });
  } catch {
    return NextResponse.json({ name: null });
  }
}
