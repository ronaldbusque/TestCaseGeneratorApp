import { copycat } from '@snaplet/copycat';
import { randomUUID } from 'crypto';

import type { FieldDefinition } from '@/lib/data-generator/types';

type CopycatGenerator = (params: { rowIndex: number; baseSeed: string }) => unknown;

export type CopycatMapperResult = {
  generate: CopycatGenerator;
  requiresFallback?: boolean;
};

const DEFAULT_DATE_MIN = Date.UTC(2020, 0, 1);
const DEFAULT_DATE_MAX = Date.UTC(2025, 11, 31, 23, 59, 59, 999);
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MILLIS_PER_YEAR = 365 * MILLIS_PER_DAY;

const ADDRESS_LINE2_PREFIXES = ['Apt', 'Suite', 'Unit', 'Floor', 'Room'];
const COMPANY_NAMES = [
  'Acme Corp',
  'Globex Corporation',
  'Initech',
  'Stark Industries',
  'Wayne Enterprises',
  'Umbrella Corporation',
  'Wonka Industries',
  'Soylent Corp',
  'Tyrell Corporation',
  'Hooli',
  'Pied Piper',
  'Cyberdyne Systems',
];

const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

const CAR_MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'Nissan',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Hyundai',
  'Kia',
  'Subaru',
  'Volkswagen',
  'Mazda',
  'Lexus',
  'Volvo',
] as const;

const CAR_MODELS = [
  'Civic',
  'Accord',
  'Model S',
  'Corolla',
  'Camry',
  'F-150',
  'Mustang',
  'CX-5',
  'Forester',
  'Outback',
  'Cherokee',
  'Explorer',
  'X5',
  'A4',
  'S60',
] as const;

const PRODUCT_NAMES = [
  'Aurora Lamp',
  'Nimbus Speaker',
  'Atlas Backpack',
  'Lumen Desk',
  'Pulse Watch',
  'Summit Bottle',
  'Mosaic Mug',
  'Radiant Hoodie',
  'Echo Earbuds',
  'Orbit Router',
] as const;

const PRODUCT_CATEGORIES = [
  'Electronics',
  'Home & Kitchen',
  'Outdoors',
  'Fitness',
  'Travel',
  'Office',
  'Accessories',
  'Toys',
] as const;

const APP_NAMES = [
  'SnapNote',
  'FlowPilot',
  'TaskForge',
  'BrightSide',
  'PeakTracker',
  'AtlasFit',
  'NimbusMail',
  'PulseCast',
  'LumenPay',
  'EchoDesk',
] as const;

const makeSeed = (baseSeed: string, fieldId: string, rowIndex: number, variant?: string) =>
  variant ? `${baseSeed}:${fieldId}:${variant}:${rowIndex}` : `${baseSeed}:${fieldId}:${rowIndex}`;

const parseNumberOption = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const parseBooleanOption = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
  }
  return fallback;
};

const parseDateOption = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  return null;
};

const ensureRange = (minValue: number, maxValue: number) =>
  minValue > maxValue ? { min: maxValue, max: minValue } : { min: minValue, max: maxValue };

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const DEFAULT_ANCHOR_TIMESTAMP = Date.UTC(2025, 0, 1);

const deriveSeededAnchor = ({
  field,
  baseSeed,
  variant,
  windowDays = 365,
}: {
  field: FieldDefinition;
  baseSeed: string;
  variant: string;
  windowDays?: number;
}): number => {
  const seed = makeSeed(baseSeed, field.id, 0, variant);
  const offsetDays = copycat.int(seed, {
    min: -windowDays,
    max: windowDays,
  });
  return DEFAULT_ANCHOR_TIMESTAMP + offsetDays * MILLIS_PER_DAY;
};

const formatDateValue = (iso: string, format?: string) => {
  if (!format || format === 'ISO') {
    return iso;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    return iso;
  }
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return iso;
  }
};

const formatTimeValue = (iso: string, format?: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    return iso;
  }
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  switch (format) {
    case 'HH:MM':
      return `${pad(hours)}:${pad(minutes)}`;
    case 'hh:MM AM/PM': {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${pad(displayHour)}:${pad(minutes)} ${period}`;
    }
    case 'HH:MM:SS':
    default:
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
};

const numberGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const min = parseNumberOption(field.options.min, 1);
  const max = parseNumberOption(field.options.max, 1000);
  const range = ensureRange(min, max);
  return copycat.int(makeSeed(baseSeed, field.id, rowIndex), {
    min: range.min,
    max: range.max,
  });
};

const decimalGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const min = parseNumberOption(field.options.min, 0);
  const max = parseNumberOption(field.options.max, 100);
  const precision = parseNumberOption(field.options.multipleOf, 0.01);
  const safePrecision = precision > 0 ? precision : 0.01;
  const range = ensureRange(min, max);
  return copycat.float(
    makeSeed(baseSeed, field.id, rowIndex),
    {
      min: range.min,
      max: range.max,
      precision: safePrecision,
    } as any
  );
};

const booleanGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.bool(makeSeed(baseSeed, field.id, rowIndex));

const emailGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.email(makeSeed(baseSeed, field.id, rowIndex)));

const phoneGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.phoneNumber(makeSeed(baseSeed, field.id, rowIndex)));

const fullNameGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.fullName(makeSeed(baseSeed, field.id, rowIndex)));

const cityGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.city(makeSeed(baseSeed, field.id, rowIndex)));

const countryGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.country(makeSeed(baseSeed, field.id, rowIndex)));

const uuidGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.uuid(makeSeed(baseSeed, field.id, rowIndex)));

const addressLine2Generator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const prefix = String(
    copycat.oneOf(
      makeSeed(baseSeed, field.id, rowIndex, 'prefix'),
      Array.from(ADDRESS_LINE2_PREFIXES) as unknown[]
    )
  );
  const unitNumber = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'unit'), {
    min: 1,
    max: 9999,
  });
  return `${prefix} ${unitNumber}`;
};

const addressGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const base = String(copycat.postalAddress(makeSeed(baseSeed, field.id, rowIndex, 'address')));
  if (!parseBooleanOption(field.options.includeSecondary)) {
    return base;
  }
  const secondary = addressLine2Generator(field)({ baseSeed, rowIndex });
  const segments = base.split(', ');
  if (segments.length === 0) {
    return `${base} ${secondary}`;
  }
  const [street, ...rest] = segments;
  return [`${street} ${secondary}`, ...rest].join(', ');
};

const stateGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const full = copycat.state(makeSeed(baseSeed, field.id, rowIndex));
  if (!parseBooleanOption(field.options.abbreviated)) {
    return full;
  }
  return STATE_ABBREVIATIONS[full] ?? full
    .split(' ')
    .map((segment) => segment.charAt(0))
    .join('')
    .toUpperCase();
};

const zipCodeGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const format = typeof field.options.format === 'string' ? field.options.format : '#####';
  if (format === '#####-####') {
    const prefix = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'zip-prefix'), {
      min: 0,
      max: 99999,
    });
    const suffix = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'zip-suffix'), {
      min: 0,
      max: 9999,
    });
    return `${pad(prefix, 5)}-${pad(suffix, 4)}`;
  }
  const value = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'zip'), {
    min: 0,
    max: 99999,
  });
  return pad(value, 5);
};

const companyNameGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex), Array.from(COMPANY_NAMES) as unknown[]));

const urlGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.url(makeSeed(baseSeed, field.id, rowIndex)));

const ipv4Generator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  String(copycat.ipv4(makeSeed(baseSeed, field.id, rowIndex)));

const characterSequenceGenerator = (field: FieldDefinition): CopycatGenerator => ({ rowIndex }) => {
  const prefix = typeof field.options.prefix === 'string' ? field.options.prefix : '';
  const startAt = parseNumberOption(field.options.startAt, 1);
  const length = parseNumberOption(field.options.length, 5);
  const padZeros = parseBooleanOption(field.options.padZeros);
  const value = startAt + rowIndex;
  const stringValue = padZeros ? pad(value, length) : String(value);
  return `${prefix}${stringValue}`;
};

const dateFormatter = (iso: string, field: FieldDefinition) =>
  formatDateValue(iso, typeof field.options.format === 'string' ? field.options.format : undefined);

const timeFormatter = (iso: string, field: FieldDefinition) =>
  formatTimeValue(iso, typeof field.options.format === 'string' ? field.options.format : 'HH:MM:SS');

const createDateStringGenerator = (
  resolveRange: (params: { field: FieldDefinition; baseSeed: string }) => { min: number; max: number },
  applyFormat: (iso: string, field: FieldDefinition) => unknown,
) =>
  (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
    const { min, max } = resolveRange({ field, baseSeed });
    const iso = copycat.dateString(
      makeSeed(baseSeed, field.id, rowIndex),
      { min, max } as any
    );
    return applyFormat(iso, field);
  };

const dateRangeResolver = ({ field }: { field: FieldDefinition; baseSeed: string }) => {
  const from = parseDateOption(field.options.fromDate)?.getTime() ?? DEFAULT_DATE_MIN;
  const to = parseDateOption(field.options.toDate)?.getTime() ?? DEFAULT_DATE_MAX;
  return ensureRange(from, to);
};

const futureDateRangeResolver = ({ field, baseSeed }: { field: FieldDefinition; baseSeed: string }) => {
  const days = Math.max(1, parseNumberOption(field.options.days, 365));
  const anchor = deriveSeededAnchor({ field, baseSeed, variant: 'future-anchor' });
  return ensureRange(anchor, anchor + days * MILLIS_PER_DAY);
};

const pastDateRangeResolver = ({ field, baseSeed }: { field: FieldDefinition; baseSeed: string }) => {
  const days = Math.max(1, parseNumberOption(field.options.days, 365));
  const anchor = deriveSeededAnchor({ field, baseSeed, variant: 'past-anchor' });
  return ensureRange(anchor - days * MILLIS_PER_DAY, anchor);
};

const dateOfBirthRangeResolver = ({ field, baseSeed }: { field: FieldDefinition; baseSeed: string }) => {
  const minAge = Math.max(0, parseNumberOption(field.options.minAge, 18));
  const maxAge = Math.max(minAge, parseNumberOption(field.options.maxAge, 65));
  const anchor = deriveSeededAnchor({ field, baseSeed, variant: 'dob-anchor', windowDays: 365 * 2 });
  const youngest = anchor - minAge * MILLIS_PER_YEAR;
  const oldest = anchor - maxAge * MILLIS_PER_YEAR;
  return ensureRange(oldest, youngest);
};

const timeRangeResolver = ({ field, baseSeed }: { field: FieldDefinition; baseSeed: string }) => {
  const anchor = deriveSeededAnchor({ field, baseSeed, variant: 'time-anchor', windowDays: 30 });
  const dayStart = Math.floor(anchor / MILLIS_PER_DAY) * MILLIS_PER_DAY;
  return ensureRange(dayStart, dayStart + MILLIS_PER_DAY);
};

const dateGenerator = createDateStringGenerator(dateRangeResolver, dateFormatter);
const futureDateGenerator = createDateStringGenerator(futureDateRangeResolver, dateFormatter);
const pastDateGenerator = createDateStringGenerator(pastDateRangeResolver, dateFormatter);
const dateOfBirthGenerator = createDateStringGenerator(dateOfBirthRangeResolver, dateFormatter);
const timeGenerator = createDateStringGenerator(timeRangeResolver, timeFormatter);

const deterministicOneOf = (
  field: FieldDefinition,
  choices: readonly string[],
  variant: string,
): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex, variant), choices as unknown[]);

const carMakeGenerator = (field: FieldDefinition): CopycatGenerator =>
  deterministicOneOf(field, CAR_MAKES, 'car-make');

const carModelGenerator = (field: FieldDefinition): CopycatGenerator =>
  deterministicOneOf(field, CAR_MODELS, 'car-model');

const carModelYearGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const min = parseNumberOption(field.options.min, 1995);
  const max = parseNumberOption(field.options.max, new Date().getFullYear());
  const range = ensureRange(min, max);
  return copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'car-year'), {
    min: range.min,
    max: range.max,
  });
};

const generateVin = (seed: string) => {
  const characters = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let index = 0; index < 17; index += 1) {
    const charSeed = `${seed}:vin:${index}`;
    const position = copycat.int(charSeed, { min: 0, max: characters.length - 1 });
    vin += characters[position];
  }
  return vin;
};

const carVinGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  generateVin(makeSeed(baseSeed, field.id, rowIndex, 'car-vin'));

const appNameGenerator = (field: FieldDefinition): CopycatGenerator =>
  deterministicOneOf(field, APP_NAMES, 'app-name');

const appVersionGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const major = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'app-version-major'), { min: 1, max: 9 });
  const minor = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'app-version-minor'), { min: 0, max: 20 });
  const patch = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'app-version-patch'), { min: 0, max: 50 });
  return `${major}.${minor}.${patch}`;
};

const sanitizeForBundle = (value: string) => value.replace(/[^a-z0-9]+/g, '');

const appBundleIdGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const company = String(
    copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex, 'bundle-company'), Array.from(APP_NAMES) as unknown[])
  ).toLowerCase();
  const product = String(
    copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex, 'bundle-product'), Array.from(PRODUCT_NAMES) as unknown[])
  ).toLowerCase();
  return `com.${sanitizeForBundle(company)}.${sanitizeForBundle(product) || 'app'}`;
};

const productNameGenerator = (field: FieldDefinition): CopycatGenerator =>
  deterministicOneOf(field, PRODUCT_NAMES, 'product-name');

const productCategoryGenerator = (field: FieldDefinition): CopycatGenerator =>
  deterministicOneOf(field, PRODUCT_CATEGORIES, 'product-category');

const productSkuGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const segment = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'sku'), { min: 1000, max: 9999 });
  const suffix = copycat.word(makeSeed(baseSeed, field.id, rowIndex, 'sku-word')).slice(0, 3).toUpperCase();
  return `SKU-${segment}-${suffix}`;
};

const productPriceGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  const min = parseNumberOption(field.options.min, 10);
  const max = parseNumberOption(field.options.max, 500);
  const range = ensureRange(min, max);
  const dollars = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'price-dollars'), {
    min: range.min,
    max: range.max,
  });
  const cents = copycat.int(makeSeed(baseSeed, field.id, rowIndex, 'price-cents'), { min: 0, max: 99 });
  return Number(`${dollars}.${pad(cents, 2)}`);
};

const parseCustomListOptions = (values: unknown): string[] => {
  if (Array.isArray(values)) {
    return values
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry)))
      .filter((entry) => entry.length > 0);
  }

  if (typeof values === 'string') {
    return values
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const FIELD_GENERATORS: Record<string, (field: FieldDefinition) => CopycatGenerator> = {
  Number: numberGenerator,
  'Decimal Number': decimalGenerator,
  Boolean: booleanGenerator,
  'First Name': (field) => ({ baseSeed, rowIndex }) => copycat.firstName(makeSeed(baseSeed, field.id, rowIndex)),
  'Last Name': (field) => ({ baseSeed, rowIndex }) => copycat.lastName(makeSeed(baseSeed, field.id, rowIndex)),
  'Full Name': fullNameGenerator,
  Email: emailGenerator,
  City: cityGenerator,
  State: stateGenerator,
  Country: countryGenerator,
  Address: addressGenerator,
  'Address Line 2': addressLine2Generator,
  'Zip Code': zipCodeGenerator,
  'Phone Number': phoneGenerator,
  'Company Name': companyNameGenerator,
  URL: urlGenerator,
  'IPv4 Address': ipv4Generator,
  UUID: uuidGenerator,
  'Character Sequence': characterSequenceGenerator,
  Date: dateGenerator,
  'Future Date': futureDateGenerator,
  'Past Date': pastDateGenerator,
  'Date of Birth': dateOfBirthGenerator,
  Time: timeGenerator,
  'Car Make': carMakeGenerator,
  'Car Model': carModelGenerator,
  'Car Model Year': carModelYearGenerator,
  'Car VIN': carVinGenerator,
  'App Name': appNameGenerator,
  'App Version': appVersionGenerator,
  'App Bundle ID': appBundleIdGenerator,
  'Product Name': productNameGenerator,
  'Product Category': productCategoryGenerator,
  'Product SKU': productSkuGenerator,
  'Product Price': productPriceGenerator,
};

const genericStringGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  if (Array.isArray(field.options.examples) && field.options.examples.length > 0) {
    return copycat.oneOf(
      makeSeed(baseSeed, field.id, rowIndex),
      field.options.examples as unknown[]
    );
  }
  return copycat.words(makeSeed(baseSeed, field.id, rowIndex));
};

export const mapFieldToCopycat = (field: FieldDefinition): CopycatMapperResult => {
  if (field.type === 'Custom List') {
    const values = parseCustomListOptions(field.options?.values);
    if (values.length === 0) {
      return {
        generate: () => null,
        requiresFallback: true,
      };
    }
    return {
      generate: ({ baseSeed, rowIndex }) =>
        copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex), values as unknown[]),
    };
  }

  const generatorFactory = FIELD_GENERATORS[field.type];
  if (generatorFactory) {
    return { generate: generatorFactory(field) };
  }

  if (field.type === 'Reference') {
    return {
      generate: () => null,
      requiresFallback: false,
    };
  }

  if (field.type === 'AI-Generated') {
    return {
      generate: genericStringGenerator(field),
      requiresFallback: true,
    };
  }

  return {
    generate: genericStringGenerator(field),
    requiresFallback: true,
  };
};

export const generateCopycatRows = (
  fields: FieldDefinition[],
  count: number,
  seed?: string | number
): { rows: Array<Record<string, unknown>>; usedFallback: boolean } => {
  const baseSeed = seed !== undefined && seed !== null ? String(seed) : randomUUID();
  let usedFallback = false;

  const rows = Array.from({ length: count }).map((_, rowIndex) => {
    const row = fields.reduce<Record<string, unknown>>((accumulator, field) => {
      if (field.type === 'Reference') {
        return accumulator;
      }

      const { generate, requiresFallback } = mapFieldToCopycat(field);
      if (requiresFallback) {
        usedFallback = true;
      }
      accumulator[field.name] = generate({ baseSeed, rowIndex });
      return accumulator;
    }, {});

    return row;
  });

  return { rows: applyReferenceFields(rows, fields), usedFallback };
};

export const supportsCopycat = (fields: FieldDefinition[]): boolean =>
  fields.every((field) => !mapFieldToCopycat(field).requiresFallback);

const applyReferenceFields = (
  rows: Array<Record<string, unknown>>,
  fields: FieldDefinition[],
) =>
  rows.map((row) => {
    const updated = { ...row };
    fields.forEach((field) => {
      if (field.type === 'Reference') {
        const sourceField = typeof field.options.sourceField === 'string' ? field.options.sourceField : '';
        updated[field.name] = sourceField && sourceField in updated ? updated[sourceField] : null;
      }
    });
    return updated;
  });
