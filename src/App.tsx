import React, { useEffect, useRef, useReducer, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { evaluate, parseNumber } from './domain/calculate';
import { AppData, examples, Offer, RecordEntry, Settings } from './domain/model';
import { emptyData, load, persist } from './storage/store';
import CaptureScreen, { ReviewedCapture } from './components/CaptureScreen';
import LiveScreen from './components/LiveScreen';
import Pressable from './components/StablePressable';
import ScreenScroll from './components/ScreenScroll';
import AuthScreen from './components/AuthScreen';
import { useSession } from './components/SessionProvider';
import { syncAccountData } from './services/cloudSync';
import { initialNavigation, navigationReducer, type Screen } from './domain/navigation';
import Ocr from '../modules/margen-ocr';
import { colors as c } from './theme';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
const money = (n: number) => `$${n.toFixed(2)}`;
const decimal = (n: number) => Number(n.toFixed(2)).toString();
function Button({ title, onPress, secondary = false, disabled = false, icon }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: Icon }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, disabled && { opacity: .45 }, pressed && { opacity: .78 }]}>
    {icon && <Ionicons name={icon} size={20} color={secondary ? c.ink : c.white} />}<Text style={[s.buttonText, secondary && { color: c.ink }]}>{title}</Text>
  </Pressable>;
}
function Notice({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return <View style={[s.notice, warning && { backgroundColor: c.amberBg }]}><Ionicons name="information-circle-outline" color={warning ? c.amber : c.green} size={21} /><Text style={[s.noticeText, warning && { color: c.amber }]}>{children}</Text></View>;
}
function Field({ label, value, onChange, unit, text = false, placeholder = 'Sin configurar' }: { label: string; value: string; onChange: (v: string) => void; unit?: string; text?: boolean; placeholder?: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.fieldRow}><TextInput accessibilityLabel={label} style={s.input} value={value} onChangeText={onChange} keyboardType={text ? 'default' : 'decimal-pad'} placeholder={placeholder} placeholderTextColor={c.muted} selectTextOnFocus />{unit && <Text style={s.unit}>{unit}</Text>}</View></View>;
}
function Heading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: string }) {
  return <View style={s.heading}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={s.title}>{title}</Text>{children && <Text style={s.body}>{children}</Text>}</View>;
}
export default function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const auth = useSession();
  const wasRecovery = useRef(auth.passwordRecovery);
  const scope = auth.user?.id;
  const owner = scope ?? 'guest';
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const epoch = useRef(0);
  const operation = useRef(false);
  const previousOwner = useRef<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigation);
  const screen = navigation.current;
  const offsets = useRef<Partial<Record<Screen, number>>>({});
  const [syncInfo, setSyncInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<RecordEntry | null>(null);
  const [source, setSource] = useState<RecordEntry['source']>('manual');
  const [extraction, setExtraction] = useState<RecordEntry['extraction']>();
  const [draft, setDraft] = useState<Record<keyof Offer, string>>({ amount: '', pickupKm: '', tripKm: '', pickupMinutes: '', tripMinutes: '', deductions: '' });
  const [vehicle, setVehicle] = useState({ brand: 'Fiat', engine: '1.0', efficiency: '15', fuelPrice: '', reservePerKm: '' });
  const [goals, setGoals] = useState({ minPerKm: '6', maxMinutes: '30' });
  async function hydrate() {
    const ticket = ++epoch.current;
    const expectedOwner = owner;
    setLoading(true); setError(''); setLoadFailed(false);
    try {
      const restored = await load(scope);
      if (ownerRef.current === expectedOwner && epoch.current === ticket) { setData(restored); setLoadedOwner(expectedOwner); }
    } catch (e) {
      if (ownerRef.current === expectedOwner && epoch.current === ticket) { setError(message(e)); setLoadFailed(true); setLoadedOwner(expectedOwner); }
    } finally { if (ownerRef.current === expectedOwner && epoch.current === ticket) setLoading(false); }
  }
  useEffect(() => {
    if (auth.loading) return;
    const identityChanged = previousOwner.current !== owner;
    if (identityChanged) {
      if (previousOwner.current !== null || scope) dispatch({ type: 'reset', screen: auth.passwordRecovery ? 'auth' : scope ? 'home' : 'welcome' });
      previousOwner.current = owner;
      operation.current = false; setBusy(false); setSelected(null); setSyncInfo('');
      setDraft({ amount: '', pickupKm: '', tripKm: '', pickupMinutes: '', tripMinutes: '', deductions: '' });
      offsets.current = {};
      void Ocr?.stopLive?.().catch(() => {});
    }
    void hydrate();
  }, [auth.loading, scope]);
  useEffect(() => {
    if (auth.passwordRecovery) dispatch({ type: 'reset', screen: 'auth' });
    else if (wasRecovery.current && auth.user) dispatch({ type: 'reset', screen: 'account' });
    wasRecovery.current = auth.passwordRecovery;
  }, [auth.passwordRecovery]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy || auth.passwordRecovery) return true;
      if (navigation.history.length) { Keyboard.dismiss(); dispatch({ type: 'back' }); return true; }
      if (screen !== 'home' && screen !== 'welcome') { go('home', true); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [navigation, busy, auth.passwordRecovery]);
  function message(e: unknown) { return e instanceof Error ? e.message : 'No se pudo completar la operación.'; }
  function go(next: Screen, tab = false) {
    if (next === screen || busy) return;
    Keyboard.dismiss(); setError('');
    if (next === 'vehicle') setVehicle({ brand: data.settings.brand, engine: data.settings.engine, efficiency: String(data.settings.efficiency), fuelPrice: data.settings.fuelPrice === null ? '' : String(data.settings.fuelPrice), reservePerKm: data.settings.reservePerKm === null ? '' : String(data.settings.reservePerKm) });
    if (next === 'goals') setGoals({ minPerKm: String(data.settings.minPerKm), maxMinutes: String(data.settings.maxMinutes) });
    // Editing screens start at the top. Tab lists preserve their last position.
    if (['evaluate', 'detail', 'goals', 'auth'].includes(next)) offsets.current[next] = 0;
    dispatch({ type: 'open', screen: next, tab });
  }
  function back() {
    if (busy || auth.passwordRecovery) return;
    Keyboard.dismiss(); setError('');
    if (navigation.history.length) dispatch({ type: 'back' }); else go('home', true);
  }
  async function commit(next: AppData, after: () => void) {
    if (operation.current || loadFailed) return;
    const expectedOwner = owner, ticket = epoch.current;
    operation.current = true; setBusy(true); setError('');
    try {
      await persist(next, scope);
      if (ownerRef.current === expectedOwner && epoch.current === ticket) { setData(next); after(); }
    } catch (e) {
      if (ownerRef.current === expectedOwner && epoch.current === ticket) setError(`No se guardó el cambio. ${message(e)}`);
    } finally {
      if (ownerRef.current === expectedOwner && epoch.current === ticket) { operation.current = false; setBusy(false); }
    }
  }
  async function synchronize(settingsMode: 'local' | 'remote') {
    if (!scope || operation.current) return;
    const expectedOwner = owner, ticket = epoch.current;
    operation.current = true; setBusy(true); setError(''); setSyncInfo('');
    try {
      const result = await syncAccountData(scope, data, { settingsMode });
      if (ownerRef.current !== expectedOwner || epoch.current !== ticket) return;
      await persist(result.data, scope);
      if (ownerRef.current !== expectedOwner || epoch.current !== ticket) return;
      setData(result.data);
      setSyncInfo(`Listo: ${result.uploaded} evaluaciones enviadas y ${result.downloaded} recuperadas. ${settingsMode === 'local' ? 'Configuración respaldada.' : 'Configuración recuperada si existía.'}`);
    } catch (e) { if (ownerRef.current === expectedOwner && epoch.current === ticket) setError(message(e)); }
    finally { if (ownerRef.current === expectedOwner && epoch.current === ticket) { operation.current = false; setBusy(false); } }
  }
  async function signOut() {
    if (operation.current) return;
    const expectedOwner = owner, ticket = epoch.current;
    operation.current = true; setBusy(true); setError('');
    try { await Ocr?.stopLive?.(); await auth.signOut(); }
    catch (e) { if (ownerRef.current === expectedOwner && epoch.current === ticket) setError(message(e)); }
    finally { if (ownerRef.current === expectedOwner && epoch.current === ticket) { operation.current = false; setBusy(false); } }
  }
  function example(index: number) {
    const offer = examples[index];
    setDraft(Object.fromEntries(Object.entries(offer).map(([key, value]) => [key, value === null ? '' : String(value)])) as Record<keyof Offer, string>);
    setSource('example'); setExtraction(undefined); go('evaluate');
  }
  function manual() {
    setDraft({ amount: '', pickupKm: '', tripKm: '', pickupMinutes: '', tripMinutes: '', deductions: '' }); setSource('manual'); setExtraction(undefined); go('evaluate');
  }
  function reviewCapture(capture: ReviewedCapture) {
    setDraft(Object.fromEntries(Object.entries(capture.offer).map(([key, value]) => [key, value === null ? '' : String(value)])) as Record<keyof Offer, string>);
    setSource(capture.source); setExtraction({ parserVersion: capture.parserVersion, input: capture.input }); go('evaluate');
  }
  function saveSettings(kind: 'vehicle' | 'goals') {
    try {
      let next: Settings;
      if (kind === 'vehicle') {
        const efficiency = parseNumber(vehicle.efficiency);
        if (efficiency === null || efficiency <= 0) throw new Error('El rendimiento debe ser mayor que cero.');
        if (!vehicle.brand.trim()) throw new Error('Ingresa la marca de tu vehículo.');
        next = { ...data.settings, brand: vehicle.brand.trim(), engine: vehicle.engine.trim(), efficiency, fuelPrice: parseNumber(vehicle.fuelPrice), reservePerKm: parseNumber(vehicle.reservePerKm) };
      } else {
        const minPerKm = parseNumber(goals.minPerKm), maxMinutes = parseNumber(goals.maxMinutes);
        if (!minPerKm || !maxMinutes) throw new Error('Los dos objetivos deben ser mayores que cero.');
        next = { ...data.settings, minPerKm, maxMinutes };
      }
      void commit({ ...data, settings: next }, () => dispatch({ type: 'reset', screen: 'home' }));
    } catch (e) { setError(message(e)); }
  }
  function calculate() {
    try {
      const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, parseNumber(value)]));
      for (const key of ['amount', 'pickupKm', 'tripKm', 'pickupMinutes', 'tripMinutes']) if (values[key] === null) throw new Error('Completa el importe, las dos distancias y los dos tiempos. Puedes indicar cero cuando corresponda.');
      const offer = values as Offer;
      const entry: RecordEntry = { id: Crypto.randomUUID(), createdAt: new Date().toISOString(), source, ...(extraction ? { extraction } : {}), offer, settings: { ...data.settings }, result: evaluate(offer, data.settings) };
      void commit({ ...data, records: [entry, ...data.records] }, () => { setSelected(entry); offsets.current.detail = 0; dispatch({ type: 'open', screen: 'detail' }); });
    } catch (e) { setError(message(e)); }
  }
  async function exportData() {
    try {
      const json = JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'margen-respaldo.json'; a.click(); URL.revokeObjectURL(url);
      } else await Share.share({ title: 'Respaldo de Margen', message: json });
    } catch (e) { setError(message(e)); }
  }
  const row = (icon: Icon, title: string, sub: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action} style={s.row}><Ionicons name={icon} size={24} color={c.green} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>{title}</Text><Text style={s.small}>{sub}</Text></View><Ionicons name="chevron-forward" size={18} color={c.muted} /></Pressable>;
  if (auth.loading || loading || loadedOwner !== owner) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={c.green} size="large" /><Text style={s.body}>Preparando tu espacio…</Text></View></SafeAreaView>;
  if (loadFailed) return <SafeAreaView style={s.safe}><View style={s.center}><Heading title="Tus datos necesitan revisión" /><Notice warning>{error}</Notice><Button title="Volver a intentar" onPress={() => void hydrate()} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={s.shell}>
    <View style={s.top}>{screen !== 'welcome' && screen !== 'home' ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={busy || auth.passwordRecovery} onPress={back} style={s.back}><Ionicons name="arrow-back" size={23} color={c.ink} /></Pressable> : <View />}
      <Text style={s.wordmark}>╱ <Text style={{ color: c.green }}>┊</Text> ╲  Margen</Text><View style={s.pilot}><Text style={s.pilotText}>PILOTO</Text></View></View>
    {!!error && <View style={s.errorOverlay} accessibilityRole="alert"><View style={{ flex: 1 }}><Text style={s.errorText}>{error}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={() => setError('')} style={{ padding: 12 }}><Ionicons name="close" size={23} color={c.danger} /></Pressable></View>}
    <ScreenScroll key={`${owner}:${screen}`} initialOffset={offsets.current[screen] ?? 0} onOffset={y => { offsets.current[screen] = y; }} contentContainerStyle={s.content}>
      {screen === 'welcome' && <>
        <View style={s.welcomeMark}><Ionicons name="navigate-outline" size={80} color={c.green} /></View>
        <Heading eyebrow="CADA VIAJE CUENTA" title={'Cada viaje,\ncon números claros.'}>Evalúa tus ofertas con tus costos y objetivos. Empieza con los ejemplos reales del piloto.</Heading>
        <View style={s.card}><Text style={s.rowTitle}>Tu criterio, mejor informado.</Text><Text style={s.body}>Recogida + viaje. Importe, tiempo y distancia en una sola evaluación.</Text></View>
        <Button title="Entrar al piloto local" icon="arrow-forward" onPress={() => go('home')} />
        <Button title="Iniciar sesión o crear cuenta" secondary onPress={() => go('auth')} icon="person-outline" />
        <Text style={s.small}>Puedes usar el piloto local sin cuenta o entrar para respaldar tus evaluaciones. Los datos del piloto permanecen separados de cada cuenta.</Text>
      </>}
      {screen === 'auth' && <AuthScreen controller={auth} onBack={back} />}
      {screen === 'home' && <>
        <Heading eyebrow="TU ESPACIO DE TRABAJO" title="Buen día.">Decide con el recorrido completo a la vista.</Heading>
        <View style={s.hero}><View style={s.status}><View style={s.dot} /><Text style={s.label}>Evaluación manual disponible</Text></View><Ionicons name="speedometer-outline" size={40} color={c.green} /><Text style={s.heroTitle}>Listo para evaluar</Text><Text style={s.body}>Incluye el trayecto para recoger al pasajero y compara cada oferta con tus objetivos.</Text><Button title="Evaluar una oferta" icon="add" onPress={manual} /></View>
        <View style={s.sectionHead}><Text style={s.sectionTitle}>Prueba con tus capturas</Text><Text style={s.small}>Pon Tu Precio</Text></View>
        <View style={s.two}>{examples.map((offer, i) => <Pressable key={i} accessibilityRole="button" onPress={() => example(i)} style={[s.card, { flex: 1 }]}><Text style={s.eyebrow}>EJEMPLO {i + 1}</Text><Text style={s.amountSmall}>{money(offer.amount)}</Text><Text style={s.small}>{offer.pickupMinutes + offer.tripMinutes} min · {decimal(offer.pickupKm + offer.tripKm)} km</Text><Ionicons name="arrow-forward" size={20} color={c.green} /></Pressable>)}</View>
        <Button title="Probar lectura de oferta" icon="scan-outline" secondary onPress={() => go('capture')} />
        <Button title="Leer pantalla de DiDi" icon="layers-outline" onPress={() => go('live')} />
        {row('car-outline', 'Mi vehículo', `${data.settings.brand} ${data.settings.engine} · ${data.settings.efficiency} km/l`, () => go('vehicle'))}
        {row('options-outline', 'Mis objetivos', `${money(data.settings.minPerKm)}/km · hasta ${data.settings.maxMinutes} min`, () => go('goals'))}
        <Notice>Lectura automática de DiDi por validar. Usa este piloto con el vehículo detenido.</Notice>
      </>}
      {screen === 'vehicle' && <>
        <Heading eyebrow="MI AUTO" title="Conoce tu costo por kilómetro">Los datos iniciales vienen del conductor del piloto. Puedes ajustarlos a tu vehículo.</Heading>
        <Field label="Marca" text value={vehicle.brand} onChange={v => setVehicle({ ...vehicle, brand: v })} />
        <Field label="Motor" text value={vehicle.engine} onChange={v => setVehicle({ ...vehicle, engine: v })} />
        <Field label="Rendimiento" unit="km/l" value={vehicle.efficiency} onChange={v => setVehicle({ ...vehicle, efficiency: v })} />
        <Field label="Precio del combustible" unit="$/l" value={vehicle.fuelPrice} onChange={v => setVehicle({ ...vehicle, fuelPrice: v })} />
        <Field label="Reservas del vehículo" unit="$/km" value={vehicle.reservePerKm} onChange={v => setVehicle({ ...vehicle, reservePerKm: v })} />
        <Text style={s.small}>Incluye aquí mantenimiento, llantas y depreciación por kilómetro. Deja vacío si aún no lo conoces; cero significa que decides excluir esas reservas.</Text>
        <Notice>Sin combustible y reservas configurados, mostraremos tasas del importe y no un margen completo.</Notice>
        <Button disabled={busy} title={busy ? 'Guardando…' : 'Guardar vehículo'} onPress={() => saveSettings('vehicle')} />
      </>}
      {screen === 'goals' && <>
        <Heading eyebrow="TUS OBJETIVOS" title="Tú defines qué te conviene">Compara el importe ofrecido por kilómetro y la duración total. El umbral inicial de $6/km es provisional.</Heading>
        <Field label="Mínimo de importe por kilómetro" unit="$/km" value={goals.minPerKm} onChange={v => setGoals({ ...goals, minPerKm: v })} />
        <Field label="Duración máxima total" unit="min" value={goals.maxMinutes} onChange={v => setGoals({ ...goals, maxMinutes: v })} />
        <View style={s.card}><Ionicons name="checkmark-circle" size={25} color={c.green} /><Text style={s.rowTitle}>Recogida siempre incluida</Text><Text style={s.body}>Sumamos distancia y tiempo de recogida y viaje. Así evitamos sobreestimar las tasas.</Text></View>
        <Notice>Este criterio compara el importe antes de descuentos y costos. No equivale a un mínimo de ganancia neta.</Notice>
        <Button disabled={busy} title={busy ? 'Guardando…' : 'Guardar objetivos'} onPress={() => saveSettings('goals')} />
      </>}
      {screen === 'capture' && <CaptureScreen onReview={reviewCapture} />}
      {screen === 'live' && <LiveScreen settings={data.settings} onReview={reviewCapture} />}
      {screen === 'evaluate' && <>
        <Heading eyebrow={source === 'example' ? 'EJEMPLO DE CAPTURA' : source === 'capture' ? 'LECTURA PARA REVISAR' : 'EVALUACIÓN MANUAL'} title="Revisa la oferta">Pon Tu Precio · MXN. Introduce kilómetros; 770 metros equivalen a 0.77 km.</Heading>
        {extraction && <Notice>Datos importados para revisión. Confirma las cifras y corrige cualquier error antes de guardar. No conservamos la imagen ni el texto original.</Notice>}
        <Field label="Importe ofrecido" unit="MXN" value={draft.amount} onChange={v => setDraft({ ...draft, amount: v })} />
        <Text style={s.sectionTitle}>Hasta el pasajero</Text><View style={s.two}><View style={{ flex: 1 }}><Field label="Distancia de recogida" unit="km" value={draft.pickupKm} onChange={v => setDraft({ ...draft, pickupKm: v })} /></View><View style={{ flex: 1 }}><Field label="Tiempo de recogida" unit="min" value={draft.pickupMinutes} onChange={v => setDraft({ ...draft, pickupMinutes: v })} /></View></View>
        <Text style={s.sectionTitle}>Con el pasajero</Text><View style={s.two}><View style={{ flex: 1 }}><Field label="Distancia del viaje" unit="km" value={draft.tripKm} onChange={v => setDraft({ ...draft, tripKm: v })} /></View><View style={{ flex: 1 }}><Field label="Tiempo del viaje" unit="min" value={draft.tripMinutes} onChange={v => setDraft({ ...draft, tripMinutes: v })} /></View></View>
        <Field label="Descuentos totales conocidos" unit="MXN" value={draft.deductions} onChange={v => setDraft({ ...draft, deductions: v })} placeholder="Desconocidos" />
        <Text style={s.small}>Solo cargos no descontados del importe mostrado. Vacío significa desconocido; 0 confirma que no restarás cargos adicionales. No vuelvas a descontar conceptos incluidos.</Text>
        <Button disabled={busy} title={busy ? 'Guardando…' : 'Evaluar y guardar'} onPress={calculate} />
      </>}
      {screen === 'detail' && selected && <Result entry={selected} />}
      {screen === 'history' && <>
        <Heading eyebrow="TU HISTORIAL" title="Cada oferta, en contexto">Los resultados conservan los parámetros que usaste al calcularlos.</Heading>
        {data.records.length === 0 ? <View style={s.card}><Ionicons name="time-outline" size={38} color={c.green} /><Text style={s.sectionTitle}>Tu primera evaluación empieza aquí</Text><Text style={s.body}>Evalúa una oferta o abre uno de los ejemplos para ver cómo funciona.</Text><Button title="Evaluar oferta" onPress={manual} /></View> : data.records.map(entry => <Pressable key={entry.id} accessibilityRole="button" onPress={() => { setSelected(entry); offsets.current.detail = 0; dispatch({ type: 'open', screen: 'detail' }); }} style={s.historyCard}><View style={s.sectionHead}><Text style={s.eyebrow}>{entry.source === 'example' ? 'EJEMPLO' : entry.source === 'capture' ? 'LECTURA REVISADA' : 'MANUAL'}</Text><Text style={s.small}>{new Date(entry.createdAt).toLocaleDateString('es-MX')}</Text></View><Text style={s.amountSmall}>{money(entry.offer.amount)}</Text><Text style={s.body}>{decimal(entry.result.km)} km · {decimal(entry.result.minutes)} min</Text><Text style={s.rowTitle}>{money(entry.result.grossPerKm)}/km antes de descuentos y costos</Text><Text style={[s.badge, { color: entry.result.meetsAmountGoal && entry.result.meetsTimeGoal ? c.green : c.amber }]}>{entry.result.meetsAmountGoal && entry.result.meetsTimeGoal ? 'Cumple criterios de importe y duración' : 'Fuera de tus criterios'}</Text></Pressable>)}
      </>}
      {screen === 'account' && <>
        <Heading eyebrow="CUENTA Y DATOS" title="Tu espacio, bajo control">{auth.user ? 'Sesión iniciada · versión 0.1.0' : 'Piloto local · versión 0.1.0'}</Heading>
        <View style={s.hero}><Ionicons name="flask-outline" size={35} color={c.green} /><Text style={s.heroTitle}>Piloto sin cobro</Text><Text style={s.body}>Todas las funciones implementadas están disponibles. No hay una suscripción activa ni cobros automáticos.</Text></View>
        {auth.user ? <>
          <View style={s.card}><Text style={s.sectionTitle}>{auth.user.user_metadata?.display_name || 'Tu cuenta'}</Text><Text style={s.body}>{auth.user.email}</Text><Text style={s.small}>El historial de esta cuenta está separado del piloto local y de otras cuentas.</Text></View>
          <Button disabled={busy} title={busy ? 'Procesando…' : 'Respaldar mi cuenta'} icon="cloud-upload-outline" onPress={() => void synchronize('local')} />
          <Text style={s.small}>Envía la configuración actual y fusiona el historial con tu respaldo, sin duplicar evaluaciones. Las capturas y el texto OCR no se suben.</Text>
          <Button disabled={busy} title="Recuperar mi respaldo" secondary icon="cloud-download-outline" onPress={() => void synchronize('remote')} />
          <Text style={s.small}>Recupera la configuración guardada en la nube y conserva las evaluaciones de ambos lados.</Text>
          <View accessibilityLiveRegion="polite" style={{ minHeight: 70 }}>{!!syncInfo && <Notice>{syncInfo}</Notice>}</View>
          <Button disabled={busy} title="Cerrar sesión en este dispositivo" secondary onPress={() => void signOut()} />
        </> : <>
          <Notice>Estás usando el piloto local. Tus evaluaciones se conservan aquí y no se asignan automáticamente a una cuenta.</Notice>
          <Button title="Iniciar sesión o crear cuenta" onPress={() => go('auth')} icon="person-outline" />
        </>}
        {row('car-outline', 'Mi vehículo', 'Combustible y reservas', () => go('vehicle'))}{row('options-outline', 'Mis objetivos', 'Importe por km y duración', () => go('goals'))}
        <Button title="Exportar mis datos" secondary icon="download-outline" onPress={() => void exportData()} />
        <Text style={s.small}>La exportación incluye configuración e historial. Guárdala antes de borrar datos del navegador o desinstalar la app.</Text>
      </>}
      <Text style={s.footer}>MARGEN · HECHO PARA DECIDIR CON CLARIDAD</Text>
    </ScreenScroll>
    {screen !== 'welcome' && screen !== 'auth' && <View style={s.nav}>{([{ screen: 'home', label: 'Inicio', icon: 'home-outline' }, { screen: 'history', label: 'Historial', icon: 'time-outline' }, { screen: 'vehicle', label: 'Mi auto', icon: 'car-outline' }, { screen: 'account', label: 'Cuenta', icon: 'person-outline' }] as const).map(tab => <Pressable key={tab.screen} accessibilityRole="tab" accessibilityState={{ selected: screen === tab.screen }} disabled={busy} onPress={() => go(tab.screen, true)} style={s.navItem}><Ionicons name={tab.icon} size={23} color={screen === tab.screen ? c.green : c.muted} /><Text style={[s.navText, screen === tab.screen && { color: c.green, fontWeight: '700' }]}>{tab.label}</Text><View style={[s.navLine, screen !== tab.screen && { opacity: 0 }]} /></Pressable>)}</View>}
  </View></KeyboardAvoidingView></SafeAreaView>;
}
function Result({ entry }: { entry: RecordEntry }) {
  const { result: r, settings, offer } = entry;
  return <><Heading eyebrow={entry.source === 'example' ? 'EJEMPLO GUARDADO' : entry.source === 'capture' ? 'LECTURA REVISADA' : 'OFERTA GUARDADA'} title="Detalle de la oferta" />
    <Text style={s.chip}>Pon Tu Precio</Text><View style={s.priceBlock}><Text style={s.amount}>{money(offer.amount)}</Text><Text style={s.rowTitle}>Importe ofrecido</Text></View>
    <View style={s.route}><Ionicons name="location" color={c.green} size={25} /><View><Text style={s.rowTitle}>Recogida</Text><Text style={s.body}>{decimal(offer.pickupMinutes)} min · {decimal(offer.pickupKm)} km</Text></View></View>
    <View style={s.route}><Ionicons name="flag-outline" color={c.amber} size={25} /><View><Text style={s.rowTitle}>Viaje</Text><Text style={s.body}>{decimal(offer.tripMinutes)} min · {decimal(offer.tripKm)} km</Text></View></View>
    <View style={s.total}><Text style={s.small}>Total del recorrido</Text><Text style={s.sectionTitle}>{decimal(r.minutes)} min · {decimal(r.km)} km</Text></View>
    <View style={s.two}><View style={s.metric}><Text style={s.metricValue}>{money(r.grossPerKm)}</Text><Text style={s.small}>importe / km</Text></View><View style={s.metric}><Text style={s.metricValue}>{money(r.grossPerHour)}</Text><Text style={s.small}>importe / hora</Text></View></View><Text style={s.small}>Antes de descuentos y costos. No es el promedio de una jornada.</Text>
    <Notice warning={!r.meetsAmountGoal}>{r.meetsAmountGoal ? `Cumple el criterio de importe de ${money(settings.minPerKm)}/km.` : `Por debajo del mínimo de importe de ${money(settings.minPerKm)}/km.`}</Notice>
    <Notice warning={!r.meetsTimeGoal}>{r.meetsTimeGoal ? `Dentro del límite de ${settings.maxMinutes} min, incluyendo recogida.` : `Supera el límite de ${settings.maxMinutes} min, incluyendo recogida.`}</Notice>
    <View style={s.card}><Text style={s.sectionTitle}>Costos incluidos</Text><Cost label="Descuentos declarados" value={offer.deductions} /><Cost label="Combustible estimado" value={r.fuelCost} /><Cost label="Combustible + reservas" value={r.operatingCost} /><View style={s.total}><Text style={s.label}>Margen después de costos incluidos</Text><Text style={s.metricValue}>{r.margin === null ? 'Pendiente' : money(r.margin)}</Text></View><Text style={s.small}>{r.margin === null ? 'Faltan descuentos, combustible o reservas. No asumimos que sean cero.' : 'Estimación después de descuentos, combustible y reservas configuradas. No incluye espera adicional, retorno ni costos fijos; no es utilidad neta fiscal.'}</Text></View>
    <Text style={s.small}>Cálculo v{r.version} · {new Date(entry.createdAt).toLocaleString('es-MX')}. Costos conservados al guardar; editar tu vehículo no modifica este resultado.</Text>
  </>;
}
function Cost({ label, value }: { label: string; value: number | null }) { return <View style={s.sectionHead}><Text style={s.small}>{label}</Text><Text style={s.label}>{value === null ? 'Sin configurar' : money(value)}</Text></View>; }
const s = StyleSheet.create({
  errorOverlay: { position: 'absolute', top: 66, left: 12, right: 12, zIndex: 20, backgroundColor: c.amberBg, borderRadius: 12, paddingLeft: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', elevation: 5 }, errorText: { color: c.danger, fontSize: 14, lineHeight: 21 },
  safe: { flex: 1, backgroundColor: c.paper }, shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  top: { minHeight: 64, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line }, wordmark: { color: c.ink, fontSize: 23, fontWeight: '800', letterSpacing: -.9 }, pilot: { borderWidth: 1, borderColor: c.line, borderRadius: 5, padding: 5 }, pilotText: { color: c.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' }, back: { padding: 8, marginLeft: -8 },
  content: { padding: 24, gap: 18, paddingBottom: 34 }, heading: { gap: 12, marginVertical: 8 }, eyebrow: { fontSize: 10, letterSpacing: 1.7, fontWeight: '700', color: c.green }, title: { fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1.3, color: c.ink }, body: { fontSize: 15, lineHeight: 23, color: c.muted }, small: { fontSize: 12, lineHeight: 19, color: c.muted, flexShrink: 1 }, label: { fontSize: 12, fontWeight: '600', color: c.ink },
  button: { minHeight: 54, padding: 14, borderRadius: 12, backgroundColor: c.green, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 }, buttonText: { color: c.white, fontSize: 15, fontWeight: '700', flexShrink: 1 }, secondary: { backgroundColor: c.paper, borderWidth: 1, borderColor: c.line },
  hero: { backgroundColor: c.wash, borderRadius: 18, padding: 23, gap: 18 }, heroTitle: { fontSize: 29, lineHeight: 33, fontWeight: '800', color: c.ink, letterSpacing: -.8 }, status: { flexDirection: 'row', gap: 7, alignItems: 'center' }, dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: c.green },
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, padding: 18, borderRadius: 14, gap: 12 }, two: { flexDirection: 'row', gap: 12 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, sectionTitle: { fontSize: 19, fontWeight: '700', color: c.ink, letterSpacing: -.4 }, rowTitle: { fontSize: 15, fontWeight: '700', color: c.ink }, row: { paddingVertical: 18, borderBottomWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 14 },
  notice: { backgroundColor: c.wash, borderRadius: 10, flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start' }, noticeText: { color: c.green, fontSize: 13, lineHeight: 20, flex: 1 },
  field: { borderWidth: 1, borderColor: c.line, backgroundColor: c.white, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 5, gap: 4 }, fieldRow: { flexDirection: 'row', alignItems: 'center' }, input: { flex: 1, minWidth: 0, minHeight: 42, fontSize: 19, color: c.ink, paddingVertical: 8 }, unit: { color: c.muted, fontSize: 12, paddingLeft: 7 },
  priceBlock: { backgroundColor: c.white, borderRadius: 14, padding: 20, gap: 3 }, amount: { fontSize: 53, letterSpacing: -2, color: c.ink, fontWeight: '800' }, amountSmall: { fontSize: 29, letterSpacing: -1, fontWeight: '800', color: c.ink }, chip: { backgroundColor: c.lime, color: c.ink, alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, fontSize: 12, fontWeight: '700' }, route: { flexDirection: 'row', gap: 13, alignItems: 'center' }, total: { borderTopWidth: 1, borderColor: c.line, paddingTop: 14, gap: 6 }, metric: { flex: 1, paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, gap: 6 }, metricValue: { fontSize: 25, color: c.ink, fontWeight: '800', letterSpacing: -.6 },
  historyCard: { borderBottomWidth: 1, borderColor: c.line, paddingVertical: 20, gap: 12 }, badge: { fontSize: 12, fontWeight: '700' },
  nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, backgroundColor: c.paper, paddingVertical: 12 }, navItem: { flex: 1, alignItems: 'center', gap: 6, minHeight: 56 }, navText: { fontSize: 11, color: c.muted }, navLine: { width: 25, height: 2, backgroundColor: c.green, borderRadius: 2 }, footer: { fontSize: 8, letterSpacing: 1.5, color: c.muted, textAlign: 'center', marginTop: 25 }, center: { flex: 1, justifyContent: 'center', padding: 28, gap: 20 }, welcomeMark: { paddingVertical: 30, alignItems: 'flex-start' },
});
