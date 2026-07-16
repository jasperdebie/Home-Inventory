'use client';

import { useEffect, useRef, useState } from 'react';
import { Complaint, MealSlot, MEAL_SLOTS } from '@/lib/hooks/useFoodDiary';

interface ComplaintDialogProps {
  slot: MealSlot;
  complaints: Complaint[];
  onClose: () => void;
  onAdd: (description: string) => void;
  onRemove: (complaintId: string) => void;
}

export function ComplaintDialog({
  slot,
  complaints,
  onClose,
  onAdd,
  onRemove,
}: ComplaintDialogProps) {
  const slotDef = MEAL_SLOTS.find((m) => m.slot === slot)!;
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canAdd = description.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd(description);
    setDescription('');
    inputRef.current?.focus();
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
          ⚠️ Klacht
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--et-muted)' }}>
            {slotDef.icon} {slotDef.label}
          </span>
        </h2>

        {complaints.length > 0 && (
          <ul className="mt-4 space-y-2">
            {complaints.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-sm"
                style={{ background: 'var(--et-apricot-soft)', color: 'var(--et-ink)' }}
              >
                <span>{c.description}</span>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  aria-label="Klacht verwijderen"
                  className="shrink-0 rounded-full px-1.5 text-base leading-none opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--et-ink)' }}>
            Omschrijving
          </label>
          <input
            ref={inputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Bijv. opgeblazen gevoel, hoofdpijn…"
            className="et-input"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="et-btn-ghost flex-1">
            Sluiten
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="et-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
