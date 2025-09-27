import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/server/providerRegistry';
import { getProviderModels, getProviderStatus } from '@/lib/server/providerModels';

export async function GET() {
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
