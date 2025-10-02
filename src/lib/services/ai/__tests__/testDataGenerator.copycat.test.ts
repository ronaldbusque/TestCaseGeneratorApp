import { TestDataGeneratorService } from '../testDataGenerator';
import type { AIService } from '@/lib/types';
import type { FieldDefinition } from '@/lib/data-generator/types';
import { supportsCopycat } from '@/lib/data-generator/copycatMapping';

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

  it('covers vehicle fields without triggering fallback', async () => {
    const vehicleFields: FieldDefinition[] = [
      { id: 'make', name: 'make', type: 'Car Make', options: {} },
      { id: 'model', name: 'model', type: 'Car Model', options: {} },
      { id: 'year', name: 'year', type: 'Car Model Year', options: {} },
      { id: 'vin', name: 'vin', type: 'Car VIN', options: {} },
    ];

    expect(supportsCopycat(vehicleFields)).toBe(true);

    const first = await service.generateTestDataFromFields({ fields: vehicleFields, count: 3, seed: 'seed-vehicle' });
    const second = await service.generateTestDataFromFields({ fields: vehicleFields, count: 3, seed: 'seed-vehicle' });

    expect(first.data).toEqual(second.data);
    first.data.forEach((row) => {
      expect(typeof row.make).toBe('string');
      expect(typeof row.model).toBe('string');
      expect(typeof row.year).toBe('number');
      expect(typeof row.vin).toBe('string');
      expect((row.vin as string)).toHaveLength(17);
    });
  });

  it('generates app and product fields deterministically', async () => {
    const fields: FieldDefinition[] = [
      { id: 'appName', name: 'appName', type: 'App Name', options: {} },
      { id: 'appVersion', name: 'appVersion', type: 'App Version', options: {} },
      { id: 'bundle', name: 'bundle', type: 'App Bundle ID', options: {} },
      { id: 'product', name: 'product', type: 'Product Name', options: {} },
      { id: 'category', name: 'category', type: 'Product Category', options: {} },
      { id: 'sku', name: 'sku', type: 'Product SKU', options: {} },
      { id: 'price', name: 'price', type: 'Product Price', options: { min: 25, max: 75 } },
    ];

    expect(supportsCopycat(fields)).toBe(true);

    const result = await service.generateTestDataFromFields({ fields, count: 2, seed: 'seed-app-product' });

    result.data.forEach((row) => {
      expect(typeof row.appName).toBe('string');
      expect((row.appVersion as string)).toMatch(/^\d+\.\d+\.\d+$/);
      expect((row.bundle as string)).toMatch(/^com\.[a-z0-9]+\.[a-z0-9]+$/);
      expect(typeof row.product).toBe('string');
      expect(typeof row.category).toBe('string');
      expect((row.sku as string)).toMatch(/^SKU-\d{4}-[A-Z]{3}$/);
      expect(typeof row.price).toBe('number');
      expect(row.price).toBeGreaterThanOrEqual(25);
      expect(row.price).toBeLessThanOrEqual(75);
    });
  });

  it('falls back to faker deterministically when fields are unsupported by Copycat', async () => {
    const fallbackFields: FieldDefinition[] = [
      { id: 'buzz', name: 'buzz', type: 'Buzzword', options: {} },
    ];

    const first = await service.generateTestDataFromFields({ fields: fallbackFields, count: 3, seed: 'seed-faker' });
    const second = await service.generateTestDataFromFields({ fields: fallbackFields, count: 3, seed: 'seed-faker' });

    expect(first.data).toEqual(second.data);
    expect(first.metadata?.engine).toBe('faker');
    expect(first.metadata?.deterministic).toBe(true);
    expect(first.metadata?.seed).toBe('seed-faker');
    expect(first.metadata?.warnings).toContain('Fields not yet supported by Copycat are generated with Faker.');
  });

  it('reports non-deterministic metadata when no seed is provided', async () => {
    const fallbackFields: FieldDefinition[] = [
      { id: 'buzz', name: 'buzz', type: 'Buzzword', options: {} },
    ];

    const first = await service.generateTestDataFromFields({ fields: fallbackFields, count: 2 });
    const second = await service.generateTestDataFromFields({ fields: fallbackFields, count: 2 });

    expect(first.data).not.toEqual(second.data);
    expect(first.metadata?.engine).toBe('faker');
    expect(first.metadata?.deterministic).toBe(false);
    expect(first.metadata?.warnings).toContain('Fields not yet supported by Copycat are generated with Faker.');
  });

  it('marks AI-generated schemas as non-deterministic even with a seed', async () => {
    const aiFields: FieldDefinition[] = [
      { id: 'ai', name: 'aiField', type: 'AI-Generated', options: {} },
    ];

    const result = await service.generateTestDataFromFields({ fields: aiFields, count: 1, seed: 'seed-ai' });

    expect(result.metadata?.deterministic).toBe(false);
    expect(result.metadata?.warnings).toEqual(
      expect.arrayContaining([
        'AI-generated fields use live model output and may vary between runs even with a seed.',
      ])
    );
  });
});
