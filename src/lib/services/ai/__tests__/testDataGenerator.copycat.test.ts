import { TestDataGeneratorService } from '../testDataGenerator';
import type { AIService } from '@/lib/types';
import type { FieldDefinition } from '@/lib/data-generator/types';

class StubAIService implements AIService {
  async generateTestCases() {
    throw new Error('Not implemented');
  }

  async generateContent() {
    return 'noop';
  }
}

describe('TestDataGeneratorService - Copycat integration', () => {
  const service = new TestDataGeneratorService(new StubAIService());
  const fields = [
    { name: 'id', type: 'Number', options: { min: 1, max: 5 } },
    { name: 'firstName', type: 'First Name', options: {} },
    { name: 'email', type: 'Email', options: {} },
  ];

  it('generates deterministic rows for supported field types', async () => {
    const firstRun = await service.generateTestDataFromFields({ fields, count: 3, seed: 'seed-a' });
    const secondRun = await service.generateTestDataFromFields({ fields, count: 3, seed: 'seed-a' });

    expect(firstRun.data).toEqual(secondRun.data);
    expect(firstRun.count).toBe(3);
  });

  it('produces distinct results for different seeds', async () => {
    const seedA = await service.generateTestDataFromFields({ fields, count: 3, seed: 'seed-a' });
    const seedB = await service.generateTestDataFromFields({ fields, count: 3, seed: 'seed-b' });

    expect(seedA.data).not.toEqual(seedB.data);
  });

  it('copies values for reference fields', async () => {
    const referenceFields: FieldDefinition[] = [
      ...fields,
      { id: 'ref', name: 'nameCopy', type: 'Reference', options: { sourceField: 'firstName' } },
    ];

    const result = await service.generateTestDataFromFields({ fields: referenceFields, count: 2, seed: 'seed-ref' });
    result.data.forEach((row) => {
      expect(row.nameCopy).toBe(row.firstName);
    });
  });

  it('samples from custom list values', async () => {
    const listFields: FieldDefinition[] = [
      { id: 'list', name: 'flavor', type: 'Custom List', options: { values: 'vanilla, chocolate, strawberry' } },
    ];

    const result = await service.generateTestDataFromFields({ fields: listFields, count: 5, seed: 'seed-list' });
    const allowed = ['vanilla', 'chocolate', 'strawberry'];
    result.data.forEach((row) => {
      expect(allowed).toContain(row.flavor as string);
    });
  });

  it('formats dates consistently based on options', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-01-15T12:00:00Z').getTime());
    const dateFields: FieldDefinition[] = [
      { id: 'date', name: 'eventDate', type: 'Date', options: { fromDate: '2024-01-01', toDate: '2024-12-31', format: 'YYYY-MM-DD' } },
      { id: 'future', name: 'futureDate', type: 'Future Date', options: { days: 30, format: 'MM/DD/YYYY' } },
      { id: 'dob', name: 'dob', type: 'Date of Birth', options: { minAge: 21, maxAge: 30, format: 'DD/MM/YYYY' } },
    ];

    const first = await service.generateTestDataFromFields({ fields: dateFields, count: 1, seed: 'seed-date' });
    const second = await service.generateTestDataFromFields({ fields: dateFields, count: 1, seed: 'seed-date' });

    expect(first.data).toEqual(second.data);
    const row = first.data[0];
    expect(row.eventDate).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(row.futureDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(row.dob).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    nowSpy.mockRestore();
  });

  it('supports state abbreviations and zip formats', async () => {
    const localeFields: FieldDefinition[] = [
      { id: 'state', name: 'state', type: 'State', options: { abbreviated: true } },
      { id: 'zip', name: 'zip', type: 'Zip Code', options: { format: '#####-####' } },
    ];

    const result = await service.generateTestDataFromFields({ fields: localeFields, count: 5, seed: 'seed-locale' });
    result.data.forEach((row) => {
      expect(typeof row.state).toBe('string');
      expect((row.state as string).length).toBeGreaterThanOrEqual(2);
      expect((row.state as string)).toEqual((row.state as string).toUpperCase());
      expect(row.zip).toMatch(/\d{5}-\d{4}/);
    });
  });

  it('produces deterministic network resources', async () => {
    const networkFields: FieldDefinition[] = [
      { id: 'url', name: 'url', type: 'URL', options: {} },
      { id: 'ipv4', name: 'ip', type: 'IPv4 Address', options: {} },
      { id: 'line2', name: 'unit', type: 'Address Line 2', options: {} },
    ];

    const first = await service.generateTestDataFromFields({ fields: networkFields, count: 2, seed: 'seed-net' });
    const second = await service.generateTestDataFromFields({ fields: networkFields, count: 2, seed: 'seed-net' });

    expect(first.data).toEqual(second.data);
    first.data.forEach((row) => {
      expect(row.url).toMatch(/^https?:\/\//);
      expect(row.ip).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
      expect(typeof row.unit).toBe('string');
      expect((row.unit as string)).toMatch(/(Apt|Suite|Unit|Floor|Room) \d+/);
    });
  });
});
