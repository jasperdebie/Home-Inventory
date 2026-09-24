'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePeople } from '@/lib/hooks/usePeople';
import { useProducts } from '@/lib/hooks/useProducts';
import { buildUpcoming, daysUntil } from '@/lib/people/shared';
import { relativeDayLabel } from '@/components/people/UpcomingList';

const EXPIRY_WINDOW_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 30;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const SWIPE_THRESHOLD_PX = 50;

function birthdayAgeLabel(birthday: string, birthdayHasYear: boolean, nextDate: string): string {
  if (!birthdayHasYear) return '';
  const birthYear = Number(birthday.slice(0, 4));
  const nextYear = Number(nextDate.slice(0, 4));
  return ` (${nextYear - birthYear})`;
}

export default function TvDashboardPage() {
  const { people, refetch: refetchPeople } = usePeople();
  const { products, refetch: refetchProducts } = useProducts();
  const [screen, setScreen] = useState<0 | 1>(0);
  const touchStartX = useRef<number | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchPeople();
      refetchProducts();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetchPeople, refetchProducts]);

  const birthdays = useMemo(
    () => buildUpcoming(people, today, UPCOMING_WINDOW_DAYS).filter((e) => e.kind === 'birthday'),
    [people, today],
  );
  const bringReminders = useMemo(
    () => buildUpcoming(people, today, UPCOMING_WINDOW_DAYS).filter((e) => e.reminderType === 'bring'),
    [people, today],
  );

  const expiring = useMemo(() => {
    return products
      .filter((p) => p.expires_at)
      .map((p) => ({ ...p, daysLeft: daysUntil((p.expires_at as string).slice(0, 10), today) }))
      .filter((p) => p.daysLeft <= EXPIRY_WINDOW_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products, today]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    setScreen(delta < 0 ? 1 : 0);
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-slate-900 text-white relative select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full w-[200%] transition-transform duration-300 ease-out"
        style={{ transform: screen === 0 ? 'translateX(0)' : 'translateX(-50%)' }}
      >
        <section className="h-full w-1/2 shrink-0 overflow-y-auto px-8 py-10">
          <h1 className="text-4xl font-bold mb-6">🎂 Verjaardagen</h1>
          {birthdays.length === 0 ? (
            <p className="text-2xl text-slate-400 mb-12">Geen verjaardagen binnenkort.</p>
          ) : (
            <ul className="space-y-4 mb-12">
              {birthdays.map((e, i) => {
                const person = people.find((p) => p.id === e.personId);
                const ageLabel = person?.birthday
                  ? birthdayAgeLabel(person.birthday, person.birthday_has_year, e.nextDate)
                  : '';
                return (
                  <li
                    key={`b-${e.personId}-${i}`}
                    className="flex items-center justify-between bg-slate-800 rounded-2xl px-6 py-4"
                  >
                    <span className="text-2xl font-semibold">
                      {e.personName}
                      {ageLabel}
                    </span>
                    <span className="text-xl text-rose-300 whitespace-nowrap">{relativeDayLabel(e.daysUntil)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <h1 className="text-4xl font-bold mb-6">🎒 Niet vergeten mee te nemen</h1>
          {bringReminders.length === 0 ? (
            <p className="text-2xl text-slate-400">Niets om mee te nemen binnenkort.</p>
          ) : (
            <ul className="space-y-4">
              {bringReminders.map((e, i) => (
                <li
                  key={`r-${e.personId}-${i}`}
                  className="flex items-center justify-between bg-slate-800 rounded-2xl px-6 py-4"
                >
                  <span className="text-2xl font-semibold">
                    {e.label} <span className="text-slate-400 text-lg">— {e.personName}</span>
                  </span>
                  <span className="text-xl text-amber-300 whitespace-nowrap">{relativeDayLabel(e.daysUntil)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="h-full w-1/2 shrink-0 overflow-y-auto px-8 py-10">
          <h1 className="text-4xl font-bold mb-6">⏳ Bijna over datum</h1>
          {expiring.length === 0 ? (
            <p className="text-2xl text-slate-400">Niets loopt binnenkort af.</p>
          ) : (
            <ul className="space-y-4">
              {expiring.map((p) => (
                <li key={p.id} className="flex items-center justify-between bg-slate-800 rounded-2xl px-6 py-4">
                  <span className="text-2xl font-semibold">{p.name}</span>
                  <span
                    className={`text-xl whitespace-nowrap ${p.daysLeft < 0 ? 'text-red-400' : 'text-amber-300'}`}
                  >
                    {relativeDayLabel(p.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
        {([0, 1] as const).map((i) => (
          <button
            key={i}
            aria-label={`Scherm ${i + 1}`}
            onClick={() => setScreen(i)}
            className={`h-3 w-3 rounded-full transition-colors ${screen === i ? 'bg-white' : 'bg-slate-600'}`}
          />
        ))}
      </div>
    </div>
  );
}
