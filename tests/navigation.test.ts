import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialNavigation, navigationReducer as reduce, TapGesture } from '../src/domain/navigation.ts';

test('volver de un detalle recupera su lista de origen, no salta a inicio', () => {
  const history = reduce(initialNavigation, { type: 'reset', screen: 'history' });
  const detail = reduce(history, { type: 'open', screen: 'detail' });
  assert.equal(reduce(detail, { type: 'back' }).current, 'history');
});
test('tocar la pestaña activa no remonta pantalla ni reinicia borradores', () => {
  const state = reduce(initialNavigation, { type: 'reset', screen: 'vehicle' });
  assert.equal(reduce(state, { type: 'open', screen: 'vehicle', tab: true }), state);
});
test('cambiar pestaña comienza su propia navegación y cambio de dueño limpia el historial', () => {
  const state = reduce(reduce(initialNavigation, { type: 'reset', screen: 'home' }), { type: 'open', screen: 'evaluate' });
  assert.deepEqual(reduce(state, { type: 'open', screen: 'account', tab: true }), { current: 'account', history: [] });
  assert.deepEqual(reduce(state, { type: 'reset', screen: 'welcome' }), initialNavigation);
});
test('un arrastre sobre un botón nunca se convierte en tap aunque el dedo regrese', () => {
  const gesture = new TapGesture(); gesture.start(100, 200); gesture.move(100, 155); gesture.move(100, 200);
  assert.equal(gesture.canPress(), false);
  gesture.start(100, 200); gesture.move(103, 202); assert.equal(gesture.canPress(), true);
});
test('cancelar el gesto bloquea la activación hasta el siguiente toque', () => {
  const gesture = new TapGesture(); gesture.start(0, 0); gesture.cancel(); assert.equal(gesture.canPress(), false);
  gesture.start(0, 0); assert.equal(gesture.canPress(), true);
});
test('un arrastre largo sigue bloqueado al soltar; luego permite activación por teclado', () => {
  let now = 0; const gesture = new TapGesture(() => now);
  gesture.start(0, 0); gesture.move(0, 40); now = 2000;
  assert.equal(gesture.canPress(), false);
  gesture.finish(); assert.equal(gesture.canPress(), false);
  now += 301; assert.equal(gesture.canPress(), true);
});
