'use client';

import { Book } from '@/lib/hooks/useBooks';
import { Button } from '@/components/ui/Button';

interface LentBooksTableProps {
  books: Book[];
  onMarkReturned: (id: string) => Promise<void>;
}

export function LentBooksTable({ books, onMarkReturned }: LentBooksTableProps) {
  const lentBooks = books.filter((b) => b.lent);

  if (lentBooks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Geen boeken uitgeleend</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Author</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Genre</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Lent to</th>
            <th className="text-right py-3 px-4 font-medium text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {lentBooks.map((book) => (
            <tr key={book.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-gray-900 font-medium">{book.title}</td>
              <td className="py-3 px-4 text-gray-700">{book.author}</td>
              <td className="py-3 px-4">
                {book.genre ? (
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                    {book.genre}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                {book.lent_to ? (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    {book.lent_to}
                  </span>
                ) : (
                  <span className="text-gray-400">Onbekend</span>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onMarkReturned(book.id)}
                >
                  ✅ Terug ontvangen
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
