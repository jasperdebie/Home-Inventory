'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePeople } from '@/lib/hooks/usePeople';
import { useProducts } from '@/lib/hooks/useProducts';
import { useShoppingList, type ShoppingGroup } from '@/lib/hooks/useShoppingList';
import { useShoppingItems } from '@/lib/hooks/useShoppingItems';
import { buildUpcoming, daysUntil, toDateKey, type UpcomingEntry } from '@/lib/people/shared';
import { relativeDayLabel } from '@/components/people/UpcomingList';

const EXPIRY_WINDOW_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 30;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;
const SWIPE_THRESHOLD_PX = 50;
const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 6;
const WAKE_DURATION_MS = 5 * 60 * 1000;
const LIGHT_START_HOUR = 7;
const LIGHT_END_HOUR = 20;
const THEME_STORAGE_KEY = 'tv-dashboard-theme';
// Kleine verschuiving elke paar minuten tegen inbranden van het AMOLED-scherm.
const BURN_IN_OFFSETS = [
  [0, 0],
  [3, 2],
  [-2, 3],
  [2, -3],
  [-3, -2],
];

const SCREEN_LABELS = ['Binnenkort', 'Voorraad', 'Boodschappen'] as const;
type ScreenIndex = 0 | 1 | 2;
const LAST_SCREEN: ScreenIndex = 2;

type ThemeMode = 'auto' | 'light' | 'dark';

const THEME_MODES: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'auto', icon: '🌓', label: 'Auto' },
  { mode: 'light', icon: '☀️', label: 'Licht' },
  { mode: 'dark', icon: '🌙', label: 'Donker' },
];

const DARK = {
  page: 'bg-black text-white',
  card: 'border-neutral-700 bg-neutral-900 hover:bg-neutral-800',
  cardPlain: 'bg-neutral-900 hover:bg-neutral-800',
  primary: 'text-neutral-100',
  strong: 'text-white',
  muted: 'text-neutral-400',
  subtle: 'text-neutral-500',
  heading: 'text-neutral-300',
  badge: 'bg-neutral-800 text-neutral-400',
  empty: 'border-neutral-800 text-neutral-500',
  toggle: 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
  dotActive: 'bg-white',
  dotIdle: 'bg-neutral-700',
  birthdayToday: 'border-rose-400 bg-rose-950/60 hover:bg-rose-950',
  birthdaySoon: 'border-rose-500/70 bg-neutral-900 hover:bg-neutral-800',
  bringUrgent: 'border-amber-400 bg-amber-950/50 hover:bg-amber-950',
  rose: 'text-rose-300',
  amber: 'text-amber-300',
  red: 'text-red-400',
  orange: 'text-orange-400',
  yellow: 'text-yellow-300',
};

type Theme = typeof DARK;

const LIGHT: Theme = {
  page: 'bg-stone-100 text-stone-900',
  card: 'border-stone-300 bg-white hover:bg-stone-50 shadow-sm',
  cardPlain: 'bg-white hover:bg-stone-50 shadow-sm',
  primary: 'text-stone-900',
  strong: 'text-stone-950',
  muted: 'text-stone-500',
  subtle: 'text-stone-400',
  heading: 'text-stone-700',
  badge: 'bg-stone-200 text-stone-600',
  empty: 'border-stone-300 text-stone-400',
  toggle: 'bg-white text-stone-600 hover:bg-stone-50 shadow-sm',
  dotActive: 'bg-stone-800',
  dotIdle: 'bg-stone-300',
  birthdayToday: 'border-rose-400 bg-rose-100 hover:bg-rose-200',
  birthdaySoon: 'border-rose-400 bg-white hover:bg-stone-50 shadow-sm',
  bringUrgent: 'border-amber-400 bg-amber-100 hover:bg-amber-200',
  rose: 'text-rose-600',
  amber: 'text-amber-700',
  red: 'text-red-600',
  orange: 'text-orange-600',
  yellow: 'text-yellow-700',
};

function loadThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'auto';
}

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

function expiryStyle(days: number, t: Theme): { border: string; text: string } {
  if (days < 0) return { border: 'border-red-500', text: t.red };
  if (days <= 2) return { border: 'border-orange-500', text: t.orange };
  return { border: 'border-yellow-500', text: t.yellow };
}

function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function EmptyState({ text, t }: { text: string; t: Theme }) {
  return <p className={`rounded-2xl border border-dashed px-6 py-8 text-xl ${t.empty}`}>{text}</p>;
}

function SectionTitle({ icon, title, count, t }: { icon: string; title: string; count: number; t: Theme }) {
  return (
    <h2 className={`mb-4 flex items-center gap-3 text-2xl font-semibold ${t.heading}`}>
      <span>{icon}</span>
      <span>{title}</span>
      {count > 0 && <span className={`rounded-full px-3 py-0.5 text-base font-medium ${t.badge}`}>{count}</span>}
    </h2>
  );
}

function BirthdayCard({ entry, age, t }: { entry: UpcomingEntry; age: number | null; t: Theme }) {
  const isToday = entry.daysUntil === 0;
  const isSoon = entry.daysUntil === 1;
  return (
    <Link
      href={`/people/${entry.personId}`}
      className={`flex items-center gap-4 rounded-2xl border-l-4 px-5 py-4 transition-colors ${
        isToday ? t.birthdayToday : isSoon ? t.birthdaySoon : t.card
      }`}
    >
      <span className={isToday ? 'text-5xl' : 'text-3xl'}>{isToday ? '🎉' : '🎂'}</span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold ${isToday ? `text-3xl ${t.strong}` : `text-2xl ${t.primary}`}`}>
          {entry.personName}
        </span>
        <span className={`block text-lg ${t.muted}`}>
          {isToday ? 'Vandaag jarig!' : formatShortDate(entry.nextDate)}
          {age !== null && ` · wordt ${age}`}
        </span>
      </span>
      <span className={`whitespace-nowrap text-xl font-medium ${isToday || isSoon ? t.rose : t.muted}`}>
        {isToday ? '' : relativeDayLabel(entry.daysUntil)}
      </span>
    </Link>
  );
}

function BringCard({ entry, t }: { entry: UpcomingEntry; t: Theme }) {
  const urgent = entry.daysUntil <= 1;
  const overdue = entry.daysUntil < 0;
  return (
    <Link
      href={`/people/${entry.personId}`}
      className={`flex items-center gap-4 rounded-2xl border-l-4 px-5 py-4 transition-colors ${
        urgent ? t.bringUrgent : t.card
      }`}
    >
      <span className="text-3xl">🎒</span>
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-2 text-2xl font-semibold leading-tight ${t.primary}`}>{entry.label}</span>
        <span className={`block text-lg ${t.muted}`}>voor {entry.personName}</span>
      </span>
      <span className={`whitespace-nowrap text-xl font-medium ${overdue ? t.red : urgent ? t.amber : t.muted}`}>
        {relativeDayLabel(entry.daysUntil)}
      </span>
    </Link>
  );
}

function quantityLabel(needed: number, unit: string): string {
  if (unit === 'pcs') return `${needed} ${needed === 1 ? 'stuk' : 'stuks'} nodig`;
  return `${needed} ${unit} nodig`;
}

function ShoppingCard({ name, detail, bought, t }: { name: string; detail?: string; bought?: boolean; t: Theme }) {
  return (
    <Link
      href="/shopping-list"
      className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors ${t.cardPlain} ${bought ? 'opacity-50' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-2xl font-semibold ${t.primary} ${bought ? 'line-through' : ''}`}>{name}</span>
        {detail && <span className={`block text-lg ${t.muted}`}>{detail}</span>}
      </span>
      {bought && <span className={`whitespace-nowrap text-lg ${t.muted}`}>✓ gekocht</span>}
    </Link>
  );
}

function ShoppingGroupList({ groups, t }: { groups: ShoppingGroup[]; t: Theme }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.category?.id ?? 'uncategorized'} className="mb-6 break-inside-avoid">
          <h3 className={`mb-2 text-lg font-medium ${t.muted}`}>
            {g.category?.icon} {g.category?.name}
          </h3>
          <ul className="space-y-3">
            {g.items.map((item) => (
              <li key={item.id}>
                <ShoppingCard
                  name={item.name}
                  detail={quantityLabel(item.needed, item.unit)}
                  bought={item.isBought}
                  t={t}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
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
  const { groups: shoppingGroups, lowPrioGroups, totalLowPrio, refetch: refetchShopping } = useShoppingList();
  const { items: adHocItems, refetch: refetchAdHoc } = useShoppingItems();
  const [screen, setScreen] = useState<ScreenIndex>(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadThemeMode);
  const [wakeUntil, setWakeUntil] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const refresh = setInterval(() => {
      refetchPeople();
      refetchProducts();
      refetchShopping();
      refetchAdHoc();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(refresh);
  }, [refetchPeople, refetchProducts, refetchShopping, refetchAdHoc]);

  const openAdHoc = adHocItems.filter((i) => !i.is_checked);
  const stillToBuy = shoppingGroups.reduce((n, g) => n + g.items.filter((i) => !i.isBought).length, 0);
  const shoppingCount = stillToBuy + openAdHoc.length;

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
  const isDaytime = hour >= LIGHT_START_HOUR && hour < LIGHT_END_HOUR;
  const useLight = themeMode === 'light' || (themeMode === 'auto' && isDaytime);
  const t = useLight ? LIGHT : DARK;
  const [shiftX, shiftY] = BURN_IN_OFFSETS[Math.floor(now.getMinutes() / 3) % BURN_IN_OFFSETS.length];
  const currentMode = THEME_MODES.find((m) => m.mode === themeMode) ?? THEME_MODES[0];

  function cycleTheme() {
    const idx = THEME_MODES.findIndex((m) => m.mode === themeMode);
    const next = THEME_MODES[(idx + 1) % THEME_MODES.length].mode;
    setThemeMode(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    if (isNight) setWakeUntil(Date.now() + WAKE_DURATION_MS);
  }

  if (isNight && now.getTime() >= wakeUntil) {
    // Klok springt elke minuut naar een andere plek zodat geen pixel lang brandt.
    const minuteIndex = now.getHours() * 60 + now.getMinutes();
    return (
      <div
        className="relative h-screen w-screen cursor-pointer select-none overflow-hidden bg-black"
        onClick={() => setWakeUntil(Date.now() + WAKE_DURATION_MS)}
      >
        <div
          className="absolute text-3xl font-light tabular-nums text-neutral-700"
          style={{ left: `${5 + ((minuteIndex * 37) % 75)}%`, top: `${5 + ((minuteIndex * 53) % 80)}%` }}
        >
          {now.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    setScreen((s) => (delta < 0 ? (Math.min(s + 1, LAST_SCREEN) as ScreenIndex) : (Math.max(s - 1, 0) as ScreenIndex)));
  }

  return (
    <div
      className={`relative h-screen w-screen select-none overflow-hidden transition-colors duration-700 ${t.page}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full flex-col"
        style={{ transform: `translate(${shiftX}px, ${shiftY}px)` }}
      >
        <header className="flex items-end justify-between px-8 pt-6 pb-4">
          <div>
            <div className="text-6xl font-light tabular-nums tracking-tight">
              {now.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={`mt-1 text-xl capitalize ${t.muted}`}>
              {now.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={cycleTheme}
              aria-label={`Thema: ${currentMode.label}`}
              className={`rounded-full px-4 py-2 text-base font-medium transition-colors ${t.toggle}`}
            >
              {currentMode.icon} {currentMode.label}
            </button>
            <div className={`text-lg ${t.subtle}`}>{SCREEN_LABELS[screen]}</div>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex h-full w-[300%] transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${(screen * 100) / 3}%)` }}
          >
            <section className="grid h-full w-1/3 shrink-0 grid-cols-1 content-start gap-8 overflow-y-auto px-8 pb-16 landscape:grid-cols-2">
              <div>
                <SectionTitle icon="🎂" title="Verjaardagen" count={birthdays.length} t={t} />
                {birthdays.length === 0 ? (
                  <EmptyState text="Geen verjaardagen de komende 30 dagen." t={t} />
                ) : (
                  <ul className="space-y-3">
                    {birthdays.map((e, i) => {
                      const person = people.find((p) => p.id === e.personId);
                      const age = person?.birthday
                        ? birthdayAge(person.birthday, person.birthday_has_year, e.nextDate)
                        : null;
                      return (
                        <li key={`b-${e.personId}-${i}`}>
                          <BirthdayCard entry={e} age={age} t={t} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <SectionTitle icon="🎒" title="Niet vergeten mee te nemen" count={bringReminders.length} t={t} />
                {bringReminders.length === 0 ? (
                  <EmptyState text="Niets om mee te nemen." t={t} />
                ) : (
                  <ul className="space-y-3">
                    {bringReminders.map((e, i) => (
                      <li key={`r-${e.personId}-${i}`}>
                        <BringCard entry={e} t={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="h-full w-1/3 shrink-0 overflow-y-auto px-8 pb-16">
              <SectionTitle icon="⏳" title="Bijna over datum" count={expiring.length} t={t} />
              {expiring.length === 0 ? (
                <EmptyState text="Niets vervalt deze week. 👍" t={t} />
              ) : (
                <ul className="grid grid-cols-1 gap-3 landscape:grid-cols-2">
                  {expiring.map((p) => {
                    const style = expiryStyle(p.daysLeft, t);
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/products/${p.id}`}
                          className={`flex items-center gap-4 rounded-2xl border-l-4 px-5 py-4 transition-colors ${t.cardPlain} ${style.border}`}
                        >
                          <span className="text-3xl">{p.category?.icon ?? '🥫'}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-2xl font-semibold ${t.primary}`}>{p.name}</span>
                            <span className={`block text-lg font-medium ${style.text}`}>{expiryLabel(p.daysLeft)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="h-full w-1/3 shrink-0 overflow-y-auto px-8 pb-16">
              <SectionTitle icon="🛒" title="Boodschappen" count={shoppingCount} t={t} />
              {shoppingCount === 0 && totalLowPrio === 0 ? (
                <EmptyState text="Niets nodig. 🎉" t={t} />
              ) : (
                <>
                  <div className="gap-6 landscape:columns-2">
                    <ShoppingGroupList groups={shoppingGroups} t={t} />

                    {openAdHoc.length > 0 && (
                      <div className="mb-6 break-inside-avoid">
                        <h3 className={`mb-2 text-lg font-medium ${t.muted}`}>📝 Los toegevoegd</h3>
                        <ul className="space-y-3">
                          {openAdHoc.map((item) => (
                            <li key={item.id}>
                              <ShoppingCard name={item.name} t={t} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {totalLowPrio > 0 && (
                    <div className="mt-8 opacity-60">
                      <h3 className={`mb-4 text-xl font-semibold ${t.heading}`}>🔽 Lage prioriteit ({totalLowPrio})</h3>
                      <div className="gap-6 landscape:columns-2">
                        <ShoppingGroupList groups={lowPrioGroups} t={t} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3">
        {([0, 1, 2] as const).map((i) => (
          <button
            key={i}
            aria-label={`Scherm ${i + 1}`}
            onClick={() => setScreen(i)}
            className={`h-3 rounded-full transition-all ${screen === i ? `w-8 ${t.dotActive}` : `w-3 ${t.dotIdle}`}`}
          />
        ))}
      </div>
    </div>
  );
}
