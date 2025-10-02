import { act, fireEvent, render, screen } from '@testing-library/react';

import { TypeSelectionDialog } from '@/components/data-generator/TypeSelectionDialog';
import { fakerCategories } from '@/lib/data/faker-categories';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';

describe('TypeSelectionDialog', () => {
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    onSelectType: jest.fn(),
  };

  beforeEach(() => {
    props.onClose.mockReset();
    props.onSelectType.mockReset();
  });

  it('filters types by search term and category', () => {
    render(<TypeSelectionDialog {...props} />);

    const input = screen.getByPlaceholderText('Find Type...');
    act(() => {
      fireEvent.change(input, { target: { value: 'car' } });
    });

    const buttons = screen.getAllByRole('option');
    expect(buttons.some((button) => button.textContent?.includes('Car Make'))).toBe(true);
  });

  it('invokes onSelectType when option clicked', () => {
    render(<TypeSelectionDialog {...props} />);

    const button = screen.getAllByRole('option')[0];
    act(() => {
      fireEvent.click(button);
    });

    expect(props.onSelectType).toHaveBeenCalled();
  });
});
