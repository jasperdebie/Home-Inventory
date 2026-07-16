'use client';

import { useMemo, useState } from 'react';
import { LibraryItem } from '@/lib/hooks/useFoodDiary';

interface LibraryDialogProps {
  library: LibraryItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function LibraryDialog({ library, onClose, onRemove }: LibraryDialogProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? library.filter((l) => l.name.toLowerCase().includes(q)) : library;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }, [library, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 et-fade"
      style={{ background: 'rgba(58,58,68,0.35)' }}
      onClick={onClose}
    >
      <div
        className="et-pop flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--et-ink)' }}>
            📖 Bibliotheek
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-full px-2 text-lg leading-none opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek in bibliotheek…"
          className="et-input mt-4"
        />

        <div className="mt-4 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm italic" style={{ color: 'var(--et-muted)' }}>
              {library.length === 0
                ? 'Nog geen opgeslagen items. Vink "Bewaar in bibliotheek" aan bij het loggen.'
                : 'Geen items gevonden.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl px-3.5 py-3"
                  style={{ background: 'var(--et-accent-soft)' }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{item.type === 'food' ? '🍴' : '🥤'}</span>
                      <span className="font-semibold" style={{ color: 'var(--et-ink)' }}>
                        {item.name}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--et-muted)' }}>
                        💬 {item.comment}
                      </p>
                    )}
                    {item.ingredients && (
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--et-muted)' }}>
                        🧾 {item.ingredients}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label="Verwijderen uit bibliotheek"
                    className="shrink-0 rounded-full px-1.5 text-base leading-none opacity-60 hover:opacity-100"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
