import { NextRequest, NextResponse } from 'next/server';
import { getAllProviderModels, getProviderModels } from '@/lib/server/providerModels';
import { LLMProvider } from '@/lib/types/providers';

export async function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get('provider') as LLMProvider | null;

  if (providerParam) {
    const models = await getProviderModels(providerParam);
    return NextResponse.json({ models });
  }

  const models = await getAllProviderModels();
  return NextResponse.json({ models });
}
