import { O1MiniService } from '../../ai/o1mini';
import { TestCaseGenerationRequest } from '@/lib/types';

describe('O1MiniService', () => {
  let service: O1MiniService;
  const mockFetch = jest.fn();

  beforeEach(() => {
    service = new O1MiniService();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('generates test cases successfully', async () => {
    const mockResponse = {
      testCases: [
        {
          title: 'Test Case 1',
          description: 'Description 1',
          steps: ['Step 1'],
          expectedResult: 'Result 1',
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const request: TestCaseGenerationRequest = {
      model: 'O1-Mini',
      requirements: 'Test requirements'
    };

    const response = await service.generateTestCases(request);

    expect(response.testCases).toHaveLength(1);
    expect(response.testCases[0].title).toBe('Test Case 1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': expect.stringMatching(/^Bearer .+$/)
        })
      })
    );
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const request: TestCaseGenerationRequest = {
      model: 'O1-Mini',
      requirements: 'Test requirements'
    };

    const response = await service.generateTestCases(request);

    expect(response.testCases).toHaveLength(0);
    expect(response.error).toBe('Failed to generate test cases. Please try again.');
  });
}); 