import { render, screen, fireEvent, waitFor } from '@/lib/test-utils';
import { RequirementsInput } from '../RequirementsInput';

describe('RequirementsInput', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial value', () => {
    const initialValue = 'Test requirements';
    render(<RequirementsInput onSubmit={mockOnSubmit} initialValue={initialValue} />);

    expect(screen.getByRole('textbox')).toHaveValue(initialValue);
  });

  it('disables submit button when input is empty', () => {
    render(<RequirementsInput onSubmit={mockOnSubmit} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('enables submit button when input has content', () => {
    render(<RequirementsInput onSubmit={mockOnSubmit} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test requirements' } });

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('calls onSubmit with input value when submitted', async () => {
    render(<RequirementsInput onSubmit={mockOnSubmit} />);

    const requirements = 'Test requirements';
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: requirements } });

    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(requirements);
    });
  });
}); 