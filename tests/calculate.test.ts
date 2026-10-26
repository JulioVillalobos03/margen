import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseNumber } from '../src/domain/calculate.ts';
import { examples, initialSettings } from '../src/domain/model.ts';

test('captura $61.23 incluye recogida y no inventa margen', () => {
  const r = evaluate(examples[0], initialSettings);
  assert.equal(r.km, 11.7); assert.equal(r.minutes, 29);
  assert.equal(r.grossPerKm.toFixed(2), '5.23'); assert.equal(r.grossPerHour.toFixed(2), '126.68');
  assert.equal(r.meetsAmountGoal, false); assert.equal(r.meetsTimeGoal, true); assert.equal(r.margin, null);
});
test('captura $22.70 normaliza 770 m a 0.77 km', () => {
  const r = evaluate(examples[1], initialSettings);
  assert.equal(r.km, 2.97); assert.equal(r.minutes, 13);
  assert.equal(r.grossPerKm.toFixed(2), '7.64'); assert.equal(r.grossPerHour.toFixed(2), '104.77');
});
test('resta descuentos, consumo y reservas una sola vez', () => {
  const r = evaluate({ amount: 100, pickupKm: 2, tripKm: 8, pickupMinutes: 10, tripMinutes: 20, deductions: 10 }, { ...initialSettings, efficiency: 10, fuelPrice: 20, reservePerKm: 1 });
  assert.equal(r.fuelCost, 20); assert.equal(r.operatingCost, 30); assert.equal(r.margin, 60); assert.equal(r.marginPerHour, 120);
});
test('cero confirmado se distingue de costo desconocido', () => {
  const offer = { ...examples[0], deductions: 0 };
  assert.equal(evaluate(offer, { ...initialSettings, fuelPrice: 0, reservePerKm: 0 }).margin, 61.23);
  assert.equal(evaluate(offer, { ...initialSettings, fuelPrice: 0, reservePerKm: null }).margin, null);
});
test('puede informar pérdida y exceso de duración sin ocultar resultado', () => {
  const r = evaluate({ ...examples[0], tripMinutes: 40, deductions: 10 }, { ...initialSettings, fuelPrice: 40, reservePerKm: 5 });
  assert.ok(r.margin! < 0); assert.equal(r.meetsTimeGoal, false);
});
test('rechaza cero total, negativos, infinito y descuentos superiores', () => {
  assert.throws(() => evaluate({ ...examples[0], pickupKm: 0, tripKm: 0 }, initialSettings));
  assert.throws(() => evaluate({ ...examples[0], tripMinutes: -1 }, initialSettings));
  assert.throws(() => evaluate({ ...examples[0], amount: Infinity }, initialSettings));
  assert.throws(() => evaluate({ ...examples[0], deductions: 62 }, initialSettings));
  assert.throws(() => evaluate(examples[0], { ...initialSettings, efficiency: 0 }));
  assert.throws(() => evaluate({ ...examples[0], pickupKm: Number.MAX_VALUE, tripKm: Number.MAX_VALUE }, initialSettings));
});
test('acepta coma decimal y rechaza textos ambiguos', () => {
  assert.equal(parseNumber(' 29,5 '), 29.5); assert.equal(parseNumber(''), null); assert.equal(parseNumber('0'), 0);
  for (const text of ['12abc', '1,234.50', '-2', 'NaN', 'Infinity', '1e5']) assert.throws(() => parseNumber(text));
});
