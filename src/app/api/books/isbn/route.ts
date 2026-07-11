import { NextRequest, NextResponse } from 'next/server';

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  categories?: string[];
}

interface GoogleBooksResponse {
  totalItems?: number;
  items?: Array<{ volumeInfo?: GoogleBooksVolumeInfo }>;
  error?: { code: number };
}

interface OpenLibraryEdition {
  title?: string;
  authors?: Array<{ key: string }>;
  subjects?: string[];
  works?: Array<{ key: string }>;
}

interface OpenLibraryAuthor {
  name?: string;
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get('isbn');

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN required' }, { status: 400 });
  }

  // 1. Try Google Books API — requires GOOGLE_BOOKS_API_KEY in .env.local
  const googleKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&key=${googleKey}&fields=items(volumeInfo(title,authors,categories))`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const data = (await res.json()) as GoogleBooksResponse;
        const info = data?.items?.[0]?.volumeInfo;
        if (info?.title) {
          return NextResponse.json({
            title: info.title ?? null,
            author: info.authors?.join(', ') ?? null,
            genre: info.categories?.[0] ?? null,
          });
        }
      }
    } catch {
      // fall through to OpenLibrary
    }
  }

  // 2. Fallback: OpenLibrary /isbn/{isbn}.json
  try {
    const res = await fetch(
      `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const edition = (await res.json()) as OpenLibraryEdition;
      if (edition?.title) {
        // Author keys look like "/authors/OL34184A" — fetch the first one for the name
        let authorName: string | null = null;
        const firstAuthorKey = edition.authors?.[0]?.key;
        if (firstAuthorKey) {
          try {
            const authorRes = await fetch(
              `https://openlibrary.org${firstAuthorKey}.json`,
              { next: { revalidate: 86400 } }
            );
            if (authorRes.ok) {
              const authorData = (await authorRes.json()) as OpenLibraryAuthor;
              authorName = authorData.name ?? null;
            }
          } catch {
            // author fetch failed — leave null
          }
        }

        return NextResponse.json({
          title: edition.title,
          author: authorName,
          genre: edition.subjects?.[0] ?? null,
        });
      }
    }
  } catch {
    // both lookups failed
  }

  // No GOOGLE_BOOKS_API_KEY set and OpenLibrary had no result
  if (!googleKey) {
    return NextResponse.json(
      {
        title: null,
        author: null,
        genre: null,
        hint: 'Voeg een gratis Google Books API-sleutel toe als GOOGLE_BOOKS_API_KEY in .env.local voor betere dekking van Nederlandstalige boeken.',
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ title: null, author: null, genre: null }, { status: 404 });
}

