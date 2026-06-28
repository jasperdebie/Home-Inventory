'use client';

import { useEffect, useState } from 'react';

export interface BookGenre {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export function useBookGenres() {
  const [genres, setGenres] = useState<BookGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/book-genres');
      if (!response.ok) throw new Error('Failed to fetch genres');
      const data = await response.json();
      setGenres(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setGenres([]);
    } finally {
      setLoading(false);
    }
  };

  const addGenre = async (name: string) => {
    try {
      const response = await fetch('/api/book-genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to add genre');
      const newGenre = await response.json();
      setGenres([...genres, newGenre]);
      return newGenre;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add genre');
    }
  };

  const genreNames = genres.map(g => g.name);

  return {
    genres,
    genreNames,
    loading,
    error,
    fetchGenres,
    addGenre,
  };
}
