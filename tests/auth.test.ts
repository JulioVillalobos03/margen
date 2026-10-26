import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, normalizeEmail, parseAuthCallback, publicSupabaseConfigurationError, validateNewPassword } from '../src/domain/auth.ts';
import { googleProviderAvailable } from '../src/services/authProviders.ts';
import { createSecureSessionStorage } from '../src/services/secureSessionStorage.ts';

test('solo intercambia códigos de las rutas autorizadas, nunca tokens ni otros orígenes', () => {
  assert.deepEqual(parseAuthCallback('margen://auth/callback?code=once&sb_flow_id=abc'), { code: 'once', flowId: 'abc' });
  assert.deepEqual(parseAuthCallback('https://margen.example/auth/callback?code=once', 'https://margen.example'), { code: 'once' });
  for (const value of ['margen://other/callback?code=once', 'margen://auth:1234/callback?code=once', 'margen://evil@auth/callback?code=once', 'margen://auth/else?code=once', 'https://other.example/auth/callback?code=once', 'https://margen.example/else?code=once', 'margen://auth/callback#access_token=unexpected&refresh_token=unexpected', 'margen://auth/callback?code=one&code=two', 'invalid']) assert.equal(parseAuthCallback(value, 'https://margen.example'), null);
  assert.deepEqual(parseAuthCallback('margen://auth/callback?error=access_denied&error_description=private-data'), { error: 'access_denied' });
});
test('valida correo y contraseña sin cambiar los espacios intencionales del secreto', () => {
  assert.equal(normalizeEmail('  Conductor@Example.com '), 'conductor@example.com');
  assert.throws(() => normalizeEmail('mal correo@example.com'));
  assert.throws(() => validateNewPassword('1234567'));
  assert.equal(validateNewPassword('  clave válida  '), '  clave válida  ');
  assert.equal(authErrorMessage({ code: 'invalid_credentials', message: 'secret server detail' }), 'El correo o la contraseña no coinciden. Revisa tus datos.');
  assert.ok(!authErrorMessage({ code: 'unknown', message: 'private token' }).includes('private token'));
});
function storageHarness() {
  const values = new Map<string, string>();
  let failAfter: number | undefined;
  let count = 0;
  const store = createSecureSessionStorage({
    async getItemAsync(key) { return values.get(key) ?? null; },
    async setItemAsync(key, value) {
      if (failAfter !== undefined && count++ >= failAfter) throw new Error('storage full');
      assert.ok(Buffer.byteLength(value, 'utf8') < 2048);
      values.set(key, value);
    },
    async deleteItemAsync(key) { values.delete(key); },
  });
  return { values, store, failWritesAfter(n: number) { failAfter = n; count = 0; } };
}
test('segmenta sesiones grandes en SecureStore y preserva Unicode completo', async () => {
  const { values, store } = storageHarness();
  const session = JSON.stringify({ access_token: 'a'.repeat(5000), user: { avatar: 'x'.repeat(9000), name: '🚕'.repeat(1000) } });
  await store.setItem('auth-token', session);
  assert.equal(await store.getItem('auth-token'), session);
  assert.ok(values.size > 2);
  await store.setItem('auth-token', 'replacement');
  assert.equal(await store.getItem('auth-token'), 'replacement');
  assert.equal(values.size, 2); // Only the new segment and its pointer remain.
  await store.removeItem('auth-token');
  assert.equal(values.size, 0);
  assert.equal(await store.getItem('auth-token'), null);
});
test('una escritura interrumpida no destruye la sesión anterior', async () => {
  const harness = storageHarness();
  await harness.store.setItem('auth-token', 'previous session');
  harness.failWritesAfter(1);
  await assert.rejects(harness.store.setItem('auth-token', 'new'.repeat(2000)), /storage full/);
  assert.equal(await harness.store.getItem('auth-token'), 'previous session');
});
test('migra el token sin segmentar y detecta segmentos incompletos', async () => {
  const { values, store } = storageHarness();
  values.set('auth-token', 'legacy');
  assert.equal(await store.getItem('auth-token'), 'legacy');
  await store.setItem('auth-token', 'new');
  assert.equal(values.has('auth-token'), false);
  const segment = [...values.keys()].find(key => key !== 'auth-token.index')!;
  values.delete(segment);
  await assert.rejects(store.getItem('auth-token'), /incompleta/);
});

test('solo configura credenciales públicas, nunca service_role ni secret keys', () => {
  const jwt = (role: string) => `ey.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(publicSupabaseConfigurationError('https://project.supabase.co', 'sb_publishable_public'), '');
  assert.equal(publicSupabaseConfigurationError('https://project.supabase.co', jwt('anon')), '');
  assert.ok(publicSupabaseConfigurationError('https://project.supabase.co', jwt('service_role')));
  assert.ok(publicSupabaseConfigurationError('https://project.supabase.co', 'sb_secret_no'));
  assert.ok(publicSupabaseConfigurationError('invalid', 'sb_publishable_public'));
  assert.ok(publicSupabaseConfigurationError('https://project.supabase.co'));
  assert.equal(publicSupabaseConfigurationError(), '');
});

test('Google deshabilitado se informa antes de abrir un navegador sin salida', async () => {
  let requested = '';
  const fakeFetch: typeof fetch = async (input, init) => {
    requested = String(input);
    assert.deepEqual(init?.headers, { apikey: 'public-test-key' });
    return new Response(JSON.stringify({ external: { email: true, google: false } }), { status: 200 });
  };
  assert.equal(await googleProviderAvailable('https://project.example/', 'public-test-key', fakeFetch), false);
  assert.equal(requested, 'https://project.example/auth/v1/settings');
  assert.equal(await googleProviderAvailable('https://project.example', 'public-test-key', async () => new Response(JSON.stringify({ external: { google: true } }))), true);
  await assert.rejects(googleProviderAvailable('https://project.example', 'public-test-key', async () => new Response('{}', { status: 200 })), /No se pudo comprobar/);
  await assert.rejects(googleProviderAvailable('https://project.example', 'public-test-key', async () => new Response('private-server-detail', { status: 500 })), /No se pudo comprobar/);
  await assert.rejects(googleProviderAvailable('https://project.example', 'public-test-key', async () => new Response('private-server-detail', { status: 200 })), /No se pudo comprobar/);
});
