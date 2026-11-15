import { MAX_BYTES, type Locale } from '../core';

// Keep links comfortably below browser URL limits; larger recipes use file export.
export const MAX_SHARE_URL = 12_000;
const PREFIX = '#nibmark=v1.';
export interface SharedRecipe {
  source: string;
  locale: Locale;
}
export class ShareError extends Error {
  constructor(public code: 'too-long' | 'invalid') {
    super(code);
  }
}

export function shareURL(recipe: SharedRecipe, base: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify(recipe));
  if (bytes.length > MAX_BYTES) throw new ShareError('too-long');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(base);
  url.search = '';
  url.hash = PREFIX + encoded;
  if (url.href.length > MAX_SHARE_URL) throw new ShareError('too-long');
  return url.href;
}

export function readShare(hash: string): SharedRecipe | undefined {
  if (!hash.startsWith('#nibmark=')) return undefined;
  try {
    if (hash.length > MAX_SHARE_URL || !hash.startsWith(PREFIX)) throw new Error();
    const encoded = hash.slice(PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error();
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const recipe: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      !recipe ||
      typeof recipe !== 'object' ||
      !('source' in recipe) ||
      typeof recipe.source !== 'string' ||
      !('locale' in recipe) ||
      (recipe.locale !== 'en' && recipe.locale !== 'ko') ||
      new TextEncoder().encode(recipe.source).length > MAX_BYTES
    )
      throw new Error();
    return { source: recipe.source, locale: recipe.locale as Locale };
  } catch {
    throw new ShareError('invalid');
  }
}
