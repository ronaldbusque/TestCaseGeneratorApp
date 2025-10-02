'use client';

import { v4 as uuidv4 } from 'uuid';
import type { FieldDefinition } from '@/lib/data-generator/types';

const STORAGE_KEY = 'generator_saved_schemas_v1';

export interface StoredSchema {
  id: string;
  name: string;
  updatedAt: string;
  fields: FieldDefinition[];
}

const isBrowser = () => typeof window !== 'undefined';

const readStorage = (): StoredSchema[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredSchema =>
      item && typeof item.id === 'string' && typeof item.name === 'string'
    );
  } catch (error) {
    console.warn('[schemaStorage] Failed to read saved schemas', error);
    return [];
  }
};

const writeStorage = (schemas: StoredSchema[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
  } catch (error) {
    console.warn('[schemaStorage] Failed to persist saved schemas', error);
  }
};

export const listSchemas = (): StoredSchema[] => readStorage();

export const saveSchema = (payload: { id?: string; name: string; fields: FieldDefinition[] }): StoredSchema => {
  const schemas = readStorage();
  const id = payload.id ?? uuidv4();
  const entry: StoredSchema = {
    id,
    name: payload.name,
    updatedAt: new Date().toISOString(),
    fields: payload.fields,
  };

  const next = schemas.some((schema) => schema.id === id)
    ? schemas.map((schema) => (schema.id === id ? entry : schema))
    : [entry, ...schemas];

  writeStorage(next);
  return entry;
};

export const deleteSchema = (id: string) => {
  const schemas = readStorage();
  writeStorage(schemas.filter((schema) => schema.id !== id));
};

export const clearSchemas = () => writeStorage([]);
