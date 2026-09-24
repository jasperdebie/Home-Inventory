'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePeople } from '@/lib/hooks/usePeople';
import { useProducts } from '@/lib/hooks/useProducts';
import { buildUpcoming, daysUntil, toDateKey, type UpcomingEntry } from '@/lib/people/shared';
import { relativeDayLabel } from '@/components/people/UpcomingList';

const EXPIRY_WINDOW_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 30;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;
const SWIPE_THRESHOLD_PX = 50;
const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 7;
// Kleine verschuiving elke paar minuten tegen inbranden van het AMOLED-scherm.
const BURN_IN_OFFSETS = [
  [0, 0],
  [3, 2],
  [-2, 3],
  [2, -3],
  [-3, -2],
];

function birthdayAge(birthday: string, birthdayHasYear: boolean, nextDate: string): number | null {
  if (!birthdayHasYear) return null;
  return Number(nextDate.slice(0, 4)) - Number(birthday.slice(0, 4));
}

function expiryLabel(days: number): string {
  if (days < 0) return days === -1 ? 'Gisteren verlopen' : `${Math.abs(days)} dagen verlopen`;
  if (days === 0) return 'Vervalt vandaag';
  if (days === 1) return 'Vervalt morgen';
  return `Nog ${days} dagen`;
}

function expiryStyle(days: number): { border: string; text: string } {
  if (days < 0) return { border: 'border-red-500', text: 'text-red-400' };
  if (days <= 2) return { border: 'border-orange-500', text: 'text-orange-400' };
  return { border: 'border-yellow-500', text: 'text-yellow-300' };
}

function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-neutral-800 px-6 py-8 text-xl text-neutral-500">{text}</p>;
}

function SectionTitle({ icon, title, count }: { icon: string; title: string; count: number }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold text-neutral-300">
      <span>{icon}</span>
      <span>{title}</span>
      {count > 0 && (
        <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-base font-medium text-neutral-400">{count}</span>
      )}
    </h2>
  );
}

function BirthdayCard({ entry, age }: { entry: UpcomingEntry; age: number | null }) {
  const isToday = entry.daysUntil === 0;
  const isSoon = entry.daysUntil === 1;
  return (
    <Link
      href={`/people/${entry.personId}`}
      className={`flex items-center gap-4 rounded-2xl border-l-4 px-5 py-4 transition-colors ${
        isToday
          ? 'border-rose-400 bg-rose-950/60 hover:bg-rose-950'
          : isSoon
            ? 'border-rose-500/70 bg-neutral-900 hover:bg-neutral-800'
            : 'border-neutral-700 bg-neutral-900 hover:bg-neutral-800'
      }`}
    >
      <span className={isToday ? 'text-5xl' : 'text-3xl'}>{isToday ? '🎉' : '🎂'}</span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold ${isToday ? 'text-3xl text-white' : 'text-2xl text-neutral-100'}`}>
          {entry.personName}
        </span>
        <span className="block text-lg text-neutral-400">
          {isToday ? 'Vandaag jarig!' : formatShortDate(entry.nextDate)}
          {age !== null && ` · wordt ${age}`}
        </span>
      </span>
      <span className={`whitespace-nowrap text-xl font-medium ${isToday || isSoon ? 'text-rose-300' : 'text-neutral-400'}`}>
        {isToday ? '' : relativeDayLabel(entry.daysUntil)}
      </span>
    </Link>
  );
}

function BringCard({ entry }: { entry: UpcomingEntry }) {
  const urgent = entry.daysUntil <= 1;
  const overdue = entry.daysUntil < 0;
  return (
    <Link
      href={`/people/${entry.personId}`}
      className={`flex items-center gap-4 rounded-2xl border-l-4 px-5 py-4 transition-colors ${
        urgent ? 'border-amber-400 bg-amber-950/50 hover:bg-amber-950' : 'border-neutral-700 bg-neutral-900 hover:bg-neutral-800'
      }`}
    >
      <span className="text-3xl">🎒</span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-2xl font-semibold leading-tight text-neutral-100">{entry.label}</span>
        <span className="block text-lg text-neutral-400">voor {entry.personName}</span>
      </span>
      <span
        className={`whitespace-nowrap text-xl font-medium ${
          overdue ? 'text-red-400' : urgent ? 'text-amber-300' : 'text-neutral-400'
        }`}
      >
        {relativeDayLabel(entry.daysUntil)}
      </span>
    </Link>
  );
}

export default function TvDashboardPage() {
  // Klok pas in de browser starten: een server-gerenderde tijd matcht nooit met de client.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(clock);
  }, []);

  if (!now) return <div className="h-screen w-screen bg-black" />;
  return <Dashboard now={now} />;
}

function Dashboard({ now }: { now: Date }) {
  const { people, refetch: refetchPeople } = usePeople();
  const { products, refetch: refetchProducts } = useProducts();
  const [screen, setScreen] = useState<0 | 1>(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const refresh = setInterval(() => {
      refetchPeople();
      refetchProducts();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(refresh);
  }, [refetchPeople, refetchProducts]);

  // Herbereken "vandaag" pas als de datum wisselt, niet bij elke kloktik.
  const todayKey = toDateKey(now);
  const today = useMemo(() => {
    const [y, m, d] = todayKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [todayKey]);

  const upcoming = useMemo(() => buildUpcoming(people, today, UPCOMING_WINDOW_DAYS), [people, today]);
  const birthdays = upcoming.filter((e) => e.kind === 'birthday');
  const bringReminders = upcoming.filter((e) => e.reminderType === 'bring');

  const expiring = useMemo(() => {
    return products
      .filter((p) => p.expires_at)
      .map((p) => ({ ...p, daysLeft: daysUntil((p.expires_at as string).slice(0, 10), today) }))
      .filter((p) => p.daysLeft <= EXPIRY_WINDOW_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products, today]);

  const hour = now.getHours();
  const isNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  const [shiftX, shiftY] = BURN_IN_OFFSETS[Math.floor(now.getMinutes() / 3) % BURN_IN_OFFSETS.length];

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
      className="relative h-screen w-screen select-none overflow-hidden bg-black text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`flex h-full flex-col transition-opacity duration-1000 ${isNight ? 'opacity-40' : 'opacity-100'}`}
        style={{ transform: `translate(${shiftX}px, ${shiftY}px)` }}
      >
        <header className="flex items-end justify-between px-8 pt-6 pb-4">
          <div>
            <div className="text-6xl font-light tabular-nums tracking-tight">
              {now.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-1 text-xl capitalize text-neutral-400">
              {now.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div className="text-lg text-neutral-500">{screen === 0 ? 'Binnenkort' : 'Voorraad'}</div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-out"
            style={{ transform: screen === 0 ? 'translateX(0)' : 'translateX(-50%)' }}
          >
            <section className="grid h-full w-1/2 shrink-0 grid-cols-1 content-start gap-8 overflow-y-auto px-8 pb-16 landscape:grid-cols-2">
              <div>
                <SectionTitle icon="🎂" title="Verjaardagen" count={birthdays.length} />
                {birthdays.length === 0 ? (
                  <EmptyState text="Geen verjaardagen de komende 30 dagen." />
                ) : (
                  <ul className="space-y-3">
                    {birthdays.map((e, i) => {
                      const person = people.find((p) => p.id === e.personId);
                      const age = person?.birthday
                        ? birthdayAge(person.birthday, person.birthday_has_year, e.nextDate)
                        : null;
                      return (
                        <li key={`b-${e.personId}-${i}`}>
                          <BirthdayCard entry={e} age={age} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <SectionTitle icon="🎒" title="Niet vergeten mee te nemen" count={bringReminders.length} />
                {bringReminders.length === 0 ? (
                  <EmptyState text="Niets om mee te nemen." />
                ) : (
                  <ul className="space-y-3">
                    {bringReminders.map((e, i) => (
                      <li key={`r-${e.personId}-${i}`}>
                        <BringCard entry={e} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="h-full w-1/2 shrink-0 overflow-y-auto px-8 pb-16">
              <SectionTitle icon="⏳" title="Bijna over datum" count={expiring.length} />
              {expiring.length === 0 ? (
                <EmptyState text="Niets vervalt deze week. 👍" />
              ) : (
                <ul className="grid grid-cols-1 gap-3 landscape:grid-cols-2">
                  {expiring.map((p) => {
                    const style = expiryStyle(p.daysLeft);
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/products/${p.id}`}
                          className={`flex items-center gap-4 rounded-2xl border-l-4 bg-neutral-900 px-5 py-4 transition-colors hover:bg-neutral-800 ${style.border}`}
                        >
                          <span className="text-3xl">{p.category?.icon ?? '🥫'}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-2xl font-semibold text-neutral-100">{p.name}</span>
                            <span className={`block text-lg font-medium ${style.text}`}>{expiryLabel(p.daysLeft)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3">
        {([0, 1] as const).map((i) => (
          <button
            key={i}
            aria-label={`Scherm ${i + 1}`}
            onClick={() => setScreen(i)}
            className={`h-3 rounded-full transition-all ${screen === i ? 'w-8 bg-white' : 'w-3 bg-neutral-700'}`}
          />
        ))}
      </div>
    </div>
  );
}
