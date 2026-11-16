export type Locale = 'en' | 'ko';
export interface Ingredient {
  label: string;
  count: number;
  line: number;
  includes: Ingredient[];
}
export interface Group {
  label: string;
  line: number;
  items: Ingredient[];
}
export interface LabelModel {
  kind: 'nutrition';
  version: 1;
  project: string;
  projectVersion?: string;
  serving?: string;
  scope?: string;
  dependencies: number;
  measure?: 'dependencies' | 'packages';
  source?: string;
  generator?: string;
  created?: string;
  groups: Group[];
  note?: string;
}
export interface Diagnostic {
  line: number;
  column: number;
  message: string;
}
export type ParseResult = { ok: true; model: LabelModel } | { ok: false; errors: Diagnostic[] };
export const MAX_BYTES = 50 * 1024;
export const MAX_ROWS = 100;
export const MAX_TEXT = 200;
export function percent(count: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((count / total) * 100)}%`;
}
