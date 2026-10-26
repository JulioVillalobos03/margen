import type { AppData } from '../domain/model.ts';
import { initialSettings } from '../domain/model.ts';

export const emptyData = (): AppData => ({ schemaVersion: 1, settings: { ...initialSettings }, records: [] });

// Keep the original key for the pilot; signing in never moves this data to an account.
export function storageKey(scope?: string): string {
  if (scope === undefined) return 'margen:state:v1';
  if (!scope || scope.length > 256) throw new Error('La cuenta de almacenamiento no es válida.');
  return `margen:account:v1:${encodeURIComponent(scope)}`;
}

export function decode(payload: string): AppData {
  const value = JSON.parse(payload);
  if (value?.schemaVersion !== 1 || !value.settings || !Array.isArray(value.records)) {
    throw new Error('El formato del historial no es compatible. No se han reemplazado tus datos.');
  }
  return value;
}
