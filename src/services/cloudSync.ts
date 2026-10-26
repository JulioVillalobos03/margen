import type { Settings } from '../domain/model';
import type { AppData } from '../domain/model';
import { synchronizeAccount } from '../domain/syncAccount';
import type { SyncOptions, SyncTransport } from '../domain/syncAccount';
import { supabase } from './supabase';

export async function syncAccountData(userId: string, localData: AppData, options: SyncOptions) {
  const client = supabase;
  if (!client) throw new Error('Falta conectar el proyecto de Supabase antes de respaldar.');
  const assertOwner = async () => {
    // getUser validates against Auth; local persisted session metadata alone is insufficient.
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== userId) throw new Error('La sesión expiró o cambió. Vuelve a iniciar sesión.');
    return data.user.id;
  };
  const transport: SyncTransport = {
    ownerId: assertOwner,
    async listRecords(owner) {
      const rows: unknown[] = [];
      const pageSize = 500;
      for (let start = 0; ; start += pageSize) {
        await assertOwner();
        const { data, error } = await client.from('offer_evaluations')
          .select('id,user_id,created_at,source,offer,settings_snapshot,result,calculation_version,extraction')
          .eq('user_id', owner).order('created_at', { ascending: false }).order('id', { ascending: true }).range(start, start + pageSize - 1);
        if (error) throw new Error(`No se pudo consultar el historial: ${error.message}`);
        rows.push(...(data ?? []));
        if (!data || data.length < pageSize) return rows;
      }
    },
    async insertRecords(owner, records) {
      for (let index = 0; index < records.length; index += 200) {
        await assertOwner();
        // ON CONFLICT DO NOTHING: evaluations have INSERT/SELECT permissions, never UPDATE.
        const { error } = await client.from('offer_evaluations').upsert(records.slice(index, index + 200), { onConflict: 'id', ignoreDuplicates: true });
        if (error) throw new Error(`No se pudo respaldar el historial: ${error.message}`);
      }
    },
    async readSettings(owner) {
      const { data, error } = await client.from('profiles').select('settings').eq('user_id', owner).maybeSingle();
      if (error) throw new Error(`No se pudo consultar la configuración: ${error.message}`);
      // Older prepared profiles used an empty object before account sync existed.
      return data?.settings && Object.keys(data.settings).length ? data.settings : null;
    },
    async writeSettings(owner: string, settings: Settings) {
      const { error } = await client.from('profiles').upsert({ user_id: owner, settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw new Error(`No se pudo respaldar la configuración: ${error.message}`);
    },
  };
  return synchronizeAccount(userId, localData, transport, options);
}
