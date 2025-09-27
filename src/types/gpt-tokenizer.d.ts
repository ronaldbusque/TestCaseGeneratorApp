declare module 'gpt-tokenizer/encoding/*' {
  export function countTokens(text: string): number;
}

declare module 'gpt-tokenizer/mapping' {
  export type EncodingName = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'p50k_edit' | 'r50k_base';
  export const DEFAULT_ENCODING: EncodingName;
  export const modelToEncodingMap: Record<string, EncodingName>;
}
