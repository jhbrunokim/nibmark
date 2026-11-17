import { parse } from './parser';

/** Change only the view declaration, preserving comments, fences and all ingredients. */
export function setView(source: string, view: 'compact' | 'detailed'): string {
  if (!parse(source).ok) return source;
  const newline = source.includes('\r\n') ? '\r\n' : source.includes('\r') ? '\r' : '\n';
  const lines = source.split(/\r\n|\r|\n/);
  const index = lines.findIndex((line) => /^view /.test(line));
  if (index >= 0) lines[index] = `view ${view}`;
  else {
    const project = lines.findIndex((line) => /^project /.test(line));
    lines.splice(project + 1, 0, `view ${view}`);
  }
  return lines.join(newline);
}
