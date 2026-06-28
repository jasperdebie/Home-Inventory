'use client';

import { Book } from '@/lib/hooks/useBooks';

interface BookStatisticsProps {
  books: Book[];
}

export function BookStatistics({ books }: BookStatisticsProps) {
  const totalBooks = books.length;
  const readBooks = books.filter((b) => b.read).length;
  const boughtBooks = books.filter((b) => b.bought).length;
  const boughtAndRead = books.filter((b) => b.bought && b.read).length;
  const boughtNotRead = books.filter((b) => b.bought && !b.read).length;
  const readNotBought = books.filter((b) => !b.bought && b.read).length;
  const lentBooks = books.filter((b) => b.lent).length;

  const stats = [
    {
      label: 'Gelezen boeken',
      count: readBooks,
      total: totalBooks,
      color: 'bg-green-100 border-green-300 text-green-700',
    },
    {
      label: 'Aangekochte boeken',
      count: boughtBooks,
      total: totalBooks,
      color: 'bg-blue-100 border-blue-300 text-blue-700',
    },
    {
      label: 'Gekocht én gelezen',
      count: boughtAndRead,
      total: totalBooks,
      color: 'bg-emerald-100 border-emerald-300 text-emerald-700',
    },
    {
      label: 'Gekocht, nog te lezen',
      count: boughtNotRead,
      total: totalBooks,
      color: 'bg-amber-100 border-amber-300 text-amber-700',
    },
    {
      label: 'Gelezen, niet gekocht',
      count: readNotBought,
      total: totalBooks,
      color: 'bg-purple-100 border-purple-300 text-purple-700',
    },
    {
      label: 'Momenteel uitgeleend',
      count: lentBooks,
      total: totalBooks,
      color: 'bg-red-100 border-red-300 text-red-700',
    },
  ];

  const genreStats = books.reduce(
    (acc, book) => {
      if (!book.genre) return acc;
      const existing = acc.find((g) => g.name === book.genre);
      if (existing) {
        existing.total += 1;
        if (book.read) existing.read += 1;
      } else {
        acc.push({
          name: book.genre,
          total: 1,
          read: book.read ? 1 : 0,
        });
      }
      return acc;
    },
    [] as Array<{ name: string; total: number; read: number }>
  );

  genreStats.sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const percentage = totalBooks > 0 ? Math.round((stat.count / totalBooks) * 100) : 0;
          return (
            <div
              key={stat.label}
              className={`border rounded-lg p-4 ${stat.color}`}
            >
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm mb-3">{stat.label}</div>
              <div className="text-xs mb-2">{percentage}% of total</div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${stat.color.split(' ')[0]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {genreStats.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Per genre</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Genre</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Total</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Read</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">%</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Progress</th>
                </tr>
              </thead>
              <tbody>
                {genreStats.map((genre) => {
                  const readPercentage = Math.round((genre.read / genre.total) * 100);
                  return (
                    <tr key={genre.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-900 font-medium">{genre.name}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{genre.total}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{genre.read}</td>
                      <td className="py-3 px-3 text-right text-gray-700 font-medium">
                        {readPercentage}%
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${readPercentage}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
