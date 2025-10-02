import { act, renderHook } from '@testing-library/react';

import { useDataGeneration } from '@/lib/hooks/data-generator/useDataGeneration';
import type { ExportConfig } from '@/lib/data-generator/types';

jest.mock('@/lib/utils/apiClient', () => ({
  fetchApi: jest.fn(),
}));

const { fetchApi } = jest.requireMock('@/lib/utils/apiClient') as {
  fetchApi: jest.Mock;
};

const defaultExportConfig: ExportConfig = {
  rowCount: 50,
  format: 'JSON' as const,
  lineEnding: 'Unix (LF)' as const,
  includeHeader: true,
  includeBOM: false,
  applyAIEnhancement: true,
  enhancementPrompt: 'Improve summaries',
  useDeterministicSeed: false,
  seedValue: '',
};

const successValidation = () => ({ ok: true });

describe('useDataGeneration – AI sample preview', () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it('generates an AI sample row and updates state', async () => {
    const toast = jest.fn();
    const mapFieldsToApi = jest.fn(() => [
      { name: 'aiSummary', type: 'AI-Generated', options: {} },
    ]);

    fetchApi.mockResolvedValueOnce({ data: [{ aiSummary: 'Enhanced value' }] });

    const { result } = renderHook(() =>
      useDataGeneration({
        exportConfig: defaultExportConfig,
        hasAIGeneratedFields: true,
        mapFieldsToApi,
        validateSchema: successValidation,
        validateExportConfig: successValidation,
        toast,
      })
    );

    await act(async () => {
      await result.current.generateAiSample();
    });

    expect(fetchApi).toHaveBeenCalledWith(
      '/api/data-generator/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
    expect(JSON.parse((fetchApi.mock.calls[0]?.[1] as RequestInit).body as string)).toMatchObject({
      count: 1,
      format: 'JSON',
    });
    expect(result.current.aiSampleRow).toEqual({ aiSummary: 'Enhanced value' });
    expect(result.current.isFetchingAiSample).toBe(false);
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'AI Preview Failed' }));
  });

  it('notifies when no AI fields are available', async () => {
    const toast = jest.fn();

    const { result } = renderHook(() =>
      useDataGeneration({
        exportConfig: defaultExportConfig,
        hasAIGeneratedFields: false,
        mapFieldsToApi: jest.fn(() => []),
        validateSchema: successValidation,
        validateExportConfig: successValidation,
        toast,
      })
    );

    await act(async () => {
      await result.current.generateAiSample();
    });

    expect(fetchApi).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'No AI Fields',
      })
    );
  });

  it('surfaces API errors to the toast handler', async () => {
    const toast = jest.fn();
    const error = new Error('network down');

    fetchApi.mockRejectedValueOnce(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useDataGeneration({
        exportConfig: defaultExportConfig,
        hasAIGeneratedFields: true,
        mapFieldsToApi: jest.fn(() => [
          { name: 'aiSummary', type: 'AI-Generated', options: {} },
        ]),
        validateSchema: successValidation,
        validateExportConfig: successValidation,
        toast,
      })
    );

    await act(async () => {
      await result.current.generateAiSample();
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AI Preview Failed',
        description: 'network down',
      })
    );
    expect(result.current.aiSampleRow).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('useDataGeneration – metadata handling', () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it('records metadata and warns when determinism is not guaranteed', async () => {
    const toast = jest.fn();
    const mapFieldsToApi = jest.fn(() => [
      { name: 'buzz', type: 'Buzzword', options: {} },
    ]);

    const metadata = {
      engine: 'faker' as const,
      deterministic: false,
      seed: 'seed-123',
      warnings: ['Fields not yet supported by Copycat are generated with Faker.'],
    };

    fetchApi.mockResolvedValueOnce({
      data: [{ buzz: 'synergize frictionless platforms' }],
      metadata,
    });

    const seededConfig: ExportConfig = {
      ...defaultExportConfig,
      useDeterministicSeed: true,
      seedValue: 'seed-123',
    };

    const { result } = renderHook(() =>
      useDataGeneration({
        exportConfig: seededConfig,
        hasAIGeneratedFields: false,
        mapFieldsToApi,
        validateSchema: successValidation,
        validateExportConfig: successValidation,
        toast,
      })
    );

    await act(async () => {
      await result.current.generatePreview();
    });

    expect(result.current.generationMetadata).toEqual(metadata);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Determinism Notice' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Deterministic Mode Not Guaranteed' }));
  });

  it('does not raise warnings when deterministic metadata is returned', async () => {
    const toast = jest.fn();

    const metadata = {
      engine: 'faker' as const,
      deterministic: true,
      seed: 'seed-locked',
      warnings: [],
    };

    fetchApi.mockResolvedValueOnce({
      data: [{ buzz: 'mission-critical deliverable' }],
      metadata,
    });

    const seededConfig: ExportConfig = {
      ...defaultExportConfig,
      useDeterministicSeed: true,
      seedValue: 'seed-locked',
    };

    const { result } = renderHook(() =>
      useDataGeneration({
        exportConfig: seededConfig,
        hasAIGeneratedFields: false,
        mapFieldsToApi: jest.fn(() => [{ name: 'buzz', type: 'Buzzword', options: {} }]),
        validateSchema: successValidation,
        validateExportConfig: successValidation,
        toast,
      })
    );

    await act(async () => {
      await result.current.generatePreview();
    });

    expect(result.current.generationMetadata).toEqual(metadata);
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Deterministic Mode Not Guaranteed' }));
  });
});
