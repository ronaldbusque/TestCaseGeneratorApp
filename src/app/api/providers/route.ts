import { NextRequest, NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/server/providerRegistry';
import { getProviderModels, getProviderStatus } from '@/lib/server/providerModels';

const USER_ID_HEADER = 'X-User-Identifier';

export async function GET(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  const providers = getAvailableProviders();

  const enriched = await Promise.all(
    providers.map(async (provider) => {
      const [models, status] = await Promise.all([
        getProviderModels(provider.id).catch(() => []),
        getProviderStatus(provider.id).catch(() => null),
      ]);

      return {
        ...provider,
        models,
        status,
      };
    })
  );

  return NextResponse.json({ providers: enriched });
}
