import { NextRequest, NextResponse } from 'next/server';
import { PIN_COOKIE_NAME, PIN_COOKIE_MAX_AGE } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const { pin } = await request.json();
  const correctPin = process.env.APP_PIN || '1234';

  if (pin !== correctPin) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(PIN_COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PIN_COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}
