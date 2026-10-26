import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authErrorMessage, normalizeEmail, parseAuthCallback, validateNewPassword } from '../domain/auth';
import { assertGoogleProviderAvailable, supabase, supabaseConfigurationError } from './supabase';

const webOrigin = () => Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
export function authRedirectUrl(recovery = false) {
  const base = Platform.OS === 'web' ? `${webOrigin()}/auth/callback` : 'margen://auth/callback';
  return recovery ? `${base}?intent=recovery` : base;
}
const callbackRequests = new Map<string, Promise<boolean>>();
/** Dedupe browser + Linking delivery: a PKCE authorization code can be consumed only once. */
export async function handleAuthCallback(url: string): Promise<boolean> {
  const callback = parseAuthCallback(url, webOrigin());
  if (!callback) return false;
  if ('error' in callback) throw Object.assign(new Error('No se pudo completar el acceso.'), { code: callback.error });
  if (!supabase) throw new Error(supabaseConfigurationError || 'Conecta Supabase para activar las cuentas.');
  const existing = callbackRequests.get(callback.code);
  if (existing) return existing;
  const request = (async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(callback.code, callback.flowId ? { flowId: callback.flowId } : undefined);
    if (error) throw error;
    return true;
  })();
  if (callbackRequests.size > 20) callbackRequests.clear();
  callbackRequests.set(callback.code, request);
  return request;
}
function requireClient() {
  if (!supabase) throw new Error(supabaseConfigurationError || 'Las cuentas todavía no están conectadas. Puedes continuar usando el piloto local.');
  return supabase;
}

/** Mount once at the app root. Session refresh updates identity without issuing navigation. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState(supabaseConfigurationError);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const activeOperation = useRef(false);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let mounted = true;
    let changed = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      changed = true;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      else if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    const receiveUrl = async (url: string) => {
      try { await handleAuthCallback(url); }
      catch (e) { if (mounted) setError(authErrorMessage(e)); }
    };
    const links = Linking.addEventListener('url', ({ url }) => { void receiveUrl(url); });
    void (async () => {
      try {
        const url = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : await Linking.getInitialURL();
        if (url) await receiveUrl(url);
        const { data, error: restoreError } = await client.auth.getSession();
        if (restoreError) throw restoreError;
        if (mounted && !changed) setSession(data.session);
      } catch (e) { if (mounted) setError(authErrorMessage(e)); }
      finally { if (mounted) setLoading(false); }
    })();
    const refresh = (state: string) => state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh();
    let appState: ReturnType<typeof AppState.addEventListener> | undefined;
    if (Platform.OS !== 'web') {
      refresh(AppState.currentState);
      appState = AppState.addEventListener('change', refresh);
    }
    return () => { mounted = false; subscription.unsubscribe(); links.remove(); appState?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);
  const perform = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    if (activeOperation.current) throw new Error('Espera a que termine la solicitud actual.');
    activeOperation.current = true; setError('');
    try { return await action(); }
    catch (e) { const message = authErrorMessage(e); setError(message); throw new Error(message); }
    finally { activeOperation.current = false; }
  }, []);
  const signIn = useCallback((email: string, password: string) => perform(async () => {
    if (!password) throw new Error('Escribe tu contraseña.');
    const { error } = await requireClient().auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) throw error;
  }), [perform]);
  const signUp = useCallback((email: string, password: string, displayName = '') => perform(async (): Promise<'session' | 'confirmation'> => {
    const { data, error } = await requireClient().auth.signUp({ email: normalizeEmail(email), password: validateNewPassword(password), options: { emailRedirectTo: authRedirectUrl(), data: { display_name: displayName.trim().slice(0, 80) } } });
    if (error) throw error;
    return data.session ? 'session' : 'confirmation';
  }), [perform]);
  const signInGoogle = useCallback(() => perform(async () => {
    await assertGoogleProviderAvailable();
    const redirectTo = authRedirectUrl();
    const { data, error } = await requireClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
    if (error) throw error;
    if (!data.url) throw new Error('No se recibió el enlace de acceso. Intenta otra vez.');
    // A full-page redirect on web avoids popup blockers and retains the PKCE verifier in localStorage.
    if (Platform.OS === 'web') { window.location.assign(data.url); return true; }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return false;
    return handleAuthCallback(result.url);
  }), [perform]);
  const sendPasswordReset = useCallback((email: string) => perform(async () => {
    const { error } = await requireClient().auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: authRedirectUrl(true) });
    if (error) throw error;
  }), [perform]);
  const resendConfirmation = useCallback((email: string) => perform(async () => {
    const { error } = await requireClient().auth.resend({ type: 'signup', email: normalizeEmail(email), options: { emailRedirectTo: authRedirectUrl() } });
    if (error) throw error;
  }), [perform]);
  const updatePassword = useCallback((password: string) => perform(async () => {
    const { error } = await requireClient().auth.updateUser({ password: validateNewPassword(password) });
    if (error) throw error;
    setPasswordRecovery(false);
  }), [perform]);
  const signOut = useCallback(() => perform(async () => {
    const { error } = await requireClient().auth.signOut({ scope: 'local' });
    if (error) throw error;
    setPasswordRecovery(false);
  }), [perform]);
  const clearError = useCallback(() => setError(''), []);
  return { configured: !!supabase, loading, session, user: session?.user ?? null, passwordRecovery, error, clearError, signIn, signUp, signInGoogle, sendPasswordReset, resendConfirmation, updatePassword, signOut };
}
export type AuthController = ReturnType<typeof useAuth>;
