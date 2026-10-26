import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examples, initialSettings } from '../src/domain/model.ts';
import type { AppData, RecordEntry, Settings } from '../src/domain/model.ts';
import { evaluate } from '../src/domain/calculate.ts';
import { recordToCloud, synchronizeAccount } from '../src/domain/syncAccount.ts';
import type { CloudRecord, SyncTransport } from '../src/domain/syncAccount.ts';

const owner = '11111111-1111-4111-8111-111111111111';
const otherOwner = '22222222-2222-4222-8222-222222222222';
const entry = (suffix: number): RecordEntry => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(suffix).padStart(12, '0')}`, createdAt: `2026-10-${suffix + 10}T12:00:00.000Z`,
  source: 'capture', extraction: { parserVersion: 1, input: 'screen' },
  offer: { ...examples[0] }, settings: { ...initialSettings }, result: evaluate(examples[0], initialSettings),
});
const local = (...records: RecordEntry[]): AppData => ({ schemaVersion: 1, settings: { ...initialSettings, brand: 'Local' }, records });

class FakeCloud implements SyncTransport {
  owner: string | null = owner;
  rows: CloudRecord[] = [];
  settings: Settings | null = null;
  insertCalls = 0;
  settingsWrites = 0;
  failSettingsOnce = false;
  async ownerId() { return this.owner; }
  async listRecords() { return structuredClone(this.rows); }
  async insertRecords(userId: string, rows: CloudRecord[]) {
    assert.equal(userId, this.owner);
    this.insertCalls++;
    for (const row of rows) if (!this.rows.some(existing => existing.id === row.id)) this.rows.push(structuredClone(row));
  }
  async readSettings() { return this.settings && structuredClone(this.settings); }
  async writeSettings(_userId: string, settings: Settings) {
    this.settingsWrites++;
    if (this.failSettingsOnce) { this.failSettingsOnce = false; throw new Error('Disconnected'); }
    this.settings = structuredClone(settings);
  }
}

test('manual backup merges stable IDs and preserves each historical cost snapshot', async () => {
  const cloud = new FakeCloud();
  const old = entry(1), recent = entry(2);
  old.settings = { ...initialSettings, efficiency: 10, fuelPrice: 25 };
  old.result = evaluate(old.offer, old.settings);
  cloud.rows.push(recordToCloud(old, owner));
  const data = local(recent);
  const original = structuredClone(data);
  const result = await synchronizeAccount(owner, data, cloud, { settingsMode: 'local' });
  assert.equal(result.uploaded, 1);
  assert.equal(result.downloaded, 1);
  assert.deepEqual(result.data.records, [recent, old]);
  assert.deepEqual(data, original);
  assert.equal(cloud.settings?.brand, 'Local');
  const repeat = await synchronizeAccount(owner, result.data, cloud, { settingsMode: 'local' });
  assert.equal(repeat.uploaded, 0);
  assert.equal(repeat.downloaded, 0);
  assert.equal(cloud.insertCalls, 1);
});

test('restoring settings is explicit; it merges records and never replaces local history', async () => {
  const cloud = new FakeCloud();
  cloud.settings = { ...initialSettings, brand: 'Respaldado', minPerKm: 8 };
  cloud.rows.push(recordToCloud(entry(1), owner));
  const result = await synchronizeAccount(owner, local(entry(2)), cloud, { settingsMode: 'remote' });
  assert.equal(result.data.settings.brand, 'Respaldado');
  assert.equal(result.data.records.length, 2);
  assert.equal(cloud.settingsWrites, 0);
});

test('an account without cloud settings keeps local settings during restore', async () => {
  const cloud = new FakeCloud();
  const result = await synchronizeAccount(owner, local(), cloud, { settingsMode: 'remote' });
  assert.equal(result.data.settings.brand, 'Local');
  assert.equal(cloud.settingsWrites, 0);
});

test('payload whitelists exclude raw OCR, screenshots and extra nested properties', async () => {
  const record = { ...entry(1), rawOCR: 'Dirección privada', screenshot: 'file:///private',
    extraction: { parserVersion: 1, input: 'screen', rawText: 'address' },
    offer: { ...examples[0], passenger: 'Persona' }, settings: { ...initialSettings, rawOCR: 'private' },
  } as RecordEntry;
  const cloud = new FakeCloud();
  await synchronizeAccount(owner, local(record), cloud, { settingsMode: 'local' });
  const payload = JSON.stringify(cloud.rows);
  for (const forbidden of ['rawOCR', 'screenshot', 'rawText', 'passenger', 'Dirección', 'private']) assert.equal(payload.includes(forbidden), false);
});

test('failed profile write after inserting records can retry without duplicate history', async () => {
  const cloud = new FakeCloud();
  cloud.failSettingsOnce = true;
  const data = local(entry(1));
  await assert.rejects(synchronizeAccount(owner, data, cloud, { settingsMode: 'local' }), /Disconnected/);
  assert.equal(cloud.rows.length, 1);
  assert.equal(data.records.length, 1);
  const retry = await synchronizeAccount(owner, data, cloud, { settingsMode: 'local' });
  assert.equal(retry.data.records.length, 1);
  assert.equal(cloud.rows.length, 1);
  assert.equal(cloud.insertCalls, 1);
});

test('conflicting immutable snapshots stop before any write', async () => {
  const cloud = new FakeCloud();
  const saved = entry(1), changed = entry(1);
  changed.offer.amount = 100;
  changed.result = evaluate(changed.offer, changed.settings);
  cloud.rows.push(recordToCloud(saved, owner));
  await assert.rejects(synchronizeAccount(owner, local(changed), cloud, { settingsMode: 'local' }), /contenido distinto/);
  assert.equal(cloud.insertCalls, 0);
  assert.equal(cloud.settingsWrites, 0);
  assert.equal(cloud.rows[0].offer.amount, 61.23);
});

test('timestamp formatting returned by Postgres does not duplicate the same record', async () => {
  const cloud = new FakeCloud();
  const row = recordToCloud(entry(1), owner);
  row.created_at = '2026-10-11T12:00:00+00:00';
  cloud.rows.push(row);
  const result = await synchronizeAccount(owner, local(entry(1)), cloud, { settingsMode: 'local' });
  assert.equal(result.data.records.length, 1);
  assert.equal(result.uploaded, 0);
});

test('changing account while remote records arrive rejects the stale result before writes', async () => {
  const cloud = new FakeCloud();
  cloud.listRecords = async () => { cloud.owner = otherOwner; return [recordToCloud(entry(1), owner)]; };
  await assert.rejects(synchronizeAccount(owner, local(entry(2)), cloud, { settingsMode: 'local' }), /sesión cambió/);
  assert.equal(cloud.insertCalls, 0);
  assert.equal(cloud.settingsWrites, 0);
});

test('changing account during a completed write prevents applying returned account data', async () => {
  const cloud = new FakeCloud();
  cloud.writeSettings = async () => { cloud.owner = otherOwner; };
  await assert.rejects(synchronizeAccount(owner, local(), cloud, { settingsMode: 'local' }), /sesión cambió/);
});

test('out-of-order results from a previous session do not finish a sync for the new owner', async () => {
  const cloud = new FakeCloud();
  let release!: () => void;
  let started!: () => void;
  const reached = new Promise<void>(resolve => { started = resolve; });
  cloud.listRecords = async () => { started(); await new Promise<void>(resolve => { release = resolve; }); return []; };
  const pending = synchronizeAccount(owner, local(), cloud, { settingsMode: 'remote' });
  await reached;
  cloud.owner = otherOwner;
  release();
  await assert.rejects(pending, /sesión cambió/);
});

test('foreign owner rows, unsupported calculation versions and expired sessions are rejected', async () => {
  const cloud = new FakeCloud();
  cloud.rows = [recordToCloud(entry(1), otherOwner)];
  await assert.rejects(synchronizeAccount(owner, local(), cloud, { settingsMode: 'remote' }), /no pertenece/);
  cloud.rows = [{ ...recordToCloud(entry(1), owner), calculation_version: 2 } as unknown as CloudRecord];
  await assert.rejects(synchronizeAccount(owner, local(), cloud, { settingsMode: 'remote' }), /versión/);
  cloud.owner = null;
  await assert.rejects(synchronizeAccount(owner, local(), cloud, { settingsMode: 'local' }), /sesión cambió/);
});

test('a write reported successful but absent on re-read cannot claim a completed backup', async () => {
  const cloud = new FakeCloud();
  cloud.insertRecords = async () => {};
  await assert.rejects(synchronizeAccount(owner, local(entry(1)), cloud, { settingsMode: 'local' }), /No se confirmó/);
});
