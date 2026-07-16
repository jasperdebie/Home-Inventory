'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FoodItem,
  ItemInput,
  ItemType,
  LibraryItem,
  MealSlot,
  MEAL_SLOTS,
} from '@/lib/hooks/useFoodDiary';

interface ItemDialogProps {
  slot: MealSlot;
  library: LibraryItem[];
  /** Bestaand item bij bewerken, anders null voor nieuw. */
  initial: FoodItem | null;
  onClose: () => void;
  onSubmit: (input: ItemInput) => void;
}

export function ItemDialog({ slot, library, initial, onClose, onSubmit }: ItemDialogProps) {
  const slotDef = MEAL_SLOTS.find((m) => m.slot === slot)!;
  const isEdit = initial !== null;

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ItemType>(initial?.type ?? 'food');
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? '');
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return library.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 6);
  }, [name, library]);

  const pickSuggestion = (item: LibraryItem) => {
    setName(item.name);
    setType(item.type);
    setComment(item.comment ?? '');
    setIngredients(item.ingredients ?? '');
    setShowSuggestions(false);
  };

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name,
      type,
      comment,
      ingredients,
      saveToLibrary,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 et-fade"
      style={{ background: 'rgba(58,58,68,0.35)' }}
      onClick={onClose}
    >
      <div
        className="et-pop w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold" style={{ color: 'var(--et-ink)' }}>
          {isEdit ? 'Item bewerken' : 'Toevoegen'}
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--et-muted)' }}>
            {slotDef.icon} {slotDef.label}
          </span>
        </h2>

        <div className="mt-5 space-y-4">
          {/* Naam met suggesties */}
          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--et-ink)' }}>
              Naam
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Bijv. yoghurt met granola"
              className="et-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="et-pop absolute z-10 mt-1 w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[var(--et-accent-soft)]"
                      style={{ color: 'var(--et-ink)' }}
                    >
                      <span>{s.type === 'food' ? '🍴' : '🥤'}</span>
                      <span className="font-medium">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Type-keuze */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--et-ink)' }}>
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <TypeChoice active={type === 'food'} onClick={() => setType('food')} icon="🍴" label="Eten" />
              <TypeChoice active={type === 'drink'} onClick={() => setType('drink')} icon="🥤" label="Drinken" />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--et-ink)' }}>
              Comment <span style={{ color: 'var(--et-muted)' }}>(optioneel)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bijv. grote portie, zelf bereid…"
              rows={2}
              className="et-input resize-none"
            />
          </div>

          {/* Ingrediënten */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--et-ink)' }}>
              Ingrediënten <span style={{ color: 'var(--et-muted)' }}>(optioneel)</span>
            </label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="pasta, gehakt, tomaat, ui, look"
              rows={2}
              className="et-input resize-none"
            />
          </div>

          {/* Bewaar in bibliotheek */}
          {!isEdit && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm" style={{ color: 'var(--et-ink)' }}>
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--et-accent)]"
              />
              Bewaar in bibliotheek
            </label>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="et-btn-ghost flex-1">
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="et-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEdit ? 'Opslaan' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeChoice({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-all"
      style={
        active
          ? { background: 'var(--et-gradient)', color: '#fff' }
          : { background: 'var(--et-accent-soft)', color: 'var(--et-ink)' }
      }
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
