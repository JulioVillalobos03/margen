/** SecureStore values stay below 2 KB, including long Google identity metadata. */
export type SecretStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
type Index = { generation: string; count: number };
function readIndex(value: string | null): Index | null {
  if (!value) return null;
  const [generation, count] = value.split(':');
  const size = Number(count);
  if (!/^[a-z0-9-]+$/.test(generation) || !Number.isInteger(size) || size < 1 || size > 1000) throw new Error('La sesión guardada necesita revisión. Vuelve a iniciar sesión.');
  return { generation, count: size };
}
export function createSecureSessionStorage(store: SecretStore) {
  const indexKey = (name: string) => `${name}.index`;
  const partKey = (name: string, index: Index, part: number) => `${name}.${index.generation}.${part}`;
  async function cleanup(name: string, index: Index | null) {
    if (index) for (let i = 0; i < index.count; i++) await store.deleteItemAsync(partKey(name, index, i));
  }
  return {
    async getItem(name: string) {
      const index = readIndex(await store.getItemAsync(indexKey(name)));
      if (!index) return store.getItemAsync(name); // Migrate a previous unsegmented pilot session.
      let value = '';
      for (let i = 0; i < index.count; i++) {
        const part = await store.getItemAsync(partKey(name, index, i));
        if (part === null) throw new Error('La sesión guardada está incompleta. Vuelve a iniciar sesión.');
        value += part;
      }
      return value;
    },
    async setItem(name: string, value: string) {
      const previous = readIndex(await store.getItemAsync(indexKey(name)));
      const characters = Array.from(value);
      const index = { generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: Math.max(1, Math.ceil(characters.length / 450)) };
      let written = 0;
      try {
        for (let i = 0; i < index.count; i++) {
          await store.setItemAsync(partKey(name, index, i), characters.slice(i * 450, (i + 1) * 450).join(''));
          written++;
        }
        // Publish only after every segment exists. Interrupted writes leave the old value readable.
        await store.setItemAsync(indexKey(name), `${index.generation}:${index.count}`);
      } catch (error) {
        await cleanup(name, { ...index, count: written }).catch(() => {});
        throw error;
      }
      await cleanup(name, previous).catch(() => {});
      await store.deleteItemAsync(name).catch(() => {});
    },
    async removeItem(name: string) {
      const index = readIndex(await store.getItemAsync(indexKey(name)));
      await store.deleteItemAsync(indexKey(name));
      await store.deleteItemAsync(name);
      await cleanup(name, index);
    },
  };
}
