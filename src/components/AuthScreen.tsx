import { colors as c } from '../theme';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Pressable from './StablePressable';
import type { AuthController } from '../services/auth';
import { validateNewPassword } from '../domain/auth';

type Mode = 'login' | 'register' | 'forgot' | 'recovery';
function Action({ title, onPress, disabled, secondary = false, google = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; google?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, disabled && s.disabled, pressed && { opacity: .78 }]}>
    {google && <Ionicons name="logo-google" color={c.ink} size={20} />}<Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
  </Pressable>;
}
function Entry({ label, value, onChange, password = false, email = false, disabled = false, newPassword = false }: { label: string; value: string; onChange: (value: string) => void; password?: boolean; email?: boolean; disabled?: boolean; newPassword?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.inputRow}><TextInput accessibilityLabel={label} style={s.input} value={value} onChangeText={onChange} editable={!disabled} secureTextEntry={password && !visible} keyboardType={email ? 'email-address' : 'default'} autoCapitalize={email || password ? 'none' : 'words'} autoCorrect={!email && !password} autoComplete={email ? 'email' : password ? newPassword ? 'new-password' : 'current-password' : 'name'} textContentType={email ? 'emailAddress' : password ? newPassword ? 'newPassword' : 'password' : 'name'} maxLength={email ? 254 : password ? 256 : 80} />{password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setVisible(value => !value)} style={s.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={c.muted} /></Pressable>}</View></View>;
}
/** The app owns the single scroll container; fields and error updates never remount it. */
export default function AuthScreen({ controller, onBack, initialMode = 'login' }: { controller: AuthController; onBack?: () => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(controller.passwordRecovery ? 'recovery' : initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [localError, setLocalError] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  useEffect(() => { if (controller.passwordRecovery) setMode('recovery'); }, [controller.passwordRecovery]);
  function change(next: Mode) {
    if (busy) return;
    controller.clearError(); setLocalError(''); setInfo(''); setPassword(''); setConfirmation(''); setPendingConfirmation(false); setMode(next);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setLocalError(''); setInfo(''); controller.clearError();
    try { await action(); } catch (e) { setLocalError(e instanceof Error ? e.message : 'No se pudo completar la solicitud.'); }
    finally { setBusy(false); }
  }
  async function submit() {
    await run(async () => {
      if (mode === 'register' || mode === 'recovery') {
        validateNewPassword(password);
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
      }
      if (mode === 'login') await controller.signIn(email, password);
      else if (mode === 'register') {
        const result = await controller.signUp(email, password, name);
        setPassword(''); setConfirmation('');
        if (result === 'confirmation') { setPendingConfirmation(true); setInfo('Revisa tu correo. Si el registro requiere confirmación, recibirás un enlace para activarlo. Ábrelo desde esta misma app y dispositivo.'); }
      } else if (mode === 'forgot') {
        await controller.sendPasswordReset(email);
        setInfo('Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña. Ábrelo en este mismo dispositivo, donde solicitaste el cambio.');
      } else {
        await controller.updatePassword(password); setPassword(''); setConfirmation(''); setInfo('Tu contraseña se actualizó.');
      }
    });
  }
  const disabled = busy || !controller.configured || controller.loading;
  const error = localError || controller.error;
  return <View style={s.stack}>
    <View style={s.symbol}><Ionicons name={mode === 'forgot' || mode === 'recovery' ? 'key-outline' : 'person-outline'} size={32} color={c.green} /></View>
    <Text style={s.eyebrow}>TU CUENTA MARGEN</Text>
    <Text accessibilityRole="header" style={s.title}>{mode === 'login' ? 'Qué bueno tenerte de vuelta.' : mode === 'register' ? 'Tus números, contigo.' : mode === 'forgot' ? 'Recupera tu acceso.' : 'Elige una nueva contraseña.'}</Text>
    <Text style={s.body}>{mode === 'login' ? 'Entra para guardar tus evaluaciones y tu configuración en tu cuenta.' : mode === 'register' ? 'Crea tu cuenta para conservar tu vehículo, objetivos e historial.' : mode === 'forgot' ? 'Te enviaremos un enlace para que puedas volver a entrar.' : 'Guarda una contraseña nueva antes de continuar.'}</Text>
    {!controller.configured && <View style={s.notice}><Text style={s.noticeTitle}>Conexión pendiente</Text><Text style={s.small}>Las cuentas se activan al conectar el proyecto de Supabase. El piloto local sigue disponible.</Text></View>}
    {(mode === 'login' || mode === 'register') && <><Action title={busy ? 'Espera un momento…' : 'Continuar con Google'} google secondary disabled={disabled} onPress={() => void run(async () => { if (!await controller.signInGoogle()) setInfo('Acceso con Google cancelado. Puedes volver a intentarlo o usar tu correo.'); })} /><View style={s.separator}><View style={s.line} /><Text style={s.small}>o con tu correo</Text><View style={s.line} /></View></>}
    {mode === 'register' && <Entry label="Tu nombre (opcional)" value={name} onChange={setName} disabled={busy} />}
    {mode !== 'recovery' && <Entry label="Correo electrónico" value={email} onChange={setEmail} email disabled={busy} />}
    {mode !== 'forgot' && <Entry label={mode === 'recovery' ? 'Nueva contraseña' : 'Contraseña'} value={password} onChange={setPassword} password newPassword={mode !== 'login'} disabled={busy} />}
    {(mode === 'register' || mode === 'recovery') && <><Text style={s.small}>Usa al menos 8 caracteres. El servidor puede pedir requisitos adicionales.</Text><Entry label="Confirma tu contraseña" value={confirmation} onChange={setConfirmation} password newPassword disabled={busy} /></>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!info && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.noticeText}>{info}</Text></View>}
    <Action disabled={disabled} title={busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear mi cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Guardar nueva contraseña'} onPress={() => void submit()} />
    {busy && <ActivityIndicator color={c.green} accessibilityLabel="Solicitud en curso" />}
    {pendingConfirmation && <Action disabled={disabled} secondary title="Reenviar confirmación" onPress={() => void run(async () => { await controller.resendConfirmation(email); setInfo('Si el registro está pendiente de confirmación, recibirás un nuevo enlace en tu correo.'); })} />}
    {mode === 'login' && <Pressable accessibilityRole="button" disabled={busy} style={s.linkButton} onPress={() => change('forgot')}><Text style={s.link}>Olvidé mi contraseña</Text></Pressable>}
    {mode !== 'recovery' && <Action secondary disabled={busy} title={mode === 'login' ? 'Crear una cuenta con correo' : 'Ya tengo cuenta · Iniciar sesión'} onPress={() => change(mode === 'login' ? 'register' : 'login')} />}
    {mode !== 'recovery' && onBack && <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={s.linkButton}><Text style={s.link}>Volver al piloto</Text></Pressable>}
    <Text style={s.small}>Las capturas y el texto del OCR se procesan en el dispositivo. Tu contraseña la administra Supabase Auth; no se guarda en el historial.</Text>
  </View>;
}
const s = StyleSheet.create({
  stack: { gap: 18 }, symbol: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.wash, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontSize: 10, letterSpacing: 1.7, fontWeight: '700', color: c.green }, title: { fontSize: 33, lineHeight: 38, fontWeight: '800', letterSpacing: -1, color: c.ink }, body: { fontSize: 15, lineHeight: 23, color: c.muted }, small: { fontSize: 12, lineHeight: 19, color: c.muted }, notice: { backgroundColor: c.wash, padding: 16, borderRadius: 12, gap: 6 }, noticeTitle: { color: c.green, fontSize: 15, fontWeight: '700' }, noticeText: { color: c.green, fontSize: 13, lineHeight: 20 }, field: { gap: 8 }, label: { color: c.ink, fontSize: 13, fontWeight: '600' }, inputRow: { flexDirection: 'row', backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 12, alignItems: 'center', minHeight: 54 }, input: { flex: 1, minWidth: 0, padding: 15, color: c.ink, fontSize: 16 }, eye: { padding: 15 }, button: { backgroundColor: c.green, padding: 16, borderRadius: 12, minHeight: 52, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 12 }, buttonText: { color: c.white, fontSize: 15, fontWeight: '700' }, secondary: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line }, secondaryText: { color: c.ink }, disabled: { opacity: .45 }, separator: { flexDirection: 'row', gap: 12, alignItems: 'center' }, line: { flex: 1, height: 1, backgroundColor: c.line }, linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, link: { fontSize: 14, color: c.green, fontWeight: '600' }, error: { color: c.danger, fontSize: 14, lineHeight: 21 },
});
