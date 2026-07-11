import { NextRequest, NextResponse } from 'next/server';

interface BookLookupResult {
  title: string | null;
  author: string | null;
  genre: string | null;
}

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

interface OpenLibrarySearchDoc {
  title?: string;
  author_name?: string[];
  subject?: string[];
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibrarySearchDoc[];
}

interface LocResult {
  title?: string;
  contributor?: string[];
  subject?: string[];
}

interface LocResponse {
  results?: LocResult[];
}

const REVALIDATE = { next: { revalidate: 86400 } } as const;

// Google Books API — works with or without a key (keyless calls are rate-limited by IP).
async function fetchGoogleBooks(isbn: string, key?: string): Promise<BookLookupResult | null> {
  try {
    const keyParam = key ? `&key=${key}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${keyParam}&fields=items(volumeInfo(title,authors,categories))`;
    const res = await fetch(url, REVALIDATE);
    if (!res.ok) return null;
    const data = (await res.json()) as GoogleBooksResponse;
    const info = data?.items?.[0]?.volumeInfo;
    if (!info?.title) return null;
    return {
      title: info.title ?? null,
      author: info.authors?.join(', ') ?? null,
      genre: info.categories?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

// 1. Google Books with API key — best for Dutch/Flemish books, requires GOOGLE_BOOKS_API_KEY
async function lookupGoogleBooksKeyed(isbn: string): Promise<BookLookupResult | null> {
  const googleKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!googleKey) return null;
  return fetchGoogleBooks(isbn, googleKey);
}

// 2. Google Books without key — public endpoint, no key needed
async function lookupGoogleBooksKeyless(isbn: string): Promise<BookLookupResult | null> {
  return fetchGoogleBooks(isbn);
}

// 3. OpenLibrary /isbn/{isbn}.json
async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
      REVALIDATE
    );
    if (!res.ok) return null;
    const edition = (await res.json()) as OpenLibraryEdition;
    if (!edition?.title) return null;

    // Author keys look like "/authors/OL34184A" — fetch the first one for the name
    let authorName: string | null = null;
    const firstAuthorKey = edition.authors?.[0]?.key;
    if (firstAuthorKey) {
      try {
        const authorRes = await fetch(
          `https://openlibrary.org${firstAuthorKey}.json`,
          REVALIDATE
        );
        if (authorRes.ok) {
          const authorData = (await authorRes.json()) as OpenLibraryAuthor;
          authorName = authorData.name ?? null;
        }
      } catch {
        // author fetch failed — leave null
      }
    }

    return {
      title: edition.title,
      author: authorName,
      genre: edition.subjects?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

// 4. OpenLibrary search.json — broader index than the /isbn endpoint, no key needed
async function lookupOpenLibrarySearch(isbn: string): Promise<BookLookupResult | null> {
  try {
    const url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&fields=title,author_name,subject&limit=1`;
    const res = await fetch(url, REVALIDATE);
    if (!res.ok) return null;
    const data = (await res.json()) as OpenLibrarySearchResponse;
    const doc = data?.docs?.[0];
    if (!doc?.title) return null;
    return {
      title: doc.title,
      author: doc.author_name?.join(', ') ?? null,
      genre: doc.subject?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

// 5. Koninklijke Bibliotheek (KB) SRU — strong for Dutch/Flemish books, no key needed
async function lookupKB(isbn: string): Promise<BookLookupResult | null> {
  try {
    const url = `https://jsru.kb.nl/sru/sru?operation=searchRetrieve&x-collection=GGC&recordSchema=dcx&query=dc.identifier=${encodeURIComponent(isbn)}`;
    const res = await fetch(url, REVALIDATE);
    if (!res.ok) return null;
    const xml = await res.text();

    const title = extractXmlTag(xml, 'title');
    if (!title) return null;

    return {
      title,
      author: extractXmlTag(xml, 'creator'),
      genre: extractXmlTag(xml, 'subject'),
    };
  } catch {
    return null;
  }
}

// 6. Deutsche Nationalbibliothek (DNB) SRU — strong for German books, no key needed
async function lookupDNB(isbn: string): Promise<BookLookupResult | null> {
  try {
    const url = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=num=${encodeURIComponent(isbn)}&recordSchema=oai_dc&maximumRecords=1`;
    const res = await fetch(url, REVALIDATE);
    if (!res.ok) return null;
    const xml = await res.text();

    const title = extractXmlTag(xml, 'title');
    if (!title) return null;

    return {
      title,
      author: extractXmlTag(xml, 'creator'),
      genre: extractXmlTag(xml, 'subject'),
    };
  } catch {
    return null;
  }
}

// 7. Library of Congress — no key needed, JSON
async function lookupLibraryOfCongress(isbn: string): Promise<BookLookupResult | null> {
  try {
    const url = `https://www.loc.gov/books/?q=isbn:${encodeURIComponent(isbn)}&fo=json`;
    const res = await fetch(url, {
      ...REVALIDATE,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LocResponse;
    const result = data?.results?.[0];
    if (!result?.title) return null;

    return {
      title: result.title,
      author: result.contributor?.[0] ?? null,
      genre: result.subject?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

// Extract the text content of the first matching (namespace-agnostic) XML tag.
function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tag}>`, 'i')
  );
  if (!match) return null;
  const value = decodeXmlEntities(match[1].trim());
  return value || null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get('isbn');

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN required' }, { status: 400 });
  }

  // Run each source in order until one returns a match.
  const sources = [
    lookupGoogleBooksKeyed,
    lookupGoogleBooksKeyless,
    lookupOpenLibrary,
    lookupOpenLibrarySearch,
    lookupKB,
    lookupDNB,
    lookupLibraryOfCongress,
  ];

  for (const lookup of sources) {
    const result = await lookup(isbn);
    if (result?.title) {
      return NextResponse.json(result);
    }
  }

  // No source returned a match.
  if (!process.env.GOOGLE_BOOKS_API_KEY) {
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

