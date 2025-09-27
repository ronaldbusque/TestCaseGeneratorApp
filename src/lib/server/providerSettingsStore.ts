import { promises as fs } from 'fs';
import path from 'path';
import { ProviderSettings } from '@/lib/types/providers';

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(STORE_DIR, 'provider-settings.json');

interface ProviderSettingsStore {
  [userId: string]: ProviderSettings;
}

async function readStore(): Promise<ProviderSettingsStore> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf8');
    return JSON.parse(data) as ProviderSettingsStore;
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
  return store[userId] ?? null;
}

export async function saveProviderSettings(userId: string, settings: ProviderSettings): Promise<void> {
  const store = await readStore();
  store[userId] = settings;
  await writeStore(store);
}

export async function deleteProviderSettings(userId: string): Promise<void> {
  const store = await readStore();
  if (store[userId]) {
    delete store[userId];
    await writeStore(store);
  }
}
