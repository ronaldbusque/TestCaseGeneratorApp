import { render, screen } from '@testing-library/react';

import { RelationalPreview } from '@/components/data-generator/RelationalPreview';

const makeReferenceField = (name: string, sourceField: string) => ({
  id: `${name}-id`,
  name,
  type: 'Reference',
  options: { sourceField },
});

describe('RelationalPreview', () => {
  it('renders message when no reference fields exist', () => {
    render(
      <RelationalPreview
        data={[{ id: 1, value: 'example' }]}
        fields={[{ id: 'id', name: 'id', type: 'Number', options: {} }]}
      />
    );

    expect(screen.getByText(/No reference fields detected/)).toBeInTheDocument();
  });

  it('summarises reference relationships and highlights matches', () => {
    const fields = [
      { id: 'id', name: 'id', type: 'Number', options: {} },
      makeReferenceField('customer_id', 'id'),
    ];

    const data = [
      { id: 1, customer_id: 1 },
      { id: 2, customer_id: 2 },
    ];

    render(<RelationalPreview data={data} fields={fields} />);

    expect(screen.getByText(/customer_id/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Match/)).toHaveLength(2);
    expect(screen.queryByText(/Mismatch/)).not.toBeInTheDocument();
  });

  it('flags mismatched reference values', () => {
    const fields = [
      { id: 'slug', name: 'slug', type: 'Text', options: {} },
      makeReferenceField('slugRef', 'slug'),
    ];

    const data = [
      { slug: 'abc', slugRef: 'abc' },
      { slug: 'xyz', slugRef: 'mismatch' },
    ];

    render(<RelationalPreview data={data} fields={fields} />);

    expect(screen.getByText(/1 mismatched row/)).toBeInTheDocument();
    expect(screen.getByText(/Mismatch/)).toBeInTheDocument();
  });
});
