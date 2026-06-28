'use client';

import { Input } from '@/components/ui/Input';

export interface BookFiltersState {
  search: string;
  genre: string;
  readStatus: 'all' | 'read' | 'unread';
  lentStatus: 'all' | 'lent' | 'available';
  boughtStatus: 'all' | 'bought' | 'notbought';
}

interface BookFiltersProps {
  filters: BookFiltersState;
  onFiltersChange: (filters: BookFiltersState) => void;
  genres: string[];
}

export function BookFilters({ filters, onFiltersChange, genres }: BookFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleGenreChange = (value: string) => {
    onFiltersChange({ ...filters, genre: value });
  };

  const handleReadStatusChange = (value: 'all' | 'read' | 'unread') => {
    onFiltersChange({ ...filters, readStatus: value });
  };

  const handleLentStatusChange = (value: 'all' | 'lent' | 'available') => {
    onFiltersChange({ ...filters, lentStatus: value });
  };

  const handleBoughtStatusChange = (value: 'all' | 'bought' | 'notbought') => {
    onFiltersChange({ ...filters, boughtStatus: value });
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
      <Input
        placeholder="Zoeken op titel of auteur..."
        value={filters.search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
          <select
            value={filters.genre}
            onChange={(e) => handleGenreChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Alle genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leesstatus</label>
          <select
            value={filters.readStatus}
            onChange={(e) => handleReadStatusChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Alle</option>
            <option value="read">Gelezen</option>
            <option value="unread">Nog te lezen</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Uitleen</label>
          <select
            value={filters.lentStatus}
            onChange={(e) => handleLentStatusChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Alles</option>
            <option value="lent">Uitgeleend</option>
            <option value="available">Beschikbaar</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aankoop</label>
          <select
            value={filters.boughtStatus}
            onChange={(e) => handleBoughtStatusChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Alles</option>
            <option value="bought">Aangekocht</option>
            <option value="notbought">Niet aangekocht</option>
          </select>
        </div>
      </div>
    </div>
  );
}
