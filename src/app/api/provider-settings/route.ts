import { NextRequest, NextResponse } from 'next/server';
import { loadProviderSettings, saveProviderSettings } from '@/lib/server/providerSettingsStore';
import { getAvailableProviders } from '@/lib/server/providerRegistry';
import {
  DEFAULT_SETTINGS,
  coerceStoredSettings,
  ensureSettingsFallback,
} from '@/lib/providerSettings';

const USER_ID_HEADER = 'X-User-Identifier';

export async function GET(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  const providers = getAvailableProviders();
  try {
    const stored = await loadProviderSettings(userId);
    const base = stored ? coerceStoredSettings(stored) : DEFAULT_SETTINGS;
    const settings = ensureSettingsFallback(base, providers);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to load provider settings', error);
    return NextResponse.json({ error: 'Failed to load provider settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const providers = getAvailableProviders();
    const normalized = ensureSettingsFallback(coerceStoredSettings(body), providers);
    await saveProviderSettings(userId, normalized);
    return NextResponse.json({ success: true, settings: normalized });
  } catch (error) {
    console.error('Failed to save provider settings', error);
    return NextResponse.json({ error: 'Failed to save provider settings' }, { status: 500 });
  }
}
