'use client';

import { Book } from '@/lib/hooks/useBooks';
import { BookCard } from './BookCard';
import { BookFiltersState } from './BookFilters';

interface BookGridProps {
  books: Book[];
  filters: BookFiltersState;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
}

export function BookGrid({ books, filters, onEdit, onDelete }: BookGridProps) {
  const filteredBooks = books.filter((book) => {
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      if (
        !book.title.toLowerCase().includes(query) &&
        !book.author.toLowerCase().includes(query) &&
        !book.isbn?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Genre filter
    if (filters.genre && book.genre !== filters.genre) {
      return false;
    }

    // Read status filter
    if (filters.readStatus === 'read' && !book.read) return false;
    if (filters.readStatus === 'unread' && book.read) return false;

    // Lent status filter
    if (filters.lentStatus === 'lent' && !book.lent) return false;
    if (filters.lentStatus === 'available' && book.lent) return false;

    // Bought status filter
    if (filters.boughtStatus === 'bought' && !book.bought) return false;
    if (filters.boughtStatus === 'notbought' && book.bought) return false;

    return true;
  });

  if (filteredBooks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Geen boeken gevonden</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredBooks.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
