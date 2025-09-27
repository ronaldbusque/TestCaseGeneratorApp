import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/server/providerRegistry';

export async function GET() {
  const providers = getAvailableProviders();
  return NextResponse.json({ providers });
}
