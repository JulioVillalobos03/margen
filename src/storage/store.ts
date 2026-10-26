import * as SQLite from 'expo-sqlite';
import type { AppData } from '../domain/model';
import { decode, emptyData, storageKey } from './state';
export { decode, emptyData } from './state';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  if (!database) database = (async () => {
    const value = await SQLite.openDatabaseAsync('margen.db');
    await value.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS account_state (scope TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);');
    return value;
  })();
  return database;
}
export async function load(scope?: string): Promise<AppData> {
  const key = storageKey(scope);
  const database = await db();
  const row = scope === undefined
    ? await database.getFirstAsync<{ payload: string }>('SELECT payload FROM app_state WHERE id = 1')
    : await database.getFirstAsync<{ payload: string }>('SELECT payload FROM account_state WHERE scope = ?', key);
  return row ? decode(row.payload) : emptyData();
}
export async function persist(data: AppData, scope?: string) {
  const key = storageKey(scope);
  const payload = JSON.stringify(data);
  if (scope === undefined) {
    await (await db()).runAsync('INSERT INTO app_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload', payload);
  } else {
    await (await db()).runAsync('INSERT INTO account_state (scope, payload) VALUES (?, ?) ON CONFLICT(scope) DO UPDATE SET payload = excluded.payload', key, payload);
  }
}
