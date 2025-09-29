import { promises as fs } from 'fs';
import path from 'path';
import { ProviderSettings } from '@/lib/types/providers';

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(STORE_DIR, 'provider-settings.json');
const GLOBAL_KEY = '__global__';

interface ProviderSettingsStore {
  [userId: string]: ProviderSettings;
}

async function readStore(): Promise<ProviderSettingsStore> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf8');
    try {
      const parsed = JSON.parse(data) as ProviderSettingsStore;
      if (!parsed[GLOBAL_KEY] && parsed['__admin__']) {
        parsed[GLOBAL_KEY] = parsed['__admin__'];
      }
      return parsed;
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        const backupPath = `${STORE_PATH}.corrupt-${Date.now()}`;
        try {
          await fs.rename(STORE_PATH, backupPath);
        } catch (renameError) {
          console.warn('[providerSettingsStore] Failed to quarantine corrupt store file', renameError);
        }
        console.warn('[providerSettingsStore] Detected corrupt provider settings store. Creating fresh store.', parseError);
        return {};
      }
      throw parseError;
    }
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeStore(store: ProviderSettingsStore): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function loadProviderSettings(userId: string): Promise<ProviderSettings | null> {
  const store = await readStore();
  const globalSettings = store[GLOBAL_KEY];

  if (userId === '__admin__') {
    return store[userId] ?? globalSettings ?? null;
  }

  if (globalSettings) {
    return globalSettings;
  }

  return store[userId] ?? null;
}

export async function saveProviderSettings(userId: string, settings: ProviderSettings): Promise<void> {
  const store = await readStore();
  if (userId === '__admin__') {
    store[GLOBAL_KEY] = settings;
    store[userId] = settings;
  } else {
    store[userId] = settings;
  }
  await writeStore(store);
}

export async function deleteProviderSettings(userId: string): Promise<void> {
  const store = await readStore();
  let changed = false;
  if (store[userId]) {
    delete store[userId];
    changed = true;
  }
  if (userId === '__admin__' && store[GLOBAL_KEY]) {
    delete store[GLOBAL_KEY];
    changed = true;
  }
  if (changed) {
    await writeStore(store);
  }
}
