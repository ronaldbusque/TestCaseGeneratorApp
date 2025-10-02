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
});
