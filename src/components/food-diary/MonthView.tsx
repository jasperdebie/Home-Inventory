'use client';

import { useMemo } from 'react';
import { toDateKey, useFoodDiary } from '@/lib/hooks/useFoodDiary';

interface MonthViewProps {
  diary: ReturnType<typeof useFoodDiary>;
  month: Date; // eerste dag van de getoonde maand
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (date: Date) => void;
}

const MONTH_FMT = new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MonthView({ diary, month, onPrev, onNext, onSelectDay }: MonthViewProps) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const { cells, foodDays, complaintDays } = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    // Maandag = 0 … zondag = 6
    const leading = (firstOfMonth.getDay() + 6) % 7;

    const grid: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, m, d));
    while (grid.length % 7 !== 0) grid.push(null);

    let foodCount = 0;
    let complaintCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toDateKey(new Date(year, m, d));
      if (diary.dayHasFood(key)) foodCount++;
      if (diary.dayHasComplaints(key)) complaintCount++;
    }

    return { cells: grid, foodDays: foodCount, complaintDays: complaintCount };
  }, [month, diary]);

  return (
    <div>
      {/* Maandbalk */}
      <div className="rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgba(58,58,68,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <NavButton label="Vorige maand" onClick={onPrev}>
            ‹
          </NavButton>
          <p className="font-semibold" style={{ color: 'var(--et-ink)' }}>
            {capitalize(MONTH_FMT.format(month))}
          </p>
          <NavButton label="Volgende maand" onClick={onNext}>
            ›
          </NavButton>
        </div>
      </div>

      {/* Legende */}
      <div className="mt-4 flex items-center justify-center gap-5 text-sm" style={{ color: 'var(--et-muted)' }}>
        <span className="flex items-center gap-1.5">
          <Dot color="var(--et-mint)" /> eten gelogd
        </span>
        <span className="flex items-center gap-1.5">
          <Dot color="var(--et-apricot)" /> klachten
        </span>
      </div>

      {/* Kalender */}
      <div className="mt-4 rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgba(58,58,68,0.06)]">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-xs font-semibold" style={{ color: 'var(--et-muted)' }}>
              {w}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;
            const key = toDateKey(date);
            const hasFood = diary.dayHasFood(key);
            const hasComplaints = diary.dayHasComplaints(key);
            const isToday = key === todayKey;
            const isFuture = key > todayKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDay(date)}
                className="flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition-all hover:bg-[var(--et-accent-soft)]"
                style={{
                  border: isToday ? '2px solid var(--et-accent)' : '2px solid transparent',
                  color: isFuture ? 'var(--et-muted)' : 'var(--et-ink)',
                  opacity: isFuture ? 0.5 : 1,
                }}
              >
                <span className={isToday ? 'font-bold' : 'font-medium'}>{date.getDate()}</span>
                <span className="mt-1 flex h-2 gap-1">
                  {hasFood && <Dot color="var(--et-mint)" />}
                  {hasComplaints && <Dot color="var(--et-apricot)" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistiek-tegels */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <StatTile value={foodDays} label="dagen met eten gelogd" color="var(--et-mint)" />
        <StatTile value={complaintDays} label="dagen met klachten" color="var(--et-apricot)" />
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 text-center shadow-[0_4px_20px_rgba(58,58,68,0.06)]">
      <p className="text-4xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--et-muted)' }}>
        {label}
      </p>
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
