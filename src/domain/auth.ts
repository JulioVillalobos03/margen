export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Escribe un correo válido.');
  return email;
}
export function validateNewPassword(value: string) {
  if (value.length < 8) throw new Error('Usa una contraseña de al menos 8 caracteres.');
  return value; // Spaces can be intentional; never silently trim a password.
}
export type AuthCallback = { code: string; flowId?: string } | { error: string };
/** Only our callback receives codes. Token fragments are intentionally unsupported (PKCE). */
export function parseAuthCallback(value: string, webOrigin?: string): AuthCallback | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const native = url.protocol === 'margen:' && url.hostname === 'auth' && !url.port && url.pathname === '/callback';
  const web = !!webOrigin && url.origin === webOrigin && url.pathname === '/auth/callback';
  if ((!native && !web) || url.username || url.password) return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_code')) return { error: url.searchParams.get('error_code') || url.searchParams.get('error') || 'callback_error' };
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048) return null;
  const flowId = url.searchParams.get('sb_flow_id') || undefined;
  return { code: codes[0], ...(flowId ? { flowId } : {}) };
}
export function authErrorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'invalid_credentials': return 'El correo o la contraseña no coinciden. Revisa tus datos.';
    case 'email_not_confirmed': return 'Confirma tu correo antes de entrar. Revisa también la carpeta de spam.';
    case 'user_already_exists': case 'email_exists': return 'No se pudo crear la cuenta. Si ya te registraste, inicia sesión o recupera tu contraseña.';
    case 'weak_password': return 'La contraseña no cumple los requisitos de seguridad del servidor. Usa una contraseña más larga y variada.';
    case 'same_password': return 'Elige una contraseña diferente a la anterior.';
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return 'Se enviaron demasiadas solicitudes. Espera unos minutos y vuelve a intentar.';
    case 'provider_disabled': case 'oauth_provider_not_supported': case 'validation_failed': return 'El proveedor de acceso todavía no está disponible. Revisa la configuración de Supabase.';
    case 'bad_code_verifier': case 'flow_state_expired': case 'flow_state_not_found': case 'pkce_code_verifier_not_found': return 'Este enlace venció o se abrió en otro dispositivo. Inicia el proceso otra vez desde esta app.';
    case 'otp_expired': return 'El enlace venció. Solicita uno nuevo desde esta app.';
    case 'access_denied': return 'Se canceló el acceso. Puedes volver a intentarlo cuando quieras.';
  }
  if (error instanceof TypeError || (error instanceof Error && /network|fetch|connection/i.test(error.message))) return 'No se pudo conectar. Revisa tu conexión y vuelve a intentar.';
  // Keep our validation messages; do not expose provider details or callback parameters.
  if (error instanceof Error && !('status' in error) && !('code' in error)) return error.message;
  return 'No se pudo completar el acceso. Vuelve a intentar o recupera tu contraseña.';
}

export function publicSupabaseConfigurationError(url?: string, key?: string) {
  if (!url && !key) return '';
  if (!url || !key) return 'Falta la URL o la clave pública de Supabase.';
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.host || parsed.username || parsed.password) throw new Error();
    if (key.startsWith('sb_secret_')) throw new Error();
    if (key.split('.').length === 3) {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
      if (claims.role !== 'anon') throw new Error();
    } else if (!key.startsWith('sb_publishable_')) throw new Error();
    return '';
  } catch { return 'La configuración pública de Supabase no es válida. Usa la URL y la clave publishable o anon; nunca una clave secreta ni service_role.'; }
}
