import { render, screen, fireEvent } from '@testing-library/react';
import { SchemaBuilder } from '../SchemaBuilder';
import type { FieldDefinition } from '@/lib/data-generator/types';

describe('SchemaBuilder', () => {
  const initialField: FieldDefinition = {
    id: '1',
    name: 'id',
    type: 'Number',
    options: {},
  };

  it('duplicates a field and appends copy suffix', () => {
    const handleChange = jest.fn();
    render(<SchemaBuilder fields={[initialField]} onChange={handleChange} />);

    const duplicateButton = screen.getByLabelText('Duplicate field');
    fireEvent.click(duplicateButton);

    expect(handleChange).toHaveBeenCalled();
    const updatedFields = handleChange.mock.calls[0][0] as FieldDefinition[];
    expect(updatedFields).toHaveLength(2);
    expect(updatedFields[1].name).toBe('id_copy');
    expect(updatedFields[1].type).toBe('Number');
  });

  it('moves a field down when clicking move down', () => {
    const handleChange = jest.fn();
    render(
      <SchemaBuilder
        fields={[
          initialField,
          { id: '2', name: 'name', type: 'First Name', options: {} },
        ]}
        onChange={handleChange}
      />
    );

    const moveDownButtons = screen.getAllByLabelText('Move field down');
    fireEvent.click(moveDownButtons[0]);

    const updatedFields = handleChange.mock.calls[0][0] as FieldDefinition[];
    expect(updatedFields[0].name).toBe('name');
    expect(updatedFields[1].name).toBe('id');
  });

  it('applies a template and adds all template fields', () => {
    const handleChange = jest.fn();
    render(<SchemaBuilder fields={[initialField]} onChange={handleChange} />);

    const templateSelect = screen.getByDisplayValue('Add Template…');
    fireEvent.change(templateSelect, { target: { value: 'person-basic' } });

    const applyButton = screen.getByText('Apply Template');
    fireEvent.click(applyButton);

    expect(handleChange).toHaveBeenCalled();
    const updated = handleChange.mock.calls[0][0] as FieldDefinition[];
    expect(updated.length).toBeGreaterThan(1);
    expect(updated.some((field) => field.name.startsWith('firstName'))).toBe(true);
  });
});
