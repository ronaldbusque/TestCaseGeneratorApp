import { act, renderHook } from '@testing-library/react';

import { DEFAULT_EXPORT_CONFIG } from '@/lib/data-generator/constants';
import { useExportConfig } from '@/lib/hooks/data-generator/useExportConfig';

describe('useExportConfig', () => {
  it('provides default configuration', () => {
    const { result } = renderHook(() => useExportConfig());

    expect(result.current.config).toEqual(DEFAULT_EXPORT_CONFIG);
  });

  it('validates missing AI prompt when AI fields exist', () => {
    const { result } = renderHook(() => useExportConfig());

    const validation = result.current.validateAgainstSchema(true);
    expect(validation.ok).toBe(false);
    expect(validation.error).toEqual({ type: 'missingAIPrompt' });
  });

  it('passes validation when prompt present', () => {
    const { result } = renderHook(() => useExportConfig());

    act(() => {
      result.current.updateConfig({ enhancementPrompt: 'Generate ecommerce descriptions' });
    });

    const validation = result.current.validateAgainstSchema(true);
    expect(validation.ok).toBe(true);
  });

  it('requires seed when deterministic mode enabled', () => {
    const { result } = renderHook(() => useExportConfig());

    act(() => {
      result.current.updateConfig({ useDeterministicSeed: true, seedValue: '' });
    });

    const validation = result.current.validateAgainstSchema(false);
    expect(validation.ok).toBe(false);
    expect(validation.error).toEqual({ type: 'missingSeed' });

    act(() => {
      result.current.updateConfig({ seedValue: 'demo-seed' });
    });

    const nextValidation = result.current.validateAgainstSchema(false);
    expect(nextValidation.ok).toBe(true);
  });

  it('resets to defaults', () => {
    const { result } = renderHook(() => useExportConfig());

    act(() => {
      result.current.updateConfig({ rowCount: 42 });
    });

    expect(result.current.config.rowCount).toBe(42);

    act(() => {
      result.current.resetConfig();
    });

    expect(result.current.config).toEqual(DEFAULT_EXPORT_CONFIG);
  });
});
