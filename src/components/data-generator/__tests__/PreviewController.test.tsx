import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PreviewController } from '@/components/data-generator/PreviewController';

describe('PreviewController', () => {
const createProps = () => ({
  data: [{ id: 1, name: 'Sample' }],
  format: 'JSON' as const,
  options: {
    lineEnding: 'Unix (LF)' as const,
    includeHeader: true,
    includeBOM: false,
  },
  metadata: {
    engine: 'copycat' as const,
    deterministic: true,
    seed: 'seed-123',
    warnings: undefined,
  },
  isRefreshing: false,
  onRefresh: jest.fn(),
  onClose: jest.fn(),
  toast: jest.fn(),
});

beforeEach(() => {
  jest.resetAllMocks();
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  });
  global.URL.createObjectURL = jest.fn(() => 'blob:url');
  global.URL.revokeObjectURL = jest.fn();
});

it('shows metadata details and row count', () => {
  const props = createProps();
  render(<PreviewController {...props} />);

  expect(screen.getByText(/Preview Summary/i)).toBeInTheDocument();
  expect(screen.getByText(/1 rows/i)).toBeInTheDocument();
  expect(screen.getByText(/Engine: Copycat/)).toBeInTheDocument();
  expect(screen.getByText(/Seed:/)).toBeInTheDocument();
});

it('invokes refresh callback', () => {
  const props = createProps();
  render(<PreviewController {...props} />);

  fireEvent.click(screen.getByRole('button', { name: /refresh preview/i }));

  expect(props.onRefresh).toHaveBeenCalled();
});

it('copies preview data to clipboard', async () => {
  const props = createProps();
  render(<PreviewController {...props} />);

  fireEvent.click(screen.getByRole('button', { name: /copy raw data/i }));

  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  expect(props.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Preview copied' })
  );
});

it('downloads preview data', () => {
  const props = createProps();
  const clickSpy = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);
  const removeSpy = jest
    .spyOn(Element.prototype, 'remove')
    .mockImplementation(() => undefined);

  render(<PreviewController {...props} />);

  fireEvent.click(screen.getByRole('button', { name: /download preview/i }));

  expect(global.URL.createObjectURL).toHaveBeenCalled();
  expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  expect(clickSpy).toHaveBeenCalled();
  expect(removeSpy).toHaveBeenCalled();
  expect(props.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Preview downloaded' })
  );
  clickSpy.mockRestore();
  removeSpy.mockRestore();
});
});
