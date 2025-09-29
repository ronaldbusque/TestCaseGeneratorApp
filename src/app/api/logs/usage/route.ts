import { NextRequest, NextResponse } from 'next/server';
import { fetchUsageRows } from '@/lib/server/usageTracker';

const USER_ID_HEADER = 'X-User-Identifier';
const ADMIN_IDENTIFIER = '__admin__';

interface UsageSummary {
  userIdentifier: string;
  totalInteractions: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  providers: Record<string, number>;
  models: Record<string, number>;
  lastInteraction: string | null;
}

function buildSummary(rows: Awaited<ReturnType<typeof fetchUsageRows>>): UsageSummary[] {
  const summaries = new Map<string, UsageSummary>();

  for (const row of rows) {
    const user = row.user_identifier || 'unknown';
    if (!summaries.has(user)) {
      summaries.set(user, {
        userIdentifier: user,
        totalInteractions: 0,
        byType: {},
        byPriority: {},
        providers: {},
        models: {},
        lastInteraction: null,
      });
    }

    const summary = summaries.get(user)!;
    summary.totalInteractions += 1;

    if (row.provider) {
      summary.providers[row.provider] = (summary.providers[row.provider] ?? 0) + 1;
    }

    if (row.model) {
      summary.models[row.model] = (summary.models[row.model] ?? 0) + 1;
    }

    summary.byType[row.feature] = (summary.byType[row.feature] ?? 0) + 1;
    const priority = row.priority_mode ?? 'unspecified';
    summary.byPriority[priority] = (summary.byPriority[priority] ?? 0) + 1;

    if (!summary.lastInteraction || row.happened_at > summary.lastInteraction) {
      summary.lastInteraction = row.happened_at;
    }
  }

  return Array.from(summaries.values()).sort((a, b) => b.totalInteractions - a.totalInteractions);
}

export async function GET(request: NextRequest) {
  const requesterId = request.headers.get(USER_ID_HEADER);
  if (requesterId !== ADMIN_IDENTIFIER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetUser = request.nextUrl.searchParams.get('user') ?? undefined;
  const rows = await fetchUsageRows(2000, targetUser);
  if (targetUser) {
    const summaries = buildSummary(rows);
    return NextResponse.json({ summary: summaries[0] ?? null });
  }
  const users = buildSummary(rows);
  return NextResponse.json({ users });
}
