import { getServiceSupabaseClient } from './supabaseClient';

interface UsageEvent {
  userIdentifier: string;
  feature: string;
  provider?: string | null;
  model?: string | null;
  priorityMode?: string | null;
  metadata?: Record<string, any>;
}

export async function recordUsage(event: UsageEvent): Promise<void> {
  const client = getServiceSupabaseClient();
  if (!client) {
    console.warn('[UsageTracker] Supabase client unavailable; skipping usage log');
    return;
  }

  if (!event.userIdentifier) {
    console.warn('[UsageTracker] Missing user identifier; skipping usage log');
    return;
  }

  try {
    console.debug('[UsageTracker] Recording usage event', {
      userIdentifier: event.userIdentifier,
      feature: event.feature,
      provider: event.provider,
      model: event.model,
    });
    const { error } = await client.from('usage_events').insert({
      user_identifier: event.userIdentifier,
      feature: event.feature,
      provider: event.provider ?? null,
      model: event.model ?? null,
      priority_mode: event.priorityMode ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.warn('[UsageTracker] Supabase insert returned error', error);
    } else {
      console.debug('[UsageTracker] Usage event recorded');
    }
  } catch (error) {
    console.warn('[UsageTracker] Failed to record usage event', error);
  }
}

export interface UsageRow {
  user_identifier: string;
  feature: string;
  provider: string | null;
  model: string | null;
  priority_mode: string | null;
  happened_at: string;
}

export async function fetchUsageRows(limit = 2000, userIdentifier?: string): Promise<UsageRow[]> {
  const client = getServiceSupabaseClient();
  if (!client) {
    return [];
  }

  const query = client
    .from('usage_events')
    .select('user_identifier, feature, provider, model, priority_mode, happened_at')
    .order('happened_at', { ascending: false })
    .limit(limit);

  if (userIdentifier) {
    query.eq('user_identifier', userIdentifier);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[UsageTracker] Failed to fetch usage rows', error);
    return [];
  }

  return data ?? [];
}

const usageTracker = {
  recordUsage,
  fetchUsageRows,
};

export default usageTracker;
