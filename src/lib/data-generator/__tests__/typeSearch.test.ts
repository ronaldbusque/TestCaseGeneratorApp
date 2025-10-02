import { rankTypes, splitHighlight, type SearchableType } from '@/lib/data-generator/typeSearch';

describe('typeSearch', () => {
  const types: SearchableType[] = [
    { name: 'Car Make', description: 'Manufacturers like Honda or BMW', category: 'Car' },
    { name: 'Car Model', description: 'Specific vehicle model names', category: 'Car' },
    { name: 'Character Sequence', description: 'Generate incrementing strings', category: 'Basic' },
    { name: 'Company Name', description: 'Business names', category: 'Personal' },
  ];

  it('returns alphabetical list when no search term', () => {
    const ranked = rankTypes({ types, searchTerm: '' });
    expect(ranked.map((entry) => entry.name)).toEqual([
      'Car Make',
      'Car Model',
      'Character Sequence',
      'Company Name',
    ]);
  });

  it('prioritises direct name matches and prefixes', () => {
    const ranked = rankTypes({ types, searchTerm: 'car' });
    expect(ranked[0].name).toBe('Car Make');
    expect(ranked[1].name).toBe('Car Model');
    expect(ranked.every((entry) => entry.name.toLowerCase().includes('car'))).toBe(true);
  });

  it('falls back to description matches when name does not contain search term', () => {
    const ranked = rankTypes({ types, searchTerm: 'incrementing' });
    expect(ranked[0].name).toBe('Character Sequence');
  });

  it('filters by category when provided', () => {
    const ranked = rankTypes({ types, searchTerm: '', category: 'Car' });
    expect(ranked.map((entry) => entry.name)).toEqual(['Car Make', 'Car Model']);
  });

  it('splitHighlight segments text correctly', () => {
    expect(splitHighlight('Car Model', 'model')).toEqual([
      { text: 'Car ', highlighted: false },
      { text: 'Model', highlighted: true },
    ]);

    expect(splitHighlight('Car Make', 'z')).toEqual([{ text: 'Car Make', highlighted: false }]);
  });
});
