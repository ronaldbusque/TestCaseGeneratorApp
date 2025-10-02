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

  it('shows error when min is greater than max for number field', () => {
    const field: FieldDefinition = {
      id: 'num1',
      name: 'quantity',
      type: 'Number',
      options: { min: 10, max: 1 },
    };
    render(<SchemaBuilder fields={[field]} onChange={jest.fn()} />);

    expect(screen.getByText('Min value cannot exceed Max value.')).toBeInTheDocument();
  });

  it('validates date range for Date field', () => {
    const field: FieldDefinition = {
      id: 'date1',
      name: 'eventDate',
      type: 'Date',
      options: { fromDate: '2025-12-31', toDate: '2025-01-01' },
    };

    render(<SchemaBuilder fields={[field]} onChange={jest.fn()} />);

    expect(screen.getByText('From date cannot be after To date.')).toBeInTheDocument();
  });

  it('validates min/max age for Date of Birth field', () => {
    const field: FieldDefinition = {
      id: 'dob1',
      name: 'dob',
      type: 'Date of Birth',
      options: { minAge: 50, maxAge: 20 },
    };

    render(<SchemaBuilder fields={[field]} onChange={jest.fn()} />);

    expect(screen.getByText('Min Age cannot exceed Max Age.')).toBeInTheDocument();
  });

  it('validates custom list values', () => {
    const field: FieldDefinition = {
      id: 'list1',
      name: 'choices',
      type: 'Custom List',
      options: { values: '   ' },
    };

    render(<SchemaBuilder fields={[field]} onChange={jest.fn()} />);

    expect(screen.getByText('Provide at least one value.')).toBeInTheDocument();
  });

  it('validates phone format placeholders', () => {
    const field: FieldDefinition = {
      id: 'phone1',
      name: 'phone',
      type: 'Phone Number',
      options: { format: '(555) 123-4567' },
    };

    render(<SchemaBuilder fields={[field]} onChange={jest.fn()} />);

    expect(screen.getByText('Custom phone formats must include # placeholders.')).toBeInTheDocument();
  });
});
