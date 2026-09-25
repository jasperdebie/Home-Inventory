import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonths, addUnits, isDateKey, isoWeekday,
  firstOccurrence, nextOccurrence, initialNextDue, recomputeNextDue, reactivatedNextDue,
  nextDueAfterEvent, followingDue, postponeOptions,
  describeSchedule, dueGroup, dueLabel, formatLongDate, compareTasks,
  type TaskSchedule,
} from './shared.ts';

function sched(overrides: Partial<TaskSchedule>): TaskSchedule {
  return {
    schedule_type: 'fixed', every_n: 1, unit: 'week',
    weekdays: null, month_day: null, start_date: '2026-09-24',
    ...overrides,
  };
}

test('addMonths clampt naar de laatste dag van de maand', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
});

test('addUnits voor week en jaar (29 feb → 28 feb)', () => {
  assert.equal(addUnits('2026-09-24', 2, 'week'), '2026-10-08');
  assert.equal(addUnits('2028-02-29', 1, 'year'), '2029-02-28');
});

test('isDateKey weigert onmogelijke of slecht geformatteerde datums', () => {
  assert.equal(isDateKey('2026-02-28'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('26-1-1'), false);
  assert.equal(isDateKey(''), false);
  assert.equal(isDateKey(null), false);
});

test('isoWeekday: donderdag = 4, zondag = 7', () => {
  assert.equal(isoWeekday('2026-09-24'), 4);
  assert.equal(isoWeekday('2026-09-27'), 7);
});

test('vast: om de 3 dagen', () => {
  const s = sched({ unit: 'day', every_n: 3 });
  assert.equal(firstOccurrence(s, '2026-09-25'), '2026-09-27');
});

test('vast: meerdere weekdagen (ma + do)', () => {
  const s = sched({ weekdays: [1, 4] });
  assert.equal(initialNextDue(s), '2026-09-24');
  assert.equal(nextOccurrence(s, '2026-09-24'), '2026-09-28');
  assert.equal(nextOccurrence(s, '2026-09-28'), '2026-10-01');
});

test('vast: om de 2 weken op zaterdag', () => {
  const s = sched({ every_n: 2, weekdays: [6] });
  assert.equal(initialNextDue(s), '2026-09-26');
  assert.equal(nextOccurrence(s, '2026-09-26'), '2026-10-10');
});

test('vast: startdatum die zelf geen schemadag is', () => {
  const s = sched({ weekdays: [2] });
  assert.equal(initialNextDue(s), '2026-09-29');
});

test('vast: maandelijks op de 31e slaat geen maand over', () => {
  const s = sched({ unit: 'month', month_day: 31, start_date: '2026-01-31' });
  assert.equal(nextOccurrence(s, '2026-01-31'), '2026-02-28');
  assert.equal(nextOccurrence(s, '2026-02-28'), '2026-03-31');
  assert.equal(nextOccurrence(s, '2026-03-31'), '2026-04-30');
});

test('vast: om de 3 maanden op de 15e', () => {
  const s = sched({ unit: 'month', every_n: 3, month_day: 15 });
  assert.equal(initialNextDue(s), '2026-12-15');
});

test('vast: jaarlijks op 29 februari', () => {
  const s = sched({ unit: 'year', start_date: '2028-02-29' });
  assert.equal(nextOccurrence(s, '2028-02-29'), '2029-02-28');
  assert.equal(nextOccurrence(s, '2031-12-01'), '2032-02-29');
});

test('vast: weekschema zonder weekdagen gooit een fout', () => {
  assert.throws(() => firstOccurrence(sched({ weekdays: [] }), '2026-09-24'));
});

test('afvinken vast schema: te laat en te vroeg', () => {
  const vuilnis = sched({ weekdays: [2], start_date: '2026-09-01' });
  assert.equal(nextDueAfterEvent(vuilnis, 'done', '2026-09-22', '2026-09-24'), '2026-09-29');
  assert.equal(nextDueAfterEvent(vuilnis, 'done', '2026-09-29', '2026-09-28'), '2026-10-06');
});

test('afvinken interval: vanaf de dag dat het gedaan werd', () => {
  const badkamer = sched({ schedule_type: 'interval', unit: 'day', every_n: 7 });
  assert.equal(nextDueAfterEvent(badkamer, 'done', '2026-10-10', '2026-10-12'), '2026-10-19');
  assert.equal(nextDueAfterEvent(badkamer, 'done', '2026-10-10', '2026-10-08'), '2026-10-15');
});

test('overslaan: interval vanaf de laatste van vervaldatum en vandaag', () => {
  const s = sched({ schedule_type: 'interval', unit: 'day', every_n: 7 });
  assert.equal(nextDueAfterEvent(s, 'skipped', '2026-09-20', '2026-09-24'), '2026-10-01');
  assert.equal(nextDueAfterEvent(s, 'skipped', '2026-09-30', '2026-09-24'), '2026-10-07');
});

test('overslaan: vast schema zoals afvinken', () => {
  const vuilnis = sched({ weekdays: [2], start_date: '2026-09-01' });
  assert.equal(nextDueAfterEvent(vuilnis, 'skipped', '2026-09-22', '2026-09-24'), '2026-09-29');
});

test('recomputeNextDue na schemawijziging', () => {
  assert.equal(recomputeNextDue(sched({ weekdays: [2], start_date: '2026-09-01' }), '2026-09-24', null), '2026-09-29');
  const interval = sched({ schedule_type: 'interval', every_n: 2, start_date: '2026-08-01' });
  assert.equal(recomputeNextDue(interval, '2026-09-24', '2026-09-10'), '2026-09-24');
  assert.equal(recomputeNextDue(interval, '2026-09-24', null), '2026-08-01');
});

test('reactivatedNextDue is nooit vóór vandaag', () => {
  const s = sched({ schedule_type: 'interval', unit: 'month', start_date: '2025-12-01' });
  assert.equal(reactivatedNextDue(s, '2026-09-24', '2026-01-01'), '2026-09-24');
});

test('followingDue voor het live voorbeeld', () => {
  assert.equal(followingDue(sched({ weekdays: [2] }), '2026-09-29'), '2026-10-06');
  assert.equal(followingDue(sched({ schedule_type: 'interval', unit: 'month' }), '2026-01-31'), '2026-02-28');
});

test('postponeOptions vertrekt vanaf vandaag als de taak al te laat is', () => {
  assert.deepEqual(postponeOptions('2026-09-20', '2026-09-24'), [
    { label: '+1 dag', date: '2026-09-25' },
    { label: '+3 dagen', date: '2026-09-27' },
    { label: '+1 week', date: '2026-10-01' },
  ]);
  assert.deepEqual(postponeOptions('2026-09-30', '2026-09-24').map((o) => o.date), ['2026-10-01', '2026-10-03', '2026-10-07']);
});

test('describeSchedule in gewone taal', () => {
  assert.equal(describeSchedule(sched({ unit: 'day' })), 'elke dag');
  assert.equal(describeSchedule(sched({ unit: 'day', every_n: 3 })), 'om de 3 dagen');
  assert.equal(describeSchedule(sched({ weekdays: [2] })), 'elke dinsdag');
  assert.equal(describeSchedule(sched({ weekdays: [4, 1] })), 'elke maandag en donderdag');
  assert.equal(describeSchedule(sched({ every_n: 2, weekdays: [6] })), 'om de 2 weken op zaterdag');
  assert.equal(describeSchedule(sched({ unit: 'month', month_day: 1 })), 'elke 1e van de maand');
  assert.equal(describeSchedule(sched({ unit: 'month', every_n: 3, month_day: 15 })), 'om de 3 maanden op de 15e');
  assert.equal(describeSchedule(sched({ unit: 'year', start_date: '2026-03-12' })), 'elk jaar op 12 maart');
  assert.equal(describeSchedule(sched({ schedule_type: 'interval', every_n: 2 })), '2 weken na de vorige keer');
  assert.equal(describeSchedule(sched({ schedule_type: 'interval', unit: 'day' })), '1 dag na de vorige keer');
});

test('dueGroup en dueLabel', () => {
  const today = '2026-09-24';
  assert.equal(dueGroup('2026-09-21', today), 'overdue');
  assert.equal(dueLabel('2026-09-21', today), '3 dagen te laat');
  assert.equal(dueLabel('2026-09-23', today), '1 dag te laat');
  assert.equal(dueGroup(today, today), 'today');
  assert.equal(dueLabel(today, today), 'Vandaag');
  assert.equal(dueLabel('2026-09-25', today), 'Morgen');
  assert.equal(dueGroup('2026-10-01', today), 'soon');
  assert.equal(dueLabel('2026-10-01', today), 'do 1 okt');
  assert.equal(dueGroup('2026-10-02', today), 'later');
  assert.equal(dueLabel('2026-10-02', today), 'vr 2 okt');
  assert.equal(dueLabel('2027-01-05', today), 'di 5 jan 2027');
});

test('formatLongDate', () => {
  assert.equal(formatLongDate('2025-03-12'), '12 maart 2025');
});

test('compareTasks: op datum, dan op titel', () => {
  const list = [
    { next_due: '2026-09-25', title: 'B' },
    { next_due: '2026-09-24', title: 'Z' },
    { next_due: '2026-09-25', title: 'A' },
  ];
  assert.deepEqual([...list].sort(compareTasks).map((t) => t.title), ['Z', 'A', 'B']);
});
