'use client';

import { useEffect, useState } from 'react';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  read: boolean;
  bought: boolean;
  lent: boolean;
  lent_to: string | null;
  wishlist: boolean;
  condition: string | null;
  hardcover: boolean;
  first_edition: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      setBooks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const createBook = async (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      if (!response.ok) throw new Error('Failed to create book');
      const newBook = await response.json();
      setBooks([newBook, ...books]);
      return newBook;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create book');
    }
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update book');
      const updatedBook = await response.json();
      setBooks(books.map(b => b.id === id ? updatedBook : b));
      return updatedBook;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update book');
    }
  };

  const deleteBook = async (id: string) => {
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete book');
      setBooks(books.filter(b => b.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete book');
    }
  };

  return {
    books,
    loading,
    error,
    fetchBooks,
    createBook,
    updateBook,
    deleteBook,
  };
}
