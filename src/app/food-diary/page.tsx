'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toDateKey, useFoodDiary } from '@/lib/hooks/useFoodDiary';
import { DayView } from '@/components/food-diary/DayView';
import { MonthView } from '@/components/food-diary/MonthView';
import { LibraryDialog } from '@/components/food-diary/LibraryDialog';

type Tab = 'day' | 'overview';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function FoodDiaryPage() {
  const diary = useFoodDiary();

  const [tab, setTab] = useState<Tab>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [month, setMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [libraryOpen, setLibraryOpen] = useState(false);

  const todayKey = toDateKey(new Date());
  const dateKey = toDateKey(selectedDate);
  const isToday = dateKey === todayKey;

  const shiftDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(startOfDay(next));
  };

  const shiftMonth = (delta: number) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const selectDayFromCalendar = (date: Date) => {
    setSelectedDate(startOfDay(date));
    setTab('day');
  };

  return (
    <div className="et-page min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-[780px]">
        {/* Koptekst */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-[0_6px_16px_rgba(142,156,242,0.35)]"
              style={{ background: 'var(--et-gradient)' }}
            >
              🍽️
            </span>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--et-ink)' }}>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'var(--et-gradient)' }}
              >
                Eet
              </span>
              -tracker
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            aria-label="Bibliotheek openen"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-[0_4px_16px_rgba(58,58,68,0.08)] transition-transform hover:scale-105 active:scale-95"
          >
            📖
          </button>
        </header>

        {/* Terug-link */}
        <div className="mt-3">
          <Link
            href="/"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--et-muted)' }}
          >
            ← Terug naar start
          </Link>
        </div>

        {/* Tabs */}
        <div
          className="mt-4 grid grid-cols-2 gap-1 rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <TabButton active={tab === 'day'} onClick={() => setTab('day')}>
            Dag
          </TabButton>
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
            Overzicht
          </TabButton>
        </div>

        {/* Actieve weergave */}
        <div className="mt-4">
          {!diary.loaded ? (
            <div className="py-20 text-center text-sm" style={{ color: 'var(--et-muted)' }}>
              Laden…
            </div>
          ) : tab === 'day' ? (
            <DayView
              diary={diary}
              dateKey={dateKey}
              date={selectedDate}
              isToday={isToday}
              onPrev={() => shiftDay(-1)}
              onNext={() => shiftDay(1)}
              onToday={() => setSelectedDate(startOfDay(new Date()))}
            />
          ) : (
            <MonthView
              diary={diary}
              month={month}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
              onSelectDay={selectDayFromCalendar}
            />
          )}
        </div>
      </div>

      {libraryOpen && (
        <LibraryDialog
          library={diary.library}
          onClose={() => setLibraryOpen(false)}
          onRemove={diary.removeLibraryItem}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full py-2 text-sm font-semibold transition-all"
      style={
        active
          ? { background: 'var(--et-gradient)', color: '#fff', boxShadow: '0 4px 12px rgba(142,156,242,0.35)' }
          : { background: 'transparent', color: 'var(--et-muted)' }
      }
    >
      {children}
    </button>
  );
}
