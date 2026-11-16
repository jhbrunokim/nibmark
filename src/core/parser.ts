import {
  MAX_BYTES,
  MAX_ROWS,
  MAX_TEXT,
  type Diagnostic,
  type Group,
  type Ingredient,
  type LabelModel,
  type ParseResult,
} from './types';

class SyntaxProblem extends Error {
  constructor(
    public line: number,
    public column: number,
    message: string,
  ) {
    super(message);
  }
}
interface Token {
  value: string;
  quoted: boolean;
  column: number;
}
function fail(line: number, column: number, message: string): never {
  throw new SyntaxProblem(line, column, message);
}

function tokenize(raw: string, line: number): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  while (at < raw.length) {
    if (raw[at] === ' ') {
      at++;
      continue;
    }
    const start = at;
    if (raw[at] === '"') {
      at++;
      let value = '';
      let closed = false;
      while (at < raw.length) {
        const c = raw[at++];
        if (c === '"') {
          closed = true;
          break;
        }
        if (c === '\\') {
          const escape = raw[at++];
          if (escape === 'n') value += '\n';
          else if (escape === '"' || escape === '\\') value += escape;
          else fail(line, at, 'Only \\n, \\" and \\\\ escapes are supported.');
        } else value += c;
      }
      if (!closed) fail(line, start + 1, 'Close this string with a double quote.');
      if (at < raw.length && raw[at] !== ' ')
        fail(line, at + 1, 'Add a space after the quoted string.');
      if (!value.trim()) fail(line, start + 1, 'Text cannot be empty.');
      if (Array.from(value).length > MAX_TEXT)
        fail(line, start + 1, `Keep text within ${MAX_TEXT} characters.`);
      if (/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value))
        fail(line, start + 1, 'Control characters are not supported.');
      tokens.push({ value, quoted: true, column: start + 1 });
    } else {
      while (at < raw.length && raw[at] !== ' ') at++;
      tokens.push({ value: raw.slice(start, at), quoted: false, column: start + 1 });
    }
  }
  return tokens;
}

/** Parse one label, retaining line numbers from the original (possibly fenced) input. */
export function parse(source: string): ParseResult {
  try {
    if (new TextEncoder().encode(source).byteLength > MAX_BYTES)
      fail(1, 1, 'This label exceeds the 50 KB input limit.');
    const lines = source
      .replace(/^\uFEFF/u, '')
      .replace(/\r\n?/g, '\n')
      .split('\n');
    let start = lines.findIndex((s) => s.trim());
    let end = lines.length;
    if (start === -1) fail(1, 1, 'Start your label with nutrition v1.');
    const opening = /^( {0,3})(`{3,}|~{3,})nibmark\s*$/.exec(lines[start]);
    if (opening) {
      const fence = opening[2];
      const close = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`);
      const closeIndex = lines.findIndex((s, i) => i > start && close.test(s));
      if (closeIndex === -1) fail(start + 1, 1, 'Close the nibmark code block.');
      if (lines.slice(closeIndex + 1).some((s) => s.trim()))
        fail(closeIndex + 2, 1, 'Paste only one nibmark code block, without surrounding Markdown.');
      start++;
      end = closeIndex;
    }
    let header = false;
    let rowCount = 0;
    let phase = 0;
    let group: Group | undefined;
    let item: Ingredient | undefined;
    const seen = new Set<string>();
    const model: LabelModel = {
      kind: 'nutrition',
      version: 1,
      project: '',
      dependencies: 0,
      groups: [],
    };
    for (let index = start; index < end; index++) {
      const raw = lines[index];
      const line = index + 1;
      if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
      if (raw.includes('\t'))
        fail(
          line,
          raw.indexOf('\t') + 1,
          'Use spaces instead of tabs (2 for item, 4 for includes).',
        );
      const indent = raw.length - raw.trimStart().length;
      const tokens = tokenize(raw, line);
      const cmd = tokens[0]?.value;
      const check = (count: number) => {
        if (tokens.length !== count)
          fail(line, tokens.at(-1)?.column ?? 1, `Unexpected arguments for ${cmd}.`);
      };
      const keyword = (i: number, value: string) => {
        if (tokens[i]?.quoted || tokens[i]?.value !== value)
          fail(line, tokens[i]?.column ?? raw.length + 1, `Expected ${value}.`);
      };
      const text = (i: number) => {
        if (!tokens[i]?.quoted)
          fail(line, tokens[i]?.column ?? raw.length + 1, 'Wrap text in double quotes.');
        return tokens[i].value;
      };
      const count = (i: number) => {
        const t = tokens[i];
        if (
          !t ||
          t.quoted ||
          !/^(0|[1-9]\d*)$/.test(t.value) ||
          !Number.isSafeInteger(Number(t.value))
        )
          fail(line, t?.column ?? raw.length + 1, 'Use a non-negative safe integer (no decimals).');
        return Number(t.value);
      };
      if (tokens[0]?.quoted) fail(line, tokens[0].column, 'Command names must not be quoted.');
      if (!header) {
        if (indent !== 0 || cmd !== 'nutrition')
          fail(line, 1, 'The first declaration must be nutrition v1.');
        check(2);
        keyword(1, 'v1');
        header = true;
        continue;
      }
      if (cmd !== 'item' && cmd !== 'includes') {
        if (indent !== 0) fail(line, 1, `${cmd} must start at the beginning of the line.`);
        item = undefined;
        if (cmd !== 'group') {
          if (seen.has(cmd)) fail(line, 1, `${cmd} may only appear once.`);
          seen.add(cmd);
        }
      }
      switch (cmd) {
        case 'project':
          if (phase !== 0) fail(line, 1, 'Put project immediately after nutrition v1.');
          if (tokens.length !== 2 && tokens.length !== 4)
            fail(line, 1, 'Use project "name" or project "name" version "version".');
          model.project = text(1);
          if (tokens.length === 4) {
            keyword(2, 'version');
            model.projectVersion = text(3);
          }
          phase = 1;
          break;
        case 'serving':
        case 'scope':
        case 'source':
        case 'generator':
        case 'created':
          if (phase !== 1) fail(line, 1, `Put ${cmd} after project and before the count.`);
          check(2);
          model[cmd] = text(1);
          break;
        case 'dependencies':
        case 'packages':
          if (phase !== 1)
            fail(line, 1, 'Put one dependencies or packages count after project and metadata.');
          check(2);
          model.dependencies = count(1);
          model.measure = cmd;
          phase = 2;
          break;
        case 'group':
          if (phase !== 2 && phase !== 3)
            fail(line, 1, 'Put groups after the count and before note.');
          check(4);
          keyword(2, 'of');
          keyword(3, model.measure ?? 'dependencies');
          group = { label: text(1), line, items: [] };
          model.groups.push(group);
          phase = 3;
          break;
        case 'item':
          if (phase !== 3 || !group || indent !== 2)
            fail(line, 1, 'Put item inside a group, indented by 2 spaces.');
          check(3);
          item = { label: text(1), count: count(2), line, includes: [] };
          group.items.push(item);
          rowCount++;
          break;
        case 'includes':
          if (phase !== 3 || !item || indent !== 4)
            fail(line, 1, 'Put includes below an item, indented by 4 spaces.');
          check(3);
          item.includes.push({ label: text(1), count: count(2), line, includes: [] });
          rowCount++;
          break;
        case 'note':
          if (phase !== 3) fail(line, 1, 'Put note after all groups.');
          check(2);
          model.note = text(1);
          phase = 4;
          break;
        default:
          fail(line, 1, `Unknown command: ${cmd}.`);
      }
      if (rowCount > MAX_ROWS) fail(line, 1, `Use at most ${MAX_ROWS} item/includes rows.`);
    }
    if (
      !header ||
      !seen.has('project') ||
      (!seen.has('dependencies') && !seen.has('packages')) ||
      model.groups.length === 0
    )
      fail(
        Math.max(start + 1, end),
        1,
        'A label needs nutrition v1, project, a dependencies or packages count and at least one group.',
      );
    const errors: Diagnostic[] = [];
    for (const g of model.groups) {
      if (g.items.length === 0) {
        errors.push({ line: g.line, column: 1, message: 'Add at least one item to this group.' });
        continue;
      }
      const sum = g.items.reduce((acc, row) => acc + BigInt(row.count), 0n);
      if (sum !== BigInt(model.dependencies))
        errors.push({
          line: g.line,
          column: 1,
          message: `This group totals ${sum}, but ${model.measure ?? 'dependencies'} is ${model.dependencies}. Add an Other/Unspecified item or adjust the counts.`,
        });
      for (const row of g.items)
        for (const child of row.includes) {
          if (child.count > row.count)
            errors.push({
              line: child.line,
              column: 5,
              message: `${child.label} (${child.count}) cannot exceed its parent ${row.label} (${row.count}).`,
            });
        }
    }
    return errors.length ? { ok: false, errors } : { ok: true, model };
  } catch (e) {
    if (e instanceof SyntaxProblem)
      return { ok: false, errors: [{ line: e.line, column: e.column, message: e.message }] };
    throw e;
  }
}
