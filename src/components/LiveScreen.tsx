import React, { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import Pressable from './StablePressable';
import Ocr, { LiveStatus } from '../../modules/margen-ocr';
import type { Settings } from '../domain/model';
import type { ReviewedCapture } from './CaptureScreen';

const supported = Platform.OS === 'android' && typeof Ocr?.getLiveStatus === 'function';
const initial: LiveStatus = { active: false, requesting: false, overlayAllowed: false, message: 'Lectura detenida', offer: null, reviewOffer: null, reviewAgeSeconds: null, latencyMs: 0 };
export default function LiveScreen({ settings, onReview }: { settings: Settings; onReview: (value: ReviewedCapture) => void }) {
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [disclosed, setDisclosed] = useState(false);
  const [reviewHeight, setReviewHeight] = useState(0);
  function refresh() {
    if (supported && Ocr) try { setStatus(Ocr.getLiveStatus()); } catch { setError('No se pudo consultar el lector. Vuelve a abrir Margen.'); }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 750);
    const listener = AppState.addEventListener('change', value => { if (value === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  async function act(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }
  async function review() {
    if (!Ocr) return;
    // Re-read at action time; review is explicitly historical, never a live recommendation.
    const current = Ocr.getLiveStatus();
    if (!current.reviewOffer) { setError('Ya no hay una lectura reciente para revisar. Vuelve a mostrarla o usa una captura.'); return; }
    await Ocr.stopLive();
    onReview({ offer: current.reviewOffer, source: 'capture', input: 'screen', parserVersion: 1 });
  }
  function button(title: string, action: () => Promise<void>, disabled = false) {
    return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={() => void act(action)} style={[s.button, (disabled || busy) && s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;
  }
  return <View style={s.stack}>
    <Text style={s.eyebrow}>LECTURA EN PANTALLA · PILOTO ANDROID</Text>
    <Text accessibilityRole="header" style={s.title}>Los números junto a tu oferta</Text>
    <Text style={s.body}>Autoriza una sesión, abre DiDi y muestra una oferta de Pon Tu Precio. Margen mostrará importe por kilómetro y tiempo total, incluyendo la recogida.</Text>
    {!supported ? <Text style={s.body}>Requiere la nueva APK Android de Margen. Expo Go, iOS y web permiten continuar con evaluación manual o capturas compatibles.</Text> : <>
      <View style={s.card}>
        <Text style={s.section}>Tú controlas la lectura</Text>
        <Text style={s.body}>Margen accede a la imagen de la pantalla que compartas mientras la sesión esté activa. En Android 14 o superior elige solo DiDi cuando el sistema lo permita. Si compartes toda la pantalla, también podrá aparecer contenido de otras apps.</Text>
        <Text style={s.body}>Las imágenes y el texto se procesan localmente y se descartan; no se graban ni se envían a la nube. Solo se guarda una evaluación cuando la revisas y pulsas Evaluar y guardar.</Text>
        <Text style={s.body}>Puedes detener la sesión con la ✕ de la tarjeta, desde Margen o desde el control de captura de Android. Bloquear la pantalla también la detiene.</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: disclosed }} onPress={() => setDisclosed(!disclosed)} style={s.checkbox}><Text style={s.checkboxText}>{disclosed ? '☑' : '☐'} Entiendo y quiero habilitar la lectura</Text></Pressable>
      </View>
      <Text style={s.section}>1. Permite la tarjeta flotante</Text>
      <Text style={s.small}>Activa «Mostrar sobre otras apps» para Margen. Puedes mover la tarjeta arrastrando su título; colócala sobre el mapa y deja visibles los botones de DiDi.</Text>
      {button(status.overlayAllowed ? 'Tarjeta flotante permitida · ajustes' : 'Configurar tarjeta flotante', () => Ocr!.openOverlaySettings(), !disclosed || status.active || status.requesting)}
      <Text style={s.section}>2. Inicia una sesión</Text>
      <Text style={s.small}>Android pedirá autorización cada vez. La tarjeta compara tus objetivos al iniciar: ${settings.minPerKm.toFixed(2)}/km y hasta {settings.maxMinutes} min. Cambiar los objetivos requiere reiniciar la sesión.</Text>
      {button(status.requesting ? 'Esperando autorización…' : status.active ? 'Lectura en curso' : 'Autorizar e iniciar lectura', () => Ocr!.startLive(settings.minPerKm, settings.maxMinutes), !disclosed || !status.overlayAllowed || status.active || status.requesting)}
      <View accessibilityLiveRegion="polite" onLayout={event => { const height = event.nativeEvent.layout.height; setReviewHeight(previous => Math.max(previous, height)); }} style={[s.card, { minHeight: reviewHeight }]}><Text style={s.section}>{status.active ? 'Sesión activa' : 'Estado del lector'}</Text><Text style={s.body}>{status.message}</Text>
        {status.reviewOffer && <><Text style={s.eyebrow}>ÚLTIMA LECTURA · SOLO PARA REVISIÓN</Text><Text style={s.amount}>${status.reviewOffer.amount.toFixed(2)}</Text><Text style={s.body}>Recogida: {status.reviewOffer.pickupMinutes} min · {status.reviewOffer.pickupKm} km</Text><Text style={s.body}>Viaje: {status.reviewOffer.tripMinutes} min · {status.reviewOffer.tripKm} km</Text><Text style={s.small}>Leída hace {status.reviewAgeSeconds} s. Puede haber vencido o cambiado. Confirma las cifras antes de guardar.</Text>{button('Detener y revisar última lectura', review)}</>}
      </View>
      {(status.active || status.requesting) && button('Detener lectura', () => Ocr!.stopLive())}
    </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Text style={s.small}>La tarjeta es provisional y retira cifras si la lectura está incompleta o caduca. Importes antes de descuentos y costos; no demuestra ganancia neta. Prueba con el vehículo detenido. Las pantallas protegidas pueden impedir la lectura.</Text>
  </View>;
}
const s = StyleSheet.create({
  stack: { gap: 18 }, eyebrow: { color: '#075D46', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }, title: { fontSize: 33, lineHeight: 38, color: '#101D2D', fontWeight: '800', letterSpacing: -1 }, body: { color: '#667080', fontSize: 15, lineHeight: 23 }, small: { color: '#667080', fontSize: 12, lineHeight: 19 }, section: { color: '#101D2D', fontSize: 18, fontWeight: '700' }, card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: '#E3E4DD', gap: 14 }, checkbox: { minHeight: 48, justifyContent: 'center' }, checkboxText: { color: '#075D46', fontSize: 15, fontWeight: '600', lineHeight: 23 }, button: { minHeight: 52, backgroundColor: '#075D46', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }, disabled: { opacity: .4 }, amount: { fontSize: 36, color: '#101D2D', fontWeight: '800' }, error: { color: '#AD3030', lineHeight: 22 },
});
