'use client';

import { Book } from '@/lib/hooks/useBooks';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
}

export function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  const handleDelete = () => {
    if (confirm(`Delete "${book.title}" by ${book.author}?`)) {
      onDelete(book.id);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
          <p className="text-sm text-gray-600">{book.author}</p>
          {book.isbn && <p className="text-xs text-gray-500 mt-1">ISBN: {book.isbn}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(book)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {book.genre && (
        <p className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full inline-block mb-3">
          {book.genre}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {book.wishlist && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            ⭐ Verlanglijst
          </span>
        )}
        {book.read && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
            ✓ Gelezen
          </span>
        )}
        {book.bought && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            ✓ Gekocht
          </span>
        )}
        {book.lent && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
            🔴 Uitgeleend {book.lent_to && `aan ${book.lent_to}`}
          </span>
        )}
        {book.hardcover && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            📕 Hardcover
          </span>
        )}
        {book.first_edition && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
            🥇 Eerste druk
          </span>
        )}
        {book.condition && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
            {book.condition}
          </span>
        )}
      </div>

      {book.notes && (
        <p className="text-sm text-gray-600 line-clamp-2 italic">{book.notes}</p>
      )}
    </div>
  );
}
