'use client';

import { useState, useEffect, useCallback } from 'react';
import { Book } from '@/lib/hooks/useBooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';

interface IsbnLookupResult {
  title: string | null;
  author: string | null;
  genre: string | null;
}

interface BookFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  initialBook?: Book | null;
  genres: string[];
  onAddGenre?: (genre: string) => Promise<void>;
}

export function BookForm({
  open,
  onOpenChange,
  onSubmit,
  initialBook,
  genres,
  onAddGenre,
}: BookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [genre, setGenre] = useState('');
  const [genreInputValue, setGenreInputValue] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [read, setRead] = useState(false);
  const [bought, setBought] = useState(false);
  const [lent, setLent] = useState(false);
  const [lentTo, setLentTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnError, setIsbnError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (initialBook) {
      setTitle(initialBook.title);
      setAuthor(initialBook.author);
      setIsbn(initialBook.isbn || '');
      setGenre(initialBook.genre || '');
      setGenreInputValue(initialBook.genre || '');
      setRead(initialBook.read);
      setBought(initialBook.bought);
      setLent(initialBook.lent);
      setLentTo(initialBook.lent_to || '');
      setNotes(initialBook.notes || '');
    } else {
      resetForm();
    }
    setError('');
    setIsbnError('');
    setScannerOpen(false);
  }, [initialBook, open]);

  const normalizeIsbn = (value: string) => value.replace(/[^0-9Xx]/g, '').toUpperCase();

  const isValidIsbnFormat = (value: string) => {
    if (value.length === 13) {
      return /^\d{13}$/.test(value);
    }
    if (value.length === 10) {
      return /^\d{9}[\dX]$/.test(value);
    }
    return false;
  };

  const lookupByIsbn = useCallback(
    async (rawIsbn?: string) => {
      const normalized = normalizeIsbn(rawIsbn ?? isbn);
      setIsbn(normalized);
      setIsbnError('');

      if (!isValidIsbnFormat(normalized)) {
        setIsbnError('⚠️ Een ISBN heeft 10 of 13 cijfers.');
        return;
      }

      setIsbnLoading(true);
      try {
        const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(normalized)}`);

        if (res.status === 404) {
          setIsbnError('⚠️ Geen boek gevonden voor dit ISBN. Vul de gegevens manueel in.');
          return;
        }
        if (!res.ok) {
          throw new Error('ISBN lookup failed');
        }

        const data = (await res.json()) as IsbnLookupResult;

        if (!data.title) {
          setIsbnError('⚠️ Geen boek gevonden voor dit ISBN. Vul de gegevens manueel in.');
          return;
        }

        if (data.title) setTitle(data.title);
        if (data.author) setAuthor(data.author);
        if (data.genre) {
          setGenre(data.genre);
          setGenreInputValue(data.genre);

          if (onAddGenre && !genres.includes(data.genre)) {
            try {
              await onAddGenre(data.genre);
            } catch {
              // Genre autocomplete update is best effort and should not block lookup.
            }
          }
        }
      } catch {
        setIsbnError('⚠️ Kan geen verbinding maken. Controleer je internet.');
      } finally {
        setIsbnLoading(false);
      }
    },
    [isbn, genres, onAddGenre]
  );

  const handleScan = useCallback(
    async (scannedValue: string) => {
      setScannerOpen(false);
      await lookupByIsbn(scannedValue);
    },
    [lookupByIsbn]
  );

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsbn('');
    setGenre('');
    setGenreInputValue('');
    setRead(false);
    setBought(false);
    setLent(false);
    setLentTo('');
    setNotes('');
  };

  const filteredGenres = genres.filter((g) =>
    g.toLowerCase().includes(genreInputValue.toLowerCase())
  );

  const handleGenreSelect = (selectedGenre: string) => {
    setGenre(selectedGenre);
    setGenreInputValue(selectedGenre);
    setShowGenreDropdown(false);
  };

  const handleGenreInputChange = (value: string) => {
    setGenreInputValue(value);
    setGenre('');
    setShowGenreDropdown(true);
  };

  const handleAddNewGenre = async () => {
    if (genreInputValue.trim() && !genres.includes(genreInputValue)) {
      try {
        await onAddGenre?.(genreInputValue.trim());
        setGenre(genreInputValue.trim());
        setShowGenreDropdown(false);
      } catch {
        setError('Failed to add genre');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !author.trim()) {
      setError('Title and author are required');
      return;
    }

    setSaving(true);
    try {
      const finalGenre = genre || (genreInputValue.trim() && genres.includes(genreInputValue) ? genreInputValue : null);
      
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || null,
        genre: finalGenre,
        read,
        bought,
        lent,
        lent_to: lent && lentTo.trim() ? lentTo.trim() : null,
        notes: notes.trim() || null,
      });

      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          {initialBook ? 'Edit Book' : 'Add Book'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="text-sm font-medium text-gray-700">ISBN (optioneel)</div>
            <div className="flex gap-2 items-start">
              <Input
                value={isbn}
                onChange={(e) => {
                  setIsbn(e.target.value);
                  setIsbnError('');
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    lookupByIsbn();
                  }
                }}
                placeholder="bv. 9789023414797"
              />
              <Button type="button" onClick={() => lookupByIsbn()} disabled={isbnLoading}>
                {isbnLoading ? 'Zoeken...' : 'Ophalen'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setScannerOpen((prev) => !prev);
                  setIsbnError('');
                }}
              >
                {scannerOpen ? 'Sluit scan' : 'Scan'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Vul een ISBN in of scan de barcode om info automatisch op te halen.
            </p>

            {isbnLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Spinner size="sm" className="text-emerald-600" />
                Boekinformatie ophalen...
              </div>
            )}

            {isbnError && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {isbnError}
              </div>
            )}

            {scannerOpen && (
              <div className="rounded-lg border border-gray-200 bg-white p-2">
                <BarcodeScanner onScan={handleScan} active={scannerOpen && open} />
              </div>
            )}
          </div>

          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., De aanslag"
            required
          />

          <Input
            label="Author *"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g., Harry Mulisch"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
            <div className="relative">
              <Input
                value={genreInputValue}
                onChange={(e) => handleGenreInputChange(e.target.value)}
                placeholder="Select or type a genre..."
                onFocus={() => setShowGenreDropdown(true)}
              />
              {showGenreDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {filteredGenres.length > 0 && (
                    <>
                      {filteredGenres.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleGenreSelect(g)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {g}
                        </button>
                      ))}
                      {genreInputValue.trim() && !filteredGenres.includes(genreInputValue) && (
                        <button
                          type="button"
                          onClick={handleAddNewGenre}
                          className="w-full px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium border-t border-gray-200"
                        >
                          + Add &quot;{genreInputValue}&quot;
                        </button>
                      )}
                    </>
                  )}
                  {filteredGenres.length === 0 && genreInputValue.trim() && (
                    <button
                      type="button"
                      onClick={handleAddNewGenre}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium"
                    >
                      + Add &quot;{genreInputValue}&quot;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={read}
                onChange={(e) => setRead(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Gelezen</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={bought}
                onChange={(e) => setBought(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Aangekocht</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lent}
                onChange={(e) => setLent(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Uitgeleend</span>
            </label>

            {lent && (
              <Input
                label="Lent to"
                value={lentTo}
                onChange={(e) => setLentTo(e.target.value)}
                placeholder="Name of person"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Book'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
