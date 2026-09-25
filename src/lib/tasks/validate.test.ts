import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTaskPatch, isUuid, parseEventInput, parseTaskInput } from './validate.ts';
import type { Task } from './shared.ts';

const VALID = {
  title: '  Vuilnis buiten  ',
  category: 'household',
  notes: '',
  schedule_type: 'fixed',
  every_n: 1,
  unit: 'week',
  weekdays: [4, 2, 2],
  month_day: 15,
  start_date: '2026-09-01',
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: '5f0c6f5e-2b1a-4d7e-9c3b-1a2b3c4d5e6f',
    title: 'Vuilnis', category: 'household', notes: null,
    schedule_type: 'fixed', every_n: 1, unit: 'week', weekdays: [2], month_day: null,
    start_date: '2026-09-01', next_due: '2026-09-29', archived: false,
    created_at: '2026-09-01T10:00:00Z', last_done: '2026-09-22',
    ...overrides,
  };
}

test('parseTaskInput: trimt, ontdubbelt en sorteert weekdagen, zet overbodige velden op null', () => {
  const r = parseTaskInput(VALID);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.title, 'Vuilnis buiten');
  assert.deepEqual(r.value.weekdays, [2, 4]);
  assert.equal(r.value.month_day, null);
  assert.equal(r.value.notes, null);
});

test('parseTaskInput: weigert ongeldige invoer met Nederlandse melding', () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ ...VALID, title: '   ' }, 'Titel is verplicht'],
    [{ ...VALID, category: 'x' }, 'Ongeldige categorie'],
    [{ ...VALID, schedule_type: 'x' }, 'Kies een soort schema'],
    [{ ...VALID, unit: 'x' }, 'Ongeldige periode'],
    [{ ...VALID, every_n: 0 }, '"Elke" moet een geheel getal tussen 1 en 999 zijn'],
    [{ ...VALID, every_n: 1.5 }, '"Elke" moet een geheel getal tussen 1 en 999 zijn'],
    [{ ...VALID, start_date: '2026-02-30' }, 'Ongeldige startdatum'],
    [{ ...VALID, weekdays: [] }, 'Kies minstens één weekdag'],
    [{ ...VALID, weekdays: [0] }, 'Ongeldige weekdag'],
    [{ ...VALID, unit: 'month', month_day: 32 }, 'Dag van de maand moet tussen 1 en 31 liggen'],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(parseTaskInput(input), { ok: false, error });
  }
  assert.deepEqual(parseTaskInput(null), { ok: false, error: 'Ongeldige invoer' });
});

test('parseTaskInput: interval negeert weekdagen en dag van de maand', () => {
  const r = parseTaskInput({ ...VALID, schedule_type: 'interval', weekdays: [], month_day: 99 });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.weekdays, null);
    assert.equal(r.value.month_day, null);
  }
});

test('parseEventInput', () => {
  assert.deepEqual(parseEventInput({ kind: 'done', date: '2026-09-24' }), { ok: true, value: { kind: 'done', date: '2026-09-24' } });
  assert.deepEqual(parseEventInput({ kind: 'x', date: '2026-09-24' }), { ok: false, error: 'Ongeldige actie' });
  assert.deepEqual(parseEventInput({ kind: 'done', date: 'gisteren' }), { ok: false, error: 'Ongeldige datum' });
});

test('applyTaskPatch: enkel titel wijzigen laat next_due ongemoeid', () => {
  const r = applyTaskPatch(task(), { title: 'Restafval buiten' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.input.title, 'Restafval buiten');
    assert.equal(r.value.next_due, '2026-09-29');
  }
});

test('applyTaskPatch: schemawijziging herberekent vanaf vandaag', () => {
  const r = applyTaskPatch(task(), { weekdays: [5], today: '2026-09-24' });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.next_due, '2026-09-25');
});

test('applyTaskPatch: schemawijziging zonder today wordt geweigerd', () => {
  assert.deepEqual(applyTaskPatch(task(), { weekdays: [5] }), { ok: false, error: 'Datum van vandaag ontbreekt' });
});

test('applyTaskPatch: uitstellen', () => {
  const ok = applyTaskPatch(task(), { next_due: '2026-10-01', today: '2026-09-24' });
  assert.equal(ok.ok && ok.value.next_due, '2026-10-01');
  assert.deepEqual(
    applyTaskPatch(task(), { next_due: '2026-09-23', today: '2026-09-24' }),
    { ok: false, error: 'Uitstellen kan enkel naar vandaag of later' },
  );
});

test('applyTaskPatch: weer activeren zet next_due op minstens vandaag', () => {
  const r = applyTaskPatch(
    task({ archived: true, schedule_type: 'interval', unit: 'month', weekdays: null, next_due: '2026-02-01', last_done: '2026-01-01' }),
    { archived: false, today: '2026-09-24' },
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.archived, false);
    assert.equal(r.value.next_due, '2026-09-24');
  }
});

test('applyTaskPatch: archiveren moet een boolean zijn', () => {
  assert.deepEqual(applyTaskPatch(task(), { archived: 'ja' }), { ok: false, error: 'Ongeldige waarde voor gestopt' });
});

test('isUuid', () => {
  assert.equal(isUuid('5f0c6f5e-2b1a-4d7e-9c3b-1a2b3c4d5e6f'), true);
  assert.equal(isUuid('abc'), false);
});
