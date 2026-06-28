'use client';

import { useState, useEffect } from 'react';
import { Book } from '@/lib/hooks/useBooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';

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

  useEffect(() => {
    if (initialBook) {
      setTitle(initialBook.title);
      setAuthor(initialBook.author);
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
  }, [initialBook, open]);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
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
      } catch (err) {
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
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., De aanslag"
            required
            autoFocus
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
                          + Add "{genreInputValue}"
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
                      + Add "{genreInputValue}"
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
