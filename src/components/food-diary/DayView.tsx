'use client';

import { useState } from 'react';
import {
  FoodItem,
  ItemInput,
  MealSlot,
  MEAL_SLOTS,
  useFoodDiary,
} from '@/lib/hooks/useFoodDiary';
import { MealCard } from './MealCard';
import { ItemDialog } from './ItemDialog';
import { ComplaintDialog } from './ComplaintDialog';

interface DayViewProps {
  diary: ReturnType<typeof useFoodDiary>;
  dateKey: string;
  date: Date;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const DATE_FMT = new Intl.DateTimeFormat('nl-BE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface ItemDialogState {
  slot: MealSlot;
  item: FoodItem | null;
}

export function DayView({
  diary,
  dateKey,
  date,
  isToday,
  onPrev,
  onNext,
  onToday,
}: DayViewProps) {
  const day = diary.getDay(dateKey);
  const [itemDialog, setItemDialog] = useState<ItemDialogState | null>(null);
  const [complaintSlot, setComplaintSlot] = useState<MealSlot | null>(null);

  const handleItemSubmit = (input: ItemInput) => {
    if (!itemDialog) return;
    if (itemDialog.item) {
      diary.updateItem(dateKey, itemDialog.slot, itemDialog.item.id, input);
    } else {
      diary.addItem(dateKey, itemDialog.slot, input);
    }
  };

  return (
    <div>
      {/* Datumbalk */}
      <div className="rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgba(58,58,68,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <NavButton label="Vorige dag" onClick={onPrev}>
            ‹
          </NavButton>
          <div className="text-center">
            <p className="font-semibold" style={{ color: 'var(--et-ink)' }}>
              {capitalize(DATE_FMT.format(date))}
            </p>
            {!isToday && (
              <button
                type="button"
                onClick={onToday}
                className="mt-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'var(--et-accent-soft)', color: 'var(--et-accent)' }}
              >
                Ga naar vandaag
              </button>
            )}
            {isToday && (
              <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--et-accent)' }}>
                Vandaag
              </p>
            )}
          </div>
          <NavButton label="Volgende dag" onClick={onNext}>
            ›
          </NavButton>
        </div>
      </div>

      {/* Eetmomenten */}
      <div className="mt-4 space-y-4">
        {MEAL_SLOTS.map((def, i) => (
          <MealCard
            key={def.slot}
            def={def}
            index={i}
            items={day.meals[def.slot]}
            complaints={day.complaints[def.slot]}
            onAdd={() => setItemDialog({ slot: def.slot, item: null })}
            onEditItem={(item) => setItemDialog({ slot: def.slot, item })}
            onRemoveItem={(itemId) => diary.removeItem(dateKey, def.slot, itemId)}
            onComplaint={() => setComplaintSlot(def.slot)}
            onRemoveComplaint={(cid) => diary.removeComplaint(dateKey, def.slot, cid)}
          />
        ))}
      </div>

      {itemDialog && (
        <ItemDialog
          slot={itemDialog.slot}
          initial={itemDialog.item}
          library={diary.library}
          onClose={() => setItemDialog(null)}
          onSubmit={handleItemSubmit}
        />
      )}

      {complaintSlot && (
        <ComplaintDialog
          slot={complaintSlot}
          complaints={day.complaints[complaintSlot]}
          onClose={() => setComplaintSlot(null)}
          onAdd={(desc) => diary.addComplaint(dateKey, complaintSlot, desc)}
          onRemove={(cid) => diary.removeComplaint(dateKey, complaintSlot, cid)}
        />
      )}
    </div>
  );
}

function NavButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition-all hover:scale-105 active:scale-95"
      style={{ background: 'var(--et-accent-soft)', color: 'var(--et-accent)' }}
    >
      {children}
    </button>
  );
}
