import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractOffer, sampleTexts } from '../src/domain/extractOffer.ts';

test('extrae $61.23 y no toma los precios de contraoferta', () => {
  const r = extractOffer(sampleTexts[0]);
  assert.ok(r.ok);
  assert.deepEqual(r.offer, { amount: 61.23, pickupKm: 2.2, tripKm: 9.5, pickupMinutes: 8, tripMinutes: 21, deductions: null });
});
test('extrae $22.70 y normaliza 770 metros', () => {
  const r = extractOffer(sampleTexts[1]); assert.ok(r.ok);
  assert.equal(r.offer.amount, 22.70); assert.equal(r.offer.tripKm, .77);
});
test('tolera coma decimal, saltos de línea y espacios de OCR', () => {
  const r = extractOffer('PON TU PRECIO\n$61,23\n5 puntos\n8 min\n(2,2 km)\n21 min (9,5 km)\nAceptar\n$61,23');
  assert.ok(r.ok); assert.equal(r.offer.pickupKm, 2.2);
});
test('rechaza precio inconsistente en el botón', () => {
  assert.equal(extractOffer(sampleTexts[0].replace('Aceptar $61.23', 'Aceptar $67.23')).ok, false);
});
test('no confunde calificaciones, puntos, viajes o direcciones con segmentos', () => {
  const r = extractOffer(sampleTexts[0].replace('5 puntos', '5 puntos\n4.80 · 386 viajes · Tarjeta verificada\nCalle 21, colonia 8'));
  assert.ok(r.ok); assert.equal(r.offer.amount, 61.23); assert.equal(r.offer.tripMinutes, 21);
});
test('se abstiene si falta recogida, viaje, modalidad, precio o botón', () => {
  for (const part of ['8 min (2.2 km)', '21 min (9.5 km)', 'Pon Tu Precio', 'Aceptar $61.23']) {
    assert.equal(extractOffer(sampleTexts[0].replace(part, '')).ok, false, part);
  }
  assert.equal(extractOffer(sampleTexts[0].replace('$61.23\n5', '5')).ok, false);
});
test('rechaza múltiples solicitudes, segmentos extra y precios principales ambiguos', () => {
  assert.equal(extractOffer(sampleTexts.join('\n')).ok, false);
  assert.equal(extractOffer(sampleTexts[0].replace('5 puntos', '5 puntos\n10 min (3 km)')).ok, false);
  assert.equal(extractOffer(sampleTexts[0].replace('5 puntos', '$65.23\n5 puntos')).ok, false);
});
test('rechaza cifras truncadas, unidad desconocida y tiempo total cero', () => {
  assert.equal(extractOffer(sampleTexts[0].replaceAll('61.23', '61.234')).ok, false);
  assert.equal(extractOffer(sampleTexts[0].replace('9.5 km', '9.5 mi')).ok, false);
  assert.equal(extractOffer(sampleTexts[0].replace('8 min', '0 min').replace('21 min', '0 min')).ok, false);
});
test('rechaza entrada vacía o demasiado grande', () => {
  assert.equal(extractOffer('').ok, false); assert.equal(extractOffer('a'.repeat(20001)).ok, false);
});
