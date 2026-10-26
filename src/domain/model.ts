export type Settings = {
  brand: string; engine: string; efficiency: number; fuelPrice: number | null;
  reservePerKm: number | null; minPerKm: number; maxMinutes: number;
};
export type Offer = {
  amount: number; pickupKm: number; tripKm: number; pickupMinutes: number;
  tripMinutes: number; deductions: number | null;
};
export type Evaluation = {
  version: 1; km: number; minutes: number; grossPerKm: number; grossPerHour: number;
  fuelCost: number | null; operatingCost: number | null; margin: number | null;
  marginPerKm: number | null; marginPerHour: number | null;
  meetsAmountGoal: boolean; meetsTimeGoal: boolean;
};
export type RecordEntry = {
  id: string; createdAt: string; source: 'manual' | 'example' | 'capture';
  extraction?: { parserVersion: 1; input: 'image' | 'text' | 'screen' };
  offer: Offer; settings: Settings; result: Evaluation;
};
export type AppData = { schemaVersion: 1; settings: Settings; records: RecordEntry[] };
export const initialSettings: Settings = {
  brand: 'Fiat', engine: '1.0', efficiency: 15, fuelPrice: null,
  reservePerKm: null, minPerKm: 6, maxMinutes: 30,
};
export const examples: Offer[] = [
  { amount: 61.23, pickupKm: 2.2, tripKm: 9.5, pickupMinutes: 8, tripMinutes: 21, deductions: null },
  { amount: 22.70, pickupKm: 2.2, tripKm: 0.77, pickupMinutes: 10, tripMinutes: 3, deductions: null },
];
