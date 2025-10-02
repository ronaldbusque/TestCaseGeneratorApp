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
      />
    );

    const copyButtons = screen.getAllByLabelText('Copy prompt');
    fireEvent.click(copyButtons[0]);

    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });
});
