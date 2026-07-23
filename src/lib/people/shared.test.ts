import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextOccurrence,
  rollForwardAnnual,
  daysUntil,
  personNextDate,
  comparePeopleByDate,
  buildUpcoming,
  buildHistory,
  toDateKey,
  currentAge,
  type PersonSummary,
  type Reminder,
  type GiftIdea,
} from './shared.ts';

const TODAY = new Date(2026, 6, 23); // 2026-07-23 (lokale tijd)

function person(overrides: Partial<PersonSummary>): PersonSummary {
  return {
    id: 'p', name: 'Naam', group_id: null, group_name: null,
    birthday: null, birthday_has_year: true, notes: null,
    created_at: '2026-01-01T00:00:00Z',
    open_counts: { bring: 0, ask: 0, event: 0 },
    dated_items: [],
    ...overrides,
  };
}

test('toDateKey formatteert lokale datum', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('nextOccurrence: niet-terugkerend geeft de datum zelf terug', () => {
  assert.equal(nextOccurrence('2026-08-01', false, TODAY), '2026-08-01');
  assert.equal(nextOccurrence('2020-01-01', false, TODAY), '2020-01-01');
});

test('nextOccurrence: terugkerend, later dit jaar', () => {
  assert.equal(nextOccurrence('1990-09-10', true, TODAY), '2026-09-10');
});

test('nextOccurrence: terugkerend, al voorbij dit jaar -> volgend jaar', () => {
  assert.equal(nextOccurrence('1990-03-10', true, TODAY), '2027-03-10');
});

test('nextOccurrence: terugkerend vandaag telt als vandaag', () => {
  assert.equal(nextOccurrence('1990-07-23', true, TODAY), '2026-07-23');
});

test('nextOccurrence: 29 feb in niet-schrikkeljaar rolt naar 1 maart', () => {
  assert.equal(nextOccurrence('2000-02-29', true, TODAY), '2027-03-01');
});

test('rollForwardAnnual: strikt na vandaag', () => {
  assert.equal(rollForwardAnnual('2026-07-23', TODAY), '2027-07-23');
  assert.equal(rollForwardAnnual('1990-12-31', TODAY), '2026-12-31');
});

test('daysUntil telt hele dagen', () => {
  assert.equal(daysUntil('2026-07-23', TODAY), 0);
  assert.equal(daysUntil('2026-07-25', TODAY), 2);
  assert.equal(daysUntil('2026-07-20', TODAY), -3);
});

test('personNextDate: kleinste eerstvolgende datum; leeg = null', () => {
  assert.equal(personNextDate(person({}), TODAY), null);
  const p = person({
    dated_items: [
      { kind: 'birthday', label: 'Verjaardag', date: '1990-12-01', recurring: true },
      { kind: 'reminder', reminderType: 'event', label: 'Feest', date: '2026-08-05', recurring: false },
    ],
  });
  assert.equal(personNextDate(p, TODAY), '2026-08-05');
});

test('comparePeopleByDate: personen zonder datum achteraan', () => {
  const withDate = person({ id: 'a', name: 'Anna', dated_items: [
    { kind: 'birthday', label: 'Verjaardag', date: '1990-08-01', recurring: true },
  ] });
  const without = person({ id: 'b', name: 'Bram' });
  assert.ok(comparePeopleByDate(withDate, without, TODAY) < 0);
  assert.ok(comparePeopleByDate(without, withDate, TODAY) > 0);
});

test('buildUpcoming: binnen venster, gesorteerd, overdue eerst', () => {
  const people = [
    person({ id: 'a', name: 'Anna', dated_items: [
      { kind: 'reminder', reminderType: 'event', label: 'Gemist', date: '2026-07-20', recurring: false },
    ] }),
    person({ id: 'b', name: 'Bram', dated_items: [
      { kind: 'birthday', label: 'Verjaardag', date: '1990-08-10', recurring: true },
    ] }),
    person({ id: 'c', name: 'Cato', dated_items: [
      { kind: 'reminder', reminderType: 'event', label: 'Ver weg', date: '2026-12-01', recurring: false },
    ] }),
  ];
  const up = buildUpcoming(people, TODAY, 30);
  assert.deepEqual(up.map((e) => e.personName), ['Anna', 'Bram']); // Cato valt buiten 30 dagen
  assert.equal(up[0].daysUntil, -3);
});

test('currentAge: berekent voltooide jaren op basis van geboortedatum', () => {
  assert.equal(currentAge('1980-01-01', TODAY), 46);
  assert.equal(currentAge('1980-12-31', TODAY), 45);
  assert.equal(currentAge('2026-07-23', TODAY), 0);
  assert.equal(currentAge('2000-07-23', TODAY), 26);
});

test('buildHistory: alleen afgehandelde items, nieuwste eerst', () => {
  const reminders: Reminder[] = [
    { id: 'r1', person_id: 'p', type: 'bring', text: 'Wijn', due_date: null, recurs_annually: false, done: true, done_at: '2026-05-01T10:00:00Z', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 'r2', person_id: 'p', type: 'ask', text: 'Open', due_date: null, recurs_annually: false, done: false, done_at: null, sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
  ];
  const gifts: GiftIdea[] = [
    { id: 'g1', person_id: 'p', text: 'Boek', given: true, given_at: '2026-06-01T10:00:00Z', created_at: '2026-01-01T00:00:00Z' },
  ];
  const hist = buildHistory(reminders, gifts);
  assert.deepEqual(hist.map((h) => h.id), ['g1', 'r1']); // juni voor mei
});
