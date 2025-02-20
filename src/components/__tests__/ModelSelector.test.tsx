import { render, screen, fireEvent } from '@/lib/test-utils';
import { ModelSelector } from '../ModelSelector';
import { AI_MODELS } from '@/lib/constants';

describe('ModelSelector', () => {
  const mockOnModelSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all model options', () => {
    render(<ModelSelector onModelSelect={mockOnModelSelect} />);

    AI_MODELS.forEach((model) => {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    });
  });

  it('disables unavailable models', () => {
    render(<ModelSelector onModelSelect={mockOnModelSelect} />);

    AI_MODELS.forEach((model) => {
      const button = screen.getByText(model.name);
      if (!model.isAvailable) {
        expect(button).toBeDisabled();
      } else {
        expect(button).not.toBeDisabled();
      }
    });
  });

  it('calls onModelSelect when an available model is selected', () => {
    render(<ModelSelector onModelSelect={mockOnModelSelect} />);

    const availableModel = AI_MODELS.find(model => model.isAvailable);
    if (availableModel) {
      fireEvent.click(screen.getByText(availableModel.name));
      expect(mockOnModelSelect).toHaveBeenCalledWith(availableModel.id);
    }
  });
}); 