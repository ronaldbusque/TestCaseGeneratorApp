// @ts-nocheck

const { countTokens: countTokensO200k } = require('gpt-tokenizer/encoding/o200k_base');
const { countTokens: countTokensCl100k } = require('gpt-tokenizer/encoding/cl100k_base');
const { countTokens: countTokensP50kBase } = require('gpt-tokenizer/encoding/p50k_base');
const { countTokens: countTokensP50kEdit } = require('gpt-tokenizer/encoding/p50k_edit');
const { countTokens: countTokensR50kBase } = require('gpt-tokenizer/encoding/r50k_base');
const { DEFAULT_ENCODING, modelToEncodingMap } = require('gpt-tokenizer/mapping');

const MODEL_CONTEXT_WINDOWS = {
  'openai:gpt-4o': 128_000,
  'openai:gpt-4o-mini': 128_000,
  'openai:gpt-4.1': 128_000,
  'openai:gpt-4.1-mini': 128_000,
  'openai:gpt-4.1-nano': 64_000,
  'openai:o3-mini': 140_000,
  'openai:gpt-5-thinking': 200_000,
  'openai:gpt-5-thinking-mini': 200_000,
  'openai:gpt-5-thinking-nano': 200_000,
  'gemini:gemini-2.5-pro': 1_500_000,
  'gemini:gemini-2.5-flash': 1_000_000,
  'gemini:gemini-2.5-flash-lite': 1_000_000,
  'gemini:gemini-2.0-flash': 1_000_000,
  'gemini:gemini-2.0-pro-exp': 1_000_000,
  'gemini:gemini-1.5-pro-latest': 1_000_000,
  'gemini:gemini-1.5-flash-latest': 1_000_000,
  'gemini:gemini-flash-latest': 1_000_000,
  'gemini:gemini-flash-lite-latest': 1_000_000,
  'openrouter:openrouter/auto': 128_000,
  'openrouter:openai/gpt-4o-mini': 128_000,
};

const PROVIDER_DEFAULT_CONTEXT = {
  openai: 128_000,
  gemini: 1_000_000,
  openrouter: 128_000,
};

const LOWERCASE_MODEL_ENCODING_MAP = Object.fromEntries(
  Object.entries(modelToEncodingMap).map(([modelName, encoding]) => [modelName.toLowerCase(), encoding])
);

const TOKEN_COUNTERS = {
  o200k_base: countTokensO200k,
  cl100k_base: countTokensCl100k,
  p50k_base: countTokensP50kBase,
  p50k_edit: countTokensP50kEdit,
  r50k_base: countTokensR50kBase,
};

function normaliseModelKey(provider, model) {
  return `${provider}:${(model ?? '').toLowerCase()}`;
}

function resolveEncoding(model) {
  if (!model) {
    return DEFAULT_ENCODING;
  }

  const normalized = model.toLowerCase();
  return LOWERCASE_MODEL_ENCODING_MAP[normalized] ?? DEFAULT_ENCODING;
}

export function countTokens(text, model) {
  if (!text) {
    return 0;
  }

  const encoding = resolveEncoding(model);
  const counter = TOKEN_COUNTERS[encoding] ?? countTokensO200k;
  return counter(text);
}

export function countTokenChunks(texts, model) {
  const encoding = resolveEncoding(model);
  const counter = TOKEN_COUNTERS[encoding] ?? countTokensO200k;
  return texts.reduce((total, text) => total + (text ? counter(text) : 0), 0);
}

export function getContextWindow(provider, model) {
  const specific = MODEL_CONTEXT_WINDOWS[normaliseModelKey(provider, model)];
  if (specific) {
    return specific;
  }
  return PROVIDER_DEFAULT_CONTEXT[provider] ?? null;
}
