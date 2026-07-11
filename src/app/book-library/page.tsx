'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBooks } from '@/lib/hooks/useBooks';
import { useBookGenres } from '@/lib/hooks/useBookGenres';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { BookTabs } from '@/components/book-library/BookTabs';
import { BookFilters, BookFiltersState } from '@/components/book-library/BookFilters';
import { BookGrid } from '@/components/book-library/BookGrid';
import { BookForm } from '@/components/book-library/BookForm';
import { BookStatistics } from '@/components/book-library/BookStatistics';
import { LentBooksTable } from '@/components/book-library/LentBooksTable';
import { Book } from '@/lib/hooks/useBooks';

type TabType = 'overview' | 'wishlist' | 'statistics' | 'lent';

export default function BookLibraryPage() {
  const { books, loading, createBook, updateBook, deleteBook } = useBooks();
  const { genreNames, addGenre } = useBookGenres();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [filters, setFilters] = useState<BookFiltersState>({
    search: '',
    genre: '',
    readStatus: 'all',
    lentStatus: 'all',
    boughtStatus: 'all',
  });

  const handleAddBook = () => {
    setEditingBook(null);
    setFormOpen(true);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setFormOpen(true);
  };

  const handleFormSubmit = async (bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingBook) {
        await updateBook(editingBook.id, bookData);
        toast('Book updated');
      } else {
        await createBook(bookData);
        toast('Book added');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save book', 'error');
      throw err;
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBook(id);
      toast('Book deleted');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete book', 'error');
    }
  };

  const handleMarkReturned = async (id: string) => {
    try {
      await updateBook(id, { lent: false, lent_to: null });
      toast('Book marked as returned');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to mark book as returned', 'error');
    }
  };

  const lentCount = books.filter((b) => b.lent).length;
  const wishlistCount = books.filter((b) => b.wishlist).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                title="Back to apps"
              >
                ←
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📚 Book Library</h1>
                <p className="text-sm text-gray-600">{books.filter(b => !b.wishlist).length} boeken in collectie</p>
              </div>
            </div>
            <Button onClick={handleAddBook}>+ Add Book</Button>
          </div>

          {/* Tabs */}
          <BookTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            lentCount={lentCount}
            wishlistCount={wishlistCount}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <BookFilters
                filters={filters}
                onFiltersChange={setFilters}
                genres={genreNames}
              />
              <BookGrid
                books={books}
                filters={filters}
                onEdit={handleEditBook}
                onDelete={handleDeleteBook}
              />
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                ⭐ Boeken op je verlanglijst — nog niet gekocht, maar graag wil je ze lezen.
              </div>
              <BookFilters
                filters={filters}
                onFiltersChange={setFilters}
                genres={genreNames}
              />
              <BookGrid
                books={books}
                filters={filters}
                onEdit={handleEditBook}
                onDelete={handleDeleteBook}
                wishlistOnly
              />
            </div>
          )}

          {activeTab === 'statistics' && (
            <BookStatistics books={books} />
          )}

          {activeTab === 'lent' && (
            <LentBooksTable
              books={books}
              onMarkReturned={handleMarkReturned}
            />
          )}
        </div>
      </div>

      {/* Form Modal */}
      <BookForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        initialBook={editingBook}
        genres={genreNames}
        onAddGenre={addGenre}
      />
    </div>
  );
}
