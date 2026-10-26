import type { AppData } from '../domain/model.ts';
import { decode, emptyData, storageKey } from './state.ts';
export { decode, emptyData } from './state.ts';
export async function load(scope?: string): Promise<AppData> {
  const payload = localStorage.getItem(storageKey(scope));
  if (!payload) return emptyData();
  return decode(payload);
}
export async function persist(data: AppData, scope?: string) { localStorage.setItem(storageKey(scope), JSON.stringify(data)); }
