import type { Evaluation, Offer, Settings } from './model';

function nonnegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label}: ingresa un número válido, igual o mayor que cero.`);
}
export function evaluate(offer: Offer, settings: Settings): Evaluation {
  Object.entries(offer).forEach(([key, value]) => { if (value !== null) nonnegative(value, key); });
  for (const [name, value] of Object.entries({ efficiency: settings.efficiency, minPerKm: settings.minPerKm, maxMinutes: settings.maxMinutes })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}: debe ser mayor que cero.`);
  }
  if (settings.fuelPrice !== null) nonnegative(settings.fuelPrice, 'Precio por litro');
  if (settings.reservePerKm !== null) nonnegative(settings.reservePerKm, 'Reservas');
  const km = offer.pickupKm + offer.tripKm;
  const minutes = offer.pickupMinutes + offer.tripMinutes;
  if (!Number.isFinite(km) || !Number.isFinite(minutes) || km <= 0 || minutes <= 0) throw new Error('La distancia y el tiempo totales deben ser finitos y mayores que cero.');
  if (offer.deductions !== null && offer.deductions > offer.amount) throw new Error('Los descuentos no pueden superar el importe ofrecido.');
  const fuelCost = settings.fuelPrice === null ? null : km * settings.fuelPrice / settings.efficiency;
  const operatingCost = fuelCost === null || settings.reservePerKm === null ? null : fuelCost + km * settings.reservePerKm;
  const margin = operatingCost === null || offer.deductions === null ? null : offer.amount - offer.deductions - operatingCost;
  const rates = [offer.amount / km, offer.amount * 60 / minutes, fuelCost, operatingCost, margin,
    margin === null ? null : margin / km, margin === null ? null : margin * 60 / minutes];
  if (rates.some(value => value !== null && !Number.isFinite(value))) throw new Error('Los valores exceden el rango del cálculo. Revisa los importes y las unidades.');
  return { version: 1, km, minutes, grossPerKm: offer.amount / km, grossPerHour: offer.amount * 60 / minutes,
    fuelCost, operatingCost, margin, marginPerKm: margin === null ? null : margin / km,
    marginPerHour: margin === null ? null : margin * 60 / minutes,
    meetsAmountGoal: offer.amount / km >= settings.minPerKm, meetsTimeGoal: minutes <= settings.maxMinutes };
}

export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error('Usa números sin separadores de miles; por ejemplo, 29.50.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error('Número fuera de rango.');
  return value;
}
