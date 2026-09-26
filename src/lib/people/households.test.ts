import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAddress, hasAddress, mapsRouteUrl, parseHouseholdInput, type HouseholdAddress } from './shared.ts';

function addr(overrides: Partial<HouseholdAddress>): HouseholdAddress {
  return { street: null, house_number: null, postal_code: null, city: null, ...overrides };
}

test('formatAddress: volledig adres', () => {
  assert.equal(formatAddress(addr({ street: 'Kerkstraat', house_number: '12', postal_code: '9000', city: 'Gent' })), 'Kerkstraat 12, 9000 Gent');
});

test('formatAddress: onvolledige adressen zonder losse komma of spatie', () => {
  assert.equal(formatAddress(addr({ street: 'Kerkstraat' })), 'Kerkstraat');
  assert.equal(formatAddress(addr({ city: 'Gent' })), 'Gent');
  assert.equal(formatAddress(addr({ postal_code: '9000', city: 'Gent' })), '9000 Gent');
  assert.equal(formatAddress(addr({ street: 'Kerkstraat', city: 'Gent' })), 'Kerkstraat, Gent');
  assert.equal(formatAddress(addr({ street: '  ', city: '  ' })), '');
  assert.equal(formatAddress(addr({})), '');
});

test('hasAddress', () => {
  assert.equal(hasAddress(addr({})), false);
  assert.equal(hasAddress(addr({ street: '   ' })), false);
  assert.equal(hasAddress(addr({ city: 'Gent' })), true);
});

test('mapsRouteUrl codeert bijzondere tekens en voegt België toe', () => {
  const url = mapsRouteUrl(addr({ street: "Rue de l'Église", house_number: '5 & 7', postal_code: '1000', city: 'Brussel' }));
  assert.equal(
    url,
    'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent("Rue de l'Église 5 & 7, 1000 Brussel, België"),
  );
  assert.ok(url.includes('%26'));
  assert.ok(!url.includes(' '));
});

test('parseHouseholdInput trimt en zet lege velden op null', () => {
  assert.deepEqual(parseHouseholdInput({ name: '  Familie Janssen ', street: ' Kerkstraat ', house_number: '', postal_code: '9000', city: '   ' }), {
    ok: true,
    value: { name: 'Familie Janssen', street: 'Kerkstraat', house_number: null, postal_code: '9000', city: null },
  });
});

test('parseHouseholdInput weigert een lege naam of ongeldige invoer', () => {
  assert.deepEqual(parseHouseholdInput({ name: '  ' }), { ok: false, error: 'Naam is verplicht' });
  assert.deepEqual(parseHouseholdInput(null), { ok: false, error: 'Ongeldige invoer' });
});
