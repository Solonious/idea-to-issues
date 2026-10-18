// Parser and checks for docs/specs/<epic>.md. The grammar lives in docs/CONTRACT.md.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SECTIONS = ['Problem', 'Proposed solution', 'Affected areas', 'Acceptance criteria', 'Validation', 'Dependencies', 'Risks', 'Notes for implementer'];
const EFFORTS = ['S', 'M', 'L', 'XL'];
const META_FIELDS = ['effort', 'blocked-by', 'covers'];
const CAP = 100;
const H1 = /^# \[([A-Z][A-Z0-9]*)\] (\S.*)$/;
const AC = /^- \*\*AC-([1-9]\d*)\*\* (.+?)(?: — verify: ?(.*))?$/;
const HEADING = /^### \[([A-Z][A-Z0-9]*)-([1-9]\d*)\] (\S.*)$/;
const FENCE_OPEN = /^(`{3,}|~{3,})/;
const TICKET_KEY = /^[A-Z][A-Z0-9]*-[1-9]\d*$/;
const AC_ID = /^AC-[1-9]\d*$/;

function epicFiles(dir) {
  if (!statSync(dir).isDirectory()) throw new Error(`${dir} is not a directory`);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name !== 'index.md' && statSync(join(dir, name)).isFile())
    .sort();
}

function parseMeta(line, t, epic, add) {
  const bad = (message) => add(t.metaLine, t.key, 'malformed-meta', message);
  const got = new Map();
  let last = -1;
  for (const part of line.split(' · ')) {
    const m = /^([a-z-]+): ?(.*)$/.exec(part);
    if (!m) { bad(`cannot read "${part}"`); continue; }
    const idx = META_FIELDS.indexOf(m[1]);
    if (idx < 0) bad(`unknown field "${m[1]}"`);
    else if (got.has(m[1])) bad(`duplicate field "${m[1]}"`);
    else {
      if (idx < last) bad(`field "${m[1]}" is out of order`);
      last = Math.max(last, idx);
      got.set(m[1], m[2]);
    }
  }
  const effort = got.get('effort');
  if (EFFORTS.includes(effort)) t.effort = effort;
  else add(t.metaLine, t.key, 'effort', effort === undefined ? 'missing effort' : `effort "${effort}" is not S, M, L or XL`);
  const list = (name, re) => {
    if (!got.has(name)) { bad(`missing ${name}`); return []; }
    const value = got.get(name);
    if (value === 'none') return [];
    const out = [];
    for (const item of value.split(', ')) {
      if (!re.test(item)) bad(item === 'none' ? `none combined with other ${name} entries` : `bad ${name} entry "${item}"`);
      else if (out.includes(item)) bad(`duplicate ${name} entry "${item}"`);
      else out.push(item);
    }
    return out;
  };
  t.blockedBy = list('blocked-by', TICKET_KEY);
  t.covers = list('covers', AC_ID).filter((id) => {
    const known = epic.acs.some((ac) => ac.id === id);
    if (!known) add(t.metaLine, t.key, 'unknown-ac', `${id} is not an AC of ${epic.key}`);
    return known;
  });
}

function checkSections(blk, add) {
  const { t } = blk;
  const seen = new Set();
  let last = -1;
  for (const { name, line } of blk.headings) {
    const idx = SECTIONS.indexOf(name);
    if (idx < 0) add(line, t.key, 'sections', `unknown section "${name}"`);
    else if (seen.has(name)) add(line, t.key, 'sections', `duplicate section "${name}"`);
    else if (idx < last) add(line, t.key, 'sections', `section "${name}" is out of order`);
    else last = idx;
    seen.add(name);
  }
  for (const name of SECTIONS) if (!seen.has(name)) add(t.line, t.key, 'sections', `missing section "${name}"`);
}

function parseFile(file, slug, text, ctx) {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd());
  const add = (line, key, rule, message) => ctx.findings.push({ file, line, key, rule, message });
  let i = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end < 0) { add(1, slug, 'epic-heading', 'unclosed front matter'); return null; }
    i = end + 1;
  }
  while (i < lines.length && lines[i] === '') i++;
  const h1 = H1.exec(lines[i] ?? '');
  if (!h1) {
    add(Math.min(i + 1, lines.length), slug, 'epic-heading', 'first line must be "# [KEY] <title>"');
    return null;
  }
  const epic = { key: h1[1], slug, title: h1[2], file, line: i + 1, acs: [], tickets: [] };
  let blk = null;
  let inTickets = false;
  let awaitMeta = false;
  let fence = null;
  let fenceLine = 0;

  const close = () => {
    if (!blk) return;
    const { t } = blk;
    if (awaitMeta) add(t.line, t.key, 'malformed-meta', 'missing meta line');
    awaitMeta = false;
    checkSections(blk, add);
    t.body = blk.body.join('\n').trim();
    t.sections = Object.fromEntries([...blk.secs].map(([name, sec]) => [name, sec.join('\n').trim()]));
    if (!blk.dup) epic.tickets.push(t);
    blk = null;
  };

  for (let n = i + 1; n < lines.length; n++) {
    const line = lines[n];
    const at = n + 1;
    if (fence) {
      if (line[0] === fence[0] && /^(`+|~+)$/.test(line) && line.length >= fence.length) fence = null;
    } else if (/^# /.test(line)) {
      add(at, epic.key, 'epic-heading', 'only one "# " heading is allowed');
      continue;
    } else if (/^## /.test(line) && inTickets) {
      close();
      add(at, epic.key, 'malformed-heading', '"## " heading after the first ticket');
      continue;
    } else if (line.startsWith('### ')) {
      close();
      inTickets = true;
      const m = HEADING.exec(line);
      if (!m) { add(at, epic.key, 'malformed-heading', 'expected "### [KEY-N] <title>"'); continue; }
      const t = { key: `${m[1]}-${m[2]}`, epic: epic.key, n: Number(m[2]), title: m[3], line: at, metaLine: null, effort: null, blockedBy: [], covers: [], sections: {}, body: '' };
      if (m[1] !== epic.key) add(at, t.key, 'foreign-key', `prefix ${m[1]} does not match epic ${epic.key}`);
      const dup = ctx.tickets.has(t.key);
      if (dup) add(at, t.key, 'duplicate-key', `${t.key} is already defined at ${ctx.tickets.get(t.key).line}`);
      else ctx.tickets.set(t.key, t);
      blk = { t, dup, headings: [], secs: new Map(), cur: null, body: [] };
      awaitMeta = true;
      continue;
    } else {
      const open = FENCE_OPEN.exec(line);
      if (open) { fence = open[1]; fenceLine = at; }
      if (!inTickets) {
        if (line.startsWith('- **AC-') && !open) {
          const m = AC.exec(line);
          if (!m) add(at, epic.key, 'malformed-ac', 'expected "- **AC-<n>** <text> — verify: <how>"');
          else if (epic.acs.some((ac) => ac.n === Number(m[1]))) add(at, `${epic.key} AC-${m[1]}`, 'duplicate-ac', `AC-${m[1]} is already defined`);
          else {
            epic.acs.push({ id: `AC-${m[1]}`, n: Number(m[1]), text: m[2], verify: (m[3] ?? '').trim(), line: at });
            if (!m[3]?.trim()) add(at, `${epic.key} AC-${m[1]}`, 'verify', 'AC has no "— verify:" text');
          }
        }
        continue;
      }
      if (!blk) continue;
      if (awaitMeta && line !== '') {
        awaitMeta = false;
        if (/^#{1,6} /.test(line)) add(blk.t.line, blk.t.key, 'malformed-meta', 'missing meta line');
        else {
          blk.t.metaLine = at;
          parseMeta(line, blk.t, epic, add);
          continue;
        }
      } else if (awaitMeta) continue;
      const s = /^#### (.+)$/.exec(line);
      if (s) {
        blk.headings.push({ name: s[1], line: at });
        blk.cur = s[1];
        if (!blk.secs.has(s[1])) blk.secs.set(s[1], []);
        blk.body.push(line);
        continue;
      }
    }
    if (blk) {
      blk.body.push(line);
      if (blk.cur) blk.secs.get(blk.cur).push(line);
    }
  }
  if (fence) add(fenceLine, blk?.t.key ?? epic.key, 'unclosed-fence', 'fence is never closed, so the rest of the file is unread');
  close();
  return epic;
}

export function parseSpecs(dir) {
  const files = epicFiles(dir);
  const ctx = { findings: [], tickets: new Map() };
  const epics = [];
  for (const name of files) {
    const epic = parseFile(join(dir, name), name.slice(0, -3), readFileSync(join(dir, name), 'utf8'), ctx);
    if (epic) epics.push(epic);
  }
  return { dir, files, epics, findings: ctx.findings };
}

export function checkSpecs(spec) {
  const findings = [...spec.findings];
  const add = (epic, line, key, rule, message) => findings.push({ file: epic.file, line, key, rule, message });
  const byKey = new Map();
  const owner = new Map();
  for (const epic of spec.epics) {
    for (const t of epic.tickets) { byKey.set(t.key, t); owner.set(t, epic); }
  }
  for (const epic of spec.epics) {
    const covered = new Set(epic.tickets.flatMap((t) => t.covers));
    for (const ac of epic.acs) {
      if (!covered.has(ac.id)) add(epic, ac.line, `${epic.key} ${ac.id}`, 'coverage', `${ac.id} is not covered by any ticket`);
    }
    if (epic.tickets.length > CAP) add(epic, epic.line, epic.key, 'cap', `${epic.tickets.length} tickets, GitHub allows ${CAP} sub-issues`);
  }
  const edges = new Map();
  for (const t of byKey.values()) {
    edges.set(t, t.blockedBy.filter((b) => {
      if (byKey.has(b)) return true;
      add(owner.get(t), t.metaLine ?? t.line, t.key, 'unknown-blocker', `blocker ${b} does not exist`);
      return false;
    }));
  }
  const state = new Map();
  const stack = [];
  const order = [];
  const visit = (t) => {
    state.set(t, 'grey');
    stack.push(t.key);
    for (const b of edges.get(t)) {
      const bt = byKey.get(b);
      if (state.get(bt) === 'grey') add(owner.get(t), t.metaLine ?? t.line, t.key, 'cycle', [...stack.slice(stack.indexOf(b)), b].join(' → '));
      else if (!state.has(bt)) visit(bt);
    }
    stack.pop();
    state.set(t, 'black');
    order.push(t);
  };
  for (const t of byKey.values()) if (!state.has(t)) visit(t);
  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return { findings, order };
}

export function renderTable(order) {
  const list = (items) => (items.length ? items.join(', ') : '—');
  const rows = order.map((t) => `| ${t.epic} | [${t.key}] ${t.title.replaceAll('|', '\\|')} | ${t.effort} | ${list(t.blockedBy)} | ${list(t.covers)} |`);
  return ['| Epic | Ticket | Effort | Blocked by | Covers |', '|---|---|---|---|---|', ...rows].join('\n') + '\n';
}

export function formatFinding(f) {
  return `${f.file}:${f.line}: [${f.key}] ${f.rule}: ${f.message}`;
}
