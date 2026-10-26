import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, persist, emptyData } from '../src/storage/store.web.ts';
import { storageKey } from '../src/storage/state.ts';

test('guest, account A and account B keep separate state, including existing pilot history', async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  } });
  const guest = { ...emptyData(), settings: { ...emptyData().settings, brand: 'Piloto original' } };
  values.set('margen:state:v1', JSON.stringify(guest));
  assert.deepEqual(await load(), guest);
  assert.deepEqual(await load('account-a'), emptyData());
  await persist({ ...emptyData(), settings: { ...emptyData().settings, brand: 'Cuenta A' } }, 'account-a');
  assert.equal((await load('account-a')).settings.brand, 'Cuenta A');
  assert.deepEqual(await load('account-b'), emptyData());
  await Promise.all([
    persist({ ...emptyData(), settings: { ...emptyData().settings, brand: 'Cuenta B' } }, 'account-b'),
    persist({ ...emptyData(), settings: { ...emptyData().settings, brand: 'Cuenta A nueva' } }, 'account-a'),
  ]);
  assert.equal((await load('account-b')).settings.brand, 'Cuenta B');
  assert.equal((await load('account-a')).settings.brand, 'Cuenta A nueva');
  assert.deepEqual(await load(), guest);
  // A malformed pilot record does not prevent an unrelated account from opening its own state.
  values.set('margen:state:v1', '{bad json');
  await assert.rejects(load());
  assert.equal((await load('account-a')).settings.brand, 'Cuenta A nueva');
});

test('scope identifiers cannot collide with guest or accept an accidental empty account', () => {
  assert.equal(storageKey(), 'margen:state:v1');
  assert.notEqual(storageKey('margen:state:v1'), storageKey());
  assert.notEqual(storageKey('a:b'), storageKey('a%3Ab'));
  assert.throws(() => storageKey(''));
});
