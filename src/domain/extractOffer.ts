import type { Offer } from './model';

export type ExtractedOffer =
  | { ok: true; offer: Offer; parserVersion: 1; warnings: string[] }
  | { ok: false; reasons: string[] };

// Deliberadamente estricto: solo el formato Pon Tu Precio de las muestras.
// Reconocer una cadena coherente no garantiza que el OCR haya leído bien la imagen.
export function extractOffer(raw: string): ExtractedOffer {
  if (raw.length > 20000) return { ok: false, reasons: ['El texto excede el tamaño permitido. Selecciona solo una oferta.'] };
  const text = raw.normalize('NFKC').replace(/\r/g, '').replace(/\u00a0/g, ' ');
  const start = /pon\s+tu\s+precio/i.exec(text);
  if (!start) return { ok: false, reasons: ['No identificamos la modalidad Pon Tu Precio.'] };
  const body = text.slice(start.index + start[0].length);
  const accepts = [...body.matchAll(/aceptar\s*\$\s*(\d+(?:[.,]\d{1,2})?)(?![\d.,])/gi)];
  if (accepts.length !== 1) return { ok: false, reasons: ['No identificamos un único botón Aceptar con importe.'] };
  const beforeAccept = body.slice(0, accepts[0].index);
  const headers = [...beforeAccept.matchAll(/\$\s*(\d+(?:[.,]\d{1,2})?)(?![\d.,])/g)];
  if (headers.length !== 1) return { ok: false, reasons: ['El importe principal falta o hay varios importes antes de Aceptar. Revisa manualmente.'] };
  const number = (value: string) => Number(value.replace(',', '.'));
  const amount = number(headers[0][1]);
  if (amount <= 0 || amount !== number(accepts[0][1])) return { ok: false, reasons: ['El precio principal y el botón Aceptar no coinciden.'] };
  const segments = [...beforeAccept.matchAll(/(?:^|\n)[^\d\n]*?(\d+(?:[.,]\d+)?)\s*min\s*\(?\s*(\d+(?:[.,]\d+)?)\s*(km|m)\s*\)?(?=\s|$)/gi)];
  if (segments.length !== 2) return { ok: false, reasons: ['Necesitamos exactamente dos filas completas de minutos y distancia: recogida y viaje.'] };
  if (headers[0].index! > segments[0].index!) return { ok: false, reasons: ['El precio no está en la posición esperada. Revisa la oferta manualmente.'] };
  const [pickup, trip] = segments.map(s => ({ minutes: number(s[1]), km: number(s[2]) / (s[3].toLowerCase() === 'm' ? 1000 : 1) }));
  if (pickup.km + trip.km <= 0 || pickup.minutes + trip.minutes <= 0) return { ok: false, reasons: ['El tiempo o distancia total es cero. No podemos evaluar esta lectura.'] };
  return { ok: true, parserVersion: 1, offer: { amount, pickupKm: pickup.km, tripKm: trip.km, pickupMinutes: pickup.minutes, tripMinutes: trip.minutes, deductions: null }, warnings: ['Confirma cada cifra contra la captura antes de guardar.', 'Los descuentos siguen desconocidos. Esta lectura no demuestra rentabilidad neta.'] };
}

// Transcripciones anonimizadas de las dos capturas, sin rutas ni pasajeros.
export const sampleTexts = [
  'Pon Tu Precio\n$61.23\n5 puntos\nAl precio de Express\n8 min (2.2 km)\n21 min (9.5 km)\nAceptar $61.23\n$63.23 $65.23 $67.23',
  'Pon Tu Precio\n$22.70\n5 puntos\n10 min (2.2 km)\n3 min (770 m)\nAceptar $22.70\n$23.70 $23.70 $24.70',
];
