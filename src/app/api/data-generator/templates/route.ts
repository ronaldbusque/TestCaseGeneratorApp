import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getServiceSupabaseClient } from '@/lib/server/supabaseClient';
import type { FieldDefinition } from '@/lib/data-generator/types';

const USER_ID_HEADER = 'X-User-Identifier';
const TABLE_NAME = 'generator_schemas';

const fieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string().min(1),
  options: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

const templatePayloadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  fields: z.array(fieldDefinitionSchema),
});

type TemplatePayload = z.infer<typeof templatePayloadSchema>;

type SupabaseRow = {
  id: string;
  name: string;
  owner_id: string;
  schema_definition: FieldDefinition[];
  updated_at: string | null;
};

const toResponseSchema = (row: SupabaseRow) => ({
  id: row.id,
  name: row.name,
  updatedAt: row.updated_at ?? new Date().toISOString(),
  fields: row.schema_definition ?? [],
});

const ensureUserIdentifier = (request: NextRequest): string | null => {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) {
    return null;
  }
  return userId;
};

const ensureSupabase = () => {
  const client = getServiceSupabaseClient();
  return client;
};

export async function GET(request: NextRequest) {
  const userIdentifier = ensureUserIdentifier(request);
  if (!userIdentifier) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  const supabase = ensureSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, name, schema_definition, updated_at, owner_id')
    .eq('owner_id', userIdentifier)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[API][Templates][GET] Failed to fetch templates', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }

  const schemas = (data ?? []).map(toResponseSchema);
  return NextResponse.json({ schemas });
}

export async function POST(request: NextRequest) {
  const userIdentifier = ensureUserIdentifier(request);
  if (!userIdentifier) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  const supabase = ensureSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  let payload: TemplatePayload;
  try {
    const json = await request.json();
    payload = templatePayloadSchema.parse(json);
  } catch (error) {
    console.warn('[API][Templates][POST] Invalid payload', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (payload.id) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        name: payload.name,
        schema_definition: payload.fields,
        updated_at: now,
      })
      .eq('id', payload.id)
      .eq('owner_id', userIdentifier)
      .select('id, name, schema_definition, updated_at, owner_id')
      .single();

    if (error) {
      console.error('[API][Templates][POST] Failed to update template', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ schema: toResponseSchema(data as SupabaseRow) });
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      owner_id: userIdentifier,
      name: payload.name,
      schema_definition: payload.fields,
      updated_at: now,
    })
    .select('id, name, schema_definition, updated_at, owner_id')
    .single();

  if (error) {
    console.error('[API][Templates][POST] Failed to insert template', error);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }

  return NextResponse.json({ schema: toResponseSchema(data as SupabaseRow) });
}

export async function DELETE(request: NextRequest) {
  const userIdentifier = ensureUserIdentifier(request);
  if (!userIdentifier) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  const supabase = ensureSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id)
      .eq('owner_id', userIdentifier);

    if (error) {
      console.error('[API][Templates][DELETE] Failed to delete template', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('owner_id', userIdentifier);

  if (error) {
    console.error('[API][Templates][DELETE] Failed to clear templates', error);
    return NextResponse.json({ error: 'Failed to clear templates' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
