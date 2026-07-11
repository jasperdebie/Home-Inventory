'use client';

import { useEffect, useRef, useState } from 'react';
import { CookbookProduct } from '@/lib/supabase/types';

interface ProductSearchBarProps {
  selected: CookbookProduct[];
  mode: 'AND' | 'OR';
  onAdd: (product: CookbookProduct) => void;
  onRemove: (id: string) => void;
  onModeChange: (mode: 'AND' | 'OR') => void;
}

export function ProductSearchBar({ selected, mode, onAdd, onRemove, onModeChange }: ProductSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CookbookProduct[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cookbook-products?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data: CookbookProduct[] = await res.json();
        // Exclude already-selected products
        const selectedIds = new Set(selected.map((p) => p.id));
        setSuggestions(data.filter((p) => !selectedIds.has(p.id)));
        setOpen(true);
      } catch {
        // ignore
      }
    }, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, selected]);

  const handleSelect = (product: CookbookProduct) => {
    onAdd(product);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Input */}
      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-[var(--cb-line)] shadow-sm">
          <svg className="w-4 h-4 text-[var(--cb-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && suggestions.length > 0 && setOpen(true)}
            placeholder="Zoek op ingredient (bv. kip, courgette…)"
            className="flex-1 bg-transparent text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-muted)] outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
              className="text-[var(--cb-muted)] hover:text-[var(--cb-ink)]"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-white rounded-2xl border border-[var(--cb-line)] shadow-lg overflow-hidden">
            {suggestions.map((p) => (
              <button
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                className="w-full px-4 py-2.5 text-sm text-left text-[var(--cb-ink)] hover:bg-[var(--cb-accent-soft)] transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips + AND/OR toggle */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--cb-accent)] text-white rounded-full text-sm"
            >
              {p.name}
              <button
                onClick={() => onRemove(p.id)}
                className="ml-0.5 opacity-75 hover:opacity-100 text-base leading-none"
                aria-label={`Verwijder ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}

          {selected.length >= 2 && (
            <div className="flex items-center gap-1 bg-[var(--cb-accent-soft)] rounded-full px-1 py-0.5">
              {(['AND', 'OR'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors
                    ${mode === m
                      ? 'bg-[var(--cb-accent)] text-white'
                      : 'text-[var(--cb-accent)]'
                    }`}
                >
                  {m === 'AND' ? 'Alles' : 'Eén van'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
