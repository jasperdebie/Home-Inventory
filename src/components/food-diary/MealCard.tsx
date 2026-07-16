'use client';

import { Complaint, FoodItem, MealSlotDef } from '@/lib/hooks/useFoodDiary';

interface MealCardProps {
  def: MealSlotDef;
  items: FoodItem[];
  complaints: Complaint[];
  index: number;
  onAdd: () => void;
  onEditItem: (item: FoodItem) => void;
  onRemoveItem: (itemId: string) => void;
  onComplaint: () => void;
  onRemoveComplaint: (complaintId: string) => void;
}

export function MealCard({
  def,
  items,
  complaints,
  index,
  onAdd,
  onEditItem,
  onRemoveItem,
  onComplaint,
  onRemoveComplaint,
}: MealCardProps) {
  return (
    <div
      className="et-card-in rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(58,58,68,0.06)] transition-shadow hover:shadow-[0_8px_28px_rgba(58,58,68,0.10)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Titel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
            style={{ background: 'var(--et-accent-soft)' }}
          >
            {def.icon}
          </span>
          <h3 className="font-bold" style={{ color: 'var(--et-ink)' }}>
            {def.label}
          </h3>
        </div>
        {complaints.length > 0 && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: 'var(--et-apricot)', color: '#fff' }}
          >
            ⚠️ {complaints.length}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="mt-4 space-y-2.5">
        {items.length === 0 ? (
          <p className="px-1 text-sm italic" style={{ color: 'var(--et-muted)' }}>
            Nog niets gelogd.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-3 rounded-2xl px-3 py-2.5"
              style={{ background: '#FBFBFE' }}
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm"
                style={{ background: 'var(--et-accent-soft)' }}
              >
                {item.type === 'food' ? '🍴' : '🥤'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug" style={{ color: 'var(--et-ink)' }}>
                  {item.name}
                </p>
                {item.comment && (
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--et-muted)' }}>
                    💬 {item.comment}
                  </p>
                )}
                {item.ingredients && (
                  <span
                    className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs"
                    style={{ background: 'var(--et-accent-soft)', color: 'var(--et-ink)' }}
                  >
                    🧾 {item.ingredients}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onEditItem(item)}
                  aria-label="Bewerken"
                  className="rounded-full px-1.5 text-sm hover:opacity-100"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label="Verwijderen"
                  className="rounded-full px-1.5 text-sm hover:opacity-100"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Klachten */}
      {complaints.length > 0 && (
        <div className="mt-3 space-y-2">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-sm"
              style={{ background: 'var(--et-apricot-soft)', color: 'var(--et-ink)' }}
            >
              <span>⚠️ {c.description}</span>
              <button
                type="button"
                onClick={() => onRemoveComplaint(c.id)}
                aria-label="Klacht verwijderen"
                className="shrink-0 rounded-full px-1.5 leading-none opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acties */}
      <div className="mt-4 flex gap-2.5">
        <button type="button" onClick={onAdd} className="et-btn-primary flex-1">
          + Toevoegen
        </button>
        <button type="button" onClick={onComplaint} className="et-btn-ghost">
          ⚠️ Klacht
        </button>
      </div>
    </div>
  );
}
