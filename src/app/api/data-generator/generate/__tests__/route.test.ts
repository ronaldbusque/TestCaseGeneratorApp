/** @jest-environment node */

import { POST } from '../route';
import type { NextRequest } from 'next/server';

jest.mock('@/lib/services/ai/factory', () => ({
  createAIService: jest.fn(() => ({
    generateTestCases: jest.fn(),
    generateContent: jest.fn(),
  })),
}));

jest.mock('@/lib/server/usageTracker', () => ({
  __esModule: true,
  default: {
    recordUsage: jest.fn(),
  },
}));

describe('POST /api/data-generator/generate', () => {
  const buildRequest = (payload: unknown, headers?: Record<string, string>) => {
    const headerEntries = new Headers(headers);

    const requestLike: Partial<NextRequest> = {
      json: async () => payload,
      headers: headerEntries as unknown as NextRequest['headers'],
    };

    return requestLike as NextRequest;
  };

  it('returns 400 when fields are missing', async () => {
    const request = buildRequest({ count: 10 });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe('Missing required field: fields');
  });

  it('returns generated data when fields are valid', async () => {
    const request = buildRequest({
      fields: [
        {
          name: 'id',
          type: 'Number',
          options: { min: 1, max: 5 },
        },
      ],
      count: 3,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(3);
    expect(json.error).toBeUndefined();
  });

  it('generates deterministic data when seed provided', async () => {
    const payload = {
      fields: [
        {
          name: 'id',
          type: 'Number',
          options: { min: 1, max: 5 },
        },
      ],
      count: 3,
      seed: 'deterministic-seed',
    };

    const firstResponse = await POST(buildRequest(payload));
    const secondResponse = await POST(buildRequest(payload));

    const firstJson = await firstResponse.json();
    const secondJson = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstJson.data).toEqual(secondJson.data);
  });
});
