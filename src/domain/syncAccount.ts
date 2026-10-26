import type { AppData, Evaluation, Offer, RecordEntry, Settings } from './model.ts';
import { evaluate } from './calculate.ts';

export type CloudRecord = {
  id: string; user_id: string; created_at: string; source: RecordEntry['source'];
  offer: Offer; settings_snapshot: Settings; result: Evaluation; calculation_version: 1;
  extraction: RecordEntry['extraction'] | null;
};
export type SyncOptions = { settingsMode: 'local' | 'remote' };
export type SyncResult = { data: AppData; uploaded: number; downloaded: number };
export type SyncTransport = {
  ownerId(): Promise<string | null>;
  listRecords(userId: string): Promise<unknown[]>;
  insertRecords(userId: string, records: CloudRecord[]): Promise<void>;
  readSettings(userId: string): Promise<unknown | null>;
  writeSettings(userId: string, settings: Settings): Promise<void>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El respaldo contiene datos con un formato incompatible.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('El respaldo contiene un texto incompatible.');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('El respaldo contiene un número incompatible.');
  return value;
}
function nullableNumber(value: unknown): number | null { return value === null ? null : number(value); }
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('El respaldo contiene un resultado incompatible.');
  return value;
}

// Explicit field selection keeps images, raw OCR and future device-only fields out of cloud payloads.
export function cleanSettings(value: unknown): Settings {
  const item = object(value);
  const settings: Settings = {
    brand: text(item.brand), engine: text(item.engine), efficiency: number(item.efficiency),
    fuelPrice: nullableNumber(item.fuelPrice), reservePerKm: nullableNumber(item.reservePerKm),
    minPerKm: number(item.minPerKm), maxMinutes: number(item.maxMinutes),
  };
  evaluate({ amount: 1, pickupKm: 0, tripKm: 1, pickupMinutes: 0, tripMinutes: 1, deductions: null }, settings);
  return settings;
}

export function cleanRecord(value: unknown): RecordEntry {
  const item = object(value), offerValue = object(item.offer), resultValue = object(item.result);
  const id = text(item.id), createdAt = new Date(text(item.createdAt));
  if (!uuid.test(id) || !Number.isFinite(createdAt.getTime()) || !['manual', 'example', 'capture'].includes(text(item.source))) {
    throw new Error('Una evaluación del respaldo no tiene identificador, fecha u origen válido.');
  }
  const offer: Offer = {
    amount: number(offerValue.amount), pickupKm: number(offerValue.pickupKm), tripKm: number(offerValue.tripKm),
    pickupMinutes: number(offerValue.pickupMinutes), tripMinutes: number(offerValue.tripMinutes), deductions: nullableNumber(offerValue.deductions),
  };
  const settings = cleanSettings(item.settings);
  evaluate(offer, settings);
  if (resultValue.version !== 1) throw new Error('Esta evaluación usa una versión de cálculo incompatible.');
  const result: Evaluation = {
    version: 1, km: number(resultValue.km), minutes: number(resultValue.minutes),
    grossPerKm: number(resultValue.grossPerKm), grossPerHour: number(resultValue.grossPerHour),
    fuelCost: nullableNumber(resultValue.fuelCost), operatingCost: nullableNumber(resultValue.operatingCost),
    margin: nullableNumber(resultValue.margin), marginPerKm: nullableNumber(resultValue.marginPerKm), marginPerHour: nullableNumber(resultValue.marginPerHour),
    meetsAmountGoal: boolean(resultValue.meetsAmountGoal), meetsTimeGoal: boolean(resultValue.meetsTimeGoal),
  };
  let extraction: RecordEntry['extraction'];
  if (item.extraction !== undefined && item.extraction !== null) {
    const input = object(item.extraction);
    if (input.parserVersion !== 1 || !['image', 'text', 'screen'].includes(text(input.input))) throw new Error('La procedencia OCR del respaldo no es compatible.');
    extraction = { parserVersion: 1, input: input.input as 'image' | 'text' | 'screen' };
  }
  return { id: id.toLowerCase(), createdAt: createdAt.toISOString(), source: item.source as RecordEntry['source'],
    ...(extraction ? { extraction } : {}), offer, settings, result };
}

export function recordToCloud(record: RecordEntry, userId: string): CloudRecord {
  const entry = cleanRecord(record);
  return { id: entry.id, user_id: userId, created_at: entry.createdAt, source: entry.source,
    offer: entry.offer, settings_snapshot: entry.settings, result: entry.result,
    calculation_version: 1, extraction: entry.extraction ?? null };
}
function recordFromCloud(value: unknown, userId: string): RecordEntry {
  const row = object(value);
  if (row.user_id !== userId) throw new Error('El respaldo no pertenece a la cuenta activa.');
  if (row.calculation_version !== 1) throw new Error('El respaldo usa una versión de cálculo incompatible.');
  return cleanRecord({ id: row.id, createdAt: row.created_at, source: row.source,
    offer: row.offer, settings: row.settings_snapshot, result: row.result, extraction: row.extraction });
}
function indexRecords(records: RecordEntry[]): Map<string, RecordEntry> {
  const map = new Map<string, RecordEntry>();
  for (const record of records) {
    const previous = map.get(record.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) throw new Error('Dos evaluaciones comparten identificador pero tienen contenido distinto. No se reemplazó ninguna.');
    map.set(record.id, record);
  }
  return map;
}

/** Additive manual backup. Deletions are intentionally not propagated in this first version. */
export async function synchronizeAccount(userId: string, localData: AppData, transport: SyncTransport, options: SyncOptions): Promise<SyncResult> {
  if (!uuid.test(userId)) throw new Error('Inicia sesión para respaldar tus datos.');
  if (localData.schemaVersion !== 1 || !Array.isArray(localData.records)) throw new Error('El historial local no es compatible.');
  if (options.settingsMode !== 'local' && options.settingsMode !== 'remote') throw new Error('Elige cómo sincronizar la configuración.');
  const local = indexRecords(localData.records.map(cleanRecord));
  const localSettings = cleanSettings(localData.settings);
  const assertOwner = async () => {
    if (await transport.ownerId() !== userId) throw new Error('La sesión cambió. Vuelve a intentar desde la cuenta activa.');
  };
  const checked = async <T>(action: () => Promise<T>) => {
    await assertOwner();
    const result = await action();
    await assertOwner();
    return result;
  };
  const list = async () => indexRecords((await checked(() => transport.listRecords(userId))).map(row => recordFromCloud(row, userId)));
  const remote = await list();
  // Detect conflicting IDs before making any write.
  indexRecords([...local.values(), ...remote.values()]);
  const missing = [...local.values()].filter(entry => !remote.has(entry.id));
  if (missing.length) await checked(() => transport.insertRecords(userId, missing.map(entry => recordToCloud(entry, userId))));
  const settingsInCloud = await checked(() => transport.readSettings(userId));
  let settings = localSettings;
  if (options.settingsMode === 'remote') {
    if (settingsInCloud !== null) settings = cleanSettings(settingsInCloud);
  } else {
    await checked(() => transport.writeSettings(userId, localSettings));
  }
  // Re-read after insert: retries and concurrent devices can only add records, never overwrite a snapshot.
  const finalRemote = missing.length ? await list() : remote;
  for (const entry of missing) {
    if (!finalRemote.has(entry.id)) throw new Error('No se confirmó el respaldo de todas las evaluaciones. Conservamos el historial local para reintentar.');
  }
  const merged = indexRecords([...local.values(), ...finalRemote.values()]);
  await assertOwner();
  return {
    data: { schemaVersion: 1, settings, records: [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)) },
    uploaded: missing.length,
    downloaded: [...finalRemote.keys()].filter(id => !local.has(id)).length,
  };
}
