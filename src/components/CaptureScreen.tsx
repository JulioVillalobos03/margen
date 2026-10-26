import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import Pressable from './StablePressable';
import * as ImagePicker from 'expo-image-picker';
import { extractOffer, ExtractedOffer, sampleTexts } from '../domain/extractOffer';
import type { Offer } from '../domain/model';
import { hasLocalOcr, recognizeCapture } from '../services/ocr';

export type ReviewedCapture = { offer: Offer; source: 'capture' | 'example'; input: 'image' | 'text' | 'screen'; parserVersion: 1 };
export default function CaptureScreen({ onReview }: { onReview: (result: ReviewedCapture) => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ExtractedOffer | null>(null);
  const [input, setInput] = useState<'image' | 'text'>('text');
  const [example, setExample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function update(value: string) { setText(value); setResult(null); setExample(false); setInput('text'); setError(''); }
  async function pick() {
    setBusy(true); setResult(null); setError(''); setText(''); setExample(false);
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false });
      if (selection.canceled) return;
      const detected = await recognizeCapture(selection.assets[0].uri);
      setText(detected); setInput('image'); setResult(extractOffer(detected));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo analizar la imagen.'); }
    finally { setBusy(false); }
  }
  const offer = result?.ok ? result.offer : null;
  return <View style={s.stack}>
    <Text style={s.eyebrow}>LABORATORIO DE LECTURA</Text>
    <Text accessibilityRole="header" style={s.title}>De la captura a los números</Text>
    <Text style={s.body}>Selecciona una oferta guardada de Pon Tu Precio. Revisa precio, recogida y viaje antes de calcular.</Text>
    <View style={s.notice}><Text style={s.noticeText}>La imagen y su texto no se suben a Supabase. El análisis es local. Selecciona capturas sin datos personales y usa esta prueba con el vehículo detenido.</Text></View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !hasLocalOcr || busy }} disabled={!hasLocalOcr || busy} onPress={() => void pick()} style={[s.button, (!hasLocalOcr || busy) && s.disabled]}><Text style={s.buttonText}>{busy ? 'Leyendo captura…' : 'Seleccionar una captura'}</Text></Pressable>
    {busy && <ActivityIndicator color="#075D46" />}
    {!hasLocalOcr && <Text style={s.small}>Expo Go y la vista web permiten probar el extractor con texto. Para leer imágenes hace falta instalar la compilación Android de Margen con OCR.</Text>}
    <View style={s.divider} />
    <Text style={s.section}>Probar con texto</Text>
    <Text style={s.small}>Pega el texto de una oferta o carga una transcripción anonimizada. Esto prueba interpretación; no mide precisión del OCR.</Text>
    <View style={s.row}>{sampleTexts.map((value, i) => <Pressable key={i} accessibilityRole="button" disabled={busy} onPress={() => { setText(value); setResult(null); setExample(true); setInput('text'); setError(''); }} style={s.secondary}><Text style={s.secondaryText}>Ejemplo {i + 1}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Texto de la captura" value={text} onChangeText={update} multiline scrollEnabled editable={!busy} maxLength={20000} style={s.textarea} placeholder={'Pon Tu Precio\n$61.23\n8 min (2.2 km)\n21 min (9.5 km)\nAceptar $61.23'} placeholderTextColor="#667080" textAlignVertical="top" autoCorrect={false} />
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !text.trim() }} disabled={busy || !text.trim()} style={[s.button, (busy || !text.trim()) && s.disabled]} onPress={() => { setResult(extractOffer(text)); setError(''); }}><Text style={s.buttonText}>Interpretar oferta</Text></Pressable>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {result && !result.ok && <View accessibilityRole="alert" style={s.warning}><Text style={s.section}>Lectura incompleta</Text>{result.reasons.map(reason => <Text key={reason} style={s.body}>{reason}</Text>)}<Text style={s.small}>No se ha guardado ni evaluado esta lectura. Puedes corregir el texto o evaluar manualmente.</Text></View>}
    {offer && result?.ok && <View style={s.card}>
      <Text style={s.eyebrow}>{example ? 'EJEMPLO · REVISIÓN' : 'DATOS DETECTADOS · REVISIÓN'}</Text>
      <Text style={s.amount}>${offer.amount.toFixed(2)}</Text>
      <Text style={s.body}>Recogida: {offer.pickupMinutes} min · {offer.pickupKm} km</Text>
      <Text style={s.body}>Viaje: {offer.tripMinutes} min · {offer.tripKm} km</Text>
      <Text style={s.small}>Descuentos: desconocidos</Text>
      {result.warnings.map(w => <Text key={w} style={s.small}>{w}</Text>)}
      <Pressable accessibilityRole="button" onPress={() => onReview({ offer, source: example ? 'example' : 'capture', input, parserVersion: 1 })} style={s.button}><Text style={s.buttonText}>Revisar en el evaluador</Text></Pressable>
      <Text style={s.small}>Abriremos los campos editables. Nada se guarda hasta que pulses Evaluar y guardar.</Text>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  stack: { gap: 18 }, eyebrow: { fontSize: 10, letterSpacing: 1.7, fontWeight: '700', color: '#075D46' }, title: { fontSize: 33, lineHeight: 38, fontWeight: '800', letterSpacing: -1, color: '#101D2D' }, body: { fontSize: 15, lineHeight: 23, color: '#667080' }, small: { fontSize: 12, lineHeight: 19, color: '#667080' }, section: { fontSize: 18, fontWeight: '700', color: '#101D2D' },
  notice: { backgroundColor: '#F0F5E6', padding: 16, borderRadius: 12 }, noticeText: { color: '#075D46', fontSize: 13, lineHeight: 20 }, button: { backgroundColor: '#075D46', padding: 16, borderRadius: 12, minHeight: 52, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }, disabled: { opacity: .4 }, divider: { height: 1, backgroundColor: '#E3E4DD' }, row: { flexDirection: 'row', gap: 12 }, secondary: { flex: 1, borderWidth: 1, borderColor: '#E3E4DD', padding: 14, borderRadius: 10, alignItems: 'center' }, secondaryText: { color: '#101D2D', fontWeight: '600' }, textarea: { height: 190, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E4DD', borderRadius: 12, padding: 16, fontSize: 15, color: '#101D2D', lineHeight: 23 }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E4DD', padding: 20, borderRadius: 14, gap: 14 }, amount: { fontSize: 42, fontWeight: '800', color: '#101D2D', letterSpacing: -1.5 }, warning: { backgroundColor: '#FFF0D8', padding: 16, borderRadius: 12, gap: 12 }, error: { color: '#AD3030', lineHeight: 22 },
});
