import { parseWordDocument } from '../documentParser';

describe('documentParser', () => {
  it('parses a Word document successfully', async () => {
    const content = 'Test content';
    const file = new File([content], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    // Mock mammoth's extractRawText function
    jest.mock('mammoth', () => ({
      extractRawText: jest.fn().mockResolvedValue({ value: content })
    }));

    const result = await parseWordDocument(file);
    expect(result).toBe(content);
  });

  it('handles file reading errors', async () => {
    const file = new File([], 'test.docx');

    // Mock FileReader to simulate an error
    const mockFileReader = {
      readAsArrayBuffer: jest.fn(),
      onerror: null,
    };
    window.FileReader = jest.fn(() => mockFileReader) as any;

    await expect(parseWordDocument(file)).rejects.toThrow('Failed to read file');
  });
}); 