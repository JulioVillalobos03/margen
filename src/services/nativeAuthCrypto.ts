import { Platform } from 'react-native';
import * as ExpoCrypto from 'expo-crypto';

// Hermes does not expose WebCrypto. Supabase otherwise falls back to Math.random
// and a plain PKCE challenge. Supply only its native random + SHA-256 primitives.
// This is deliberately not a general WebCrypto implementation; app auth uses
// server verification (getUser), not local JWT signature verification/getClaims.
if (Platform.OS !== 'web') {
  type Primitives = { getRandomValues?: typeof ExpoCrypto.getRandomValues; randomUUID?: typeof ExpoCrypto.randomUUID; subtle?: { digest?: (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer> } };
  const scope = globalThis as unknown as { crypto?: Primitives };
  if (!scope.crypto) Object.defineProperty(scope, 'crypto', { value: {}, configurable: true, writable: true });
  const crypto = scope.crypto!;
  if (!crypto.getRandomValues) crypto.getRandomValues = ExpoCrypto.getRandomValues;
  if (!crypto.randomUUID) crypto.randomUUID = ExpoCrypto.randomUUID;
  if (!crypto.subtle) crypto.subtle = {};
  if (!crypto.subtle.digest) crypto.subtle.digest = async (algorithm, data) => {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256') throw new Error('Algoritmo de autenticación no soportado.');
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  };
}
