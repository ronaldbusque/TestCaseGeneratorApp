import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AIPromptSuggestions } from '@/components/data-generator/AIPromptSuggestions';

describe('AIPromptSuggestions', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds a custom prompt and renders it in the list', () => {
    render(
      <AIPromptSuggestions
        onSelect={jest.fn()}
        currentPrompt=""
        disabled={false}
        aiFieldNames={['AI Summary']}
        sampleRow={null}
        isSampleLoading={false}
        onGenerateSample={jest.fn()}
      />
    );

    const promptInput = screen.getByPlaceholderText('Describe how AI should enhance your dataset');
    fireEvent.change(promptInput, { target: { value: 'Generate sci-fi planet descriptions.' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText('Generate sci-fi planet descriptions.')).toBeInTheDocument();
  });

  it('copies prompt text to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <AIPromptSuggestions
        onSelect={jest.fn()}
        currentPrompt=""
        disabled={false}
        aiFieldNames={['AI Summary']}
        sampleRow={null}
        isSampleLoading={false}
        onGenerateSample={jest.fn()}
      />
    );

    const copyButtons = screen.getAllByLabelText('Copy prompt');
    fireEvent.click(copyButtons[0]);

    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });

  it('invokes sample generation when preview is clicked', () => {
    const handleGenerate = jest.fn();

    render(
      <AIPromptSuggestions
        onSelect={jest.fn()}
        currentPrompt=""
        disabled={false}
        aiFieldNames={['AI Summary']}
        sampleRow={null}
        isSampleLoading={false}
        onGenerateSample={handleGenerate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(handleGenerate).toHaveBeenCalled();
  });

  it('shows sample data when provided', () => {
    render(
      <AIPromptSuggestions
        onSelect={jest.fn()}
        currentPrompt=""
        disabled={false}
        aiFieldNames={['AI Summary']}
        sampleRow={{ summary: 'AI-enhanced note' }}
        isSampleLoading={false}
        onGenerateSample={jest.fn()}
      />
    );

    expect(screen.getByText('summary')).toBeInTheDocument();
    expect(screen.getByText('AI-enhanced note')).toBeInTheDocument();
  });

  it('disables preview when there are no AI fields', () => {
    render(
      <AIPromptSuggestions
        onSelect={jest.fn()}
        currentPrompt=""
        disabled={false}
        aiFieldNames={[]}
        sampleRow={null}
        isSampleLoading={false}
        onGenerateSample={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /preview/i })).toBeDisabled();
    expect(screen.getByText(/add at least one ai-generated field/i)).toBeInTheDocument();
  });
});
