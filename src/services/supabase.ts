import 'react-native-url-polyfill/auto';
import './nativeAuthCrypto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSecureSessionStorage } from './secureSessionStorage';
import { publicSupabaseConfigurationError } from '../domain/auth';
import { googleProviderAvailable } from './authProviders';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
// Both current publishable keys and legacy anon keys are public client credentials.
const key = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)?.trim();
const configurationError = publicSupabaseConfigurationError(url, key);
export const supabaseConfigurationError = configurationError;
const nativeStorage = createSecureSessionStorage(SecureStore);
const storage = Platform.OS === 'web' ? {
  async getItem(name: string) { return typeof localStorage === 'undefined' ? null : localStorage.getItem(name); },
  async setItem(name: string, value: string) { localStorage.setItem(name, value); },
  async removeItem(name: string) { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); },
} : nativeStorage;
// Never use service_role here. EXPO_PUBLIC values are bundled with the public app.
export const supabase = url && key && !configurationError ? createClient(url, key, {
  auth: { storage, lock: processLock, flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

export async function assertGoogleProviderAvailable() {
  if (!supabase || !url || !key) throw new Error('Conecta Supabase para activar las cuentas.');
  if (!await googleProviderAvailable(url, key)) throw new Error('El acceso con Google todavía no está habilitado. Puedes crear tu cuenta o entrar con correo y contraseña.');
}
