/** Public Auth capabilities; check on demand before sending someone to the browser. */
export async function googleProviderAvailable(url: string, publicKey: string, request: typeof fetch = fetch) {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await request(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: publicKey }, signal: abort.signal });
    if (!response.ok) throw new Error('No se pudo comprobar el acceso con Google. Intenta otra vez o usa tu correo.');
    let settings: unknown;
    try { settings = await response.json(); }
    catch { throw new Error('No se pudo comprobar el acceso con Google. Intenta otra vez o usa tu correo.'); }
    const enabled = settings && typeof settings === 'object' && 'external' in settings && settings.external && typeof settings.external === 'object' && 'google' in settings.external ? settings.external.google : undefined;
    if (typeof enabled !== 'boolean') throw new Error('No se pudo comprobar el acceso con Google. Intenta otra vez o usa tu correo.');
    return enabled;
  } catch (error) {
    if (abort.signal.aborted) throw new Error('La comprobación de Google tardó demasiado. Revisa tu conexión o usa tu correo.');
    throw error;
  } finally { clearTimeout(timeout); }
}
