// File mode: read what GitHub holds, plan the writes still missing, perform them in order.
// There is no state file; the key -> number map is rebuilt from issue titles on every run.
import { gh, list, readIssues } from './github.mjs';

function readGithub(root, need) {
  const { groups } = readIssues(root, 'number,title,parent,blockedBy,projectItems');
  const labels = new Set(list(root, 'label', ['--json', 'name']).map((l) => l.name));
  for (const key of need) {
    const g = groups.get(key);
    if (g?.length > 1) throw new Error(`${key} is held by ${g.map((i) => `#${i.number}`).join(' and ')}: close or retitle one, then run again`);
  }
  return { held: new Map([...groups].map(([k, g]) => [k, g[0]])), labels };
}

const ref = (numbers, key) => (numbers.has(key) ? `#${numbers.get(key)}` : `<${key}>`);

function num(numbers, key) {
  if (!numbers.has(key)) throw new Error(`no issue number known for ${key}`);
  return numbers.get(key);
}

// One entry per gh mutation, in the order they must run.
export function planFile(root, spec, order, project) {
  const epics = new Map(spec.epics.map((e) => [e.key, e]));
  const { held, labels } = readGithub(root, [...epics.keys(), ...order.map((t) => t.key)]);
  const numbers = new Map([...held].map(([k, i]) => [k, i.number]));
  const writes = [];
  let existing = 0;
  for (const e of spec.epics) {
    const i = held.get(e.key);
    if (!i) writes.push({ kind: 'create', key: e.key, title: `[${e.key}] ${e.title}`, labels: [`epic:${e.slug}`], epic: e, project });
    else {
      existing++;
      if (project && !(i.projectItems ?? []).some((p) => p.title === project)) writes.push({ kind: 'edit', key: e.key, number: i.number, project });
    }
  }
  for (const t of order) {
    const i = held.get(t.key);
    const epic = epics.get(t.epic);
    if (!i) {
      writes.push({ kind: 'create', key: t.key, title: `[${t.key}] ${t.title}`, labels: [`effort:${t.effort}`, `epic:${epic.slug}`], t, parent: epic.key, blockedBy: t.blockedBy });
      continue;
    }
    existing++;
    const have = new Set((i.blockedBy?.nodes ?? []).map((n) => n.number));
    const parent = i.parent ? undefined : epic.key;
    const missing = t.blockedBy.filter((b) => !have.has(numbers.get(b)));
    if (parent || missing.length > 0) writes.push({ kind: 'edit', key: t.key, number: i.number, parent, addBlockedBy: missing });
  }
  const wanted = [...new Set(writes.flatMap((w) => w.labels ?? []))].filter((l) => !labels.has(l));
  return { writes: [...wanted.map((name) => ({ kind: 'label', name })), ...writes], existing, numbers };
}

function body(w, numbers) {
  if (w.epic) return `Tracking issue. Do not implement directly; the work is in its sub-issues.\n\n## Acceptance criteria\n\n${w.epic.acs.map((ac) => `- **${ac.id}** ${ac.text} — verify: ${ac.verify}`).join('\n')}\n`;
  const dep = w.blockedBy.length > 0 ? `⛓ Depends on: ${w.blockedBy.map((k) => `#${num(numbers, k)} (${k})`).join(', ')}.` : '';
  const sections = Object.entries(w.t.sections).map(([name, text]) => {
    const full = name === 'Dependencies' ? [dep, text].filter(Boolean).join('\n\n') : text;
    return full ? `## ${name}\n\n${full}` : `## ${name}`;
  });
  return `${sections.join('\n\n')}\n`;
}

export function describe(w, numbers) {
  if (w.kind === 'label') return `label create ${w.name}`;
  const refs = (keys) => (keys.length > 0 ? keys.map((k) => ref(numbers, k)).join(', ') : 'none');
  if (w.kind === 'create') {
    const parts = [`issue create ${w.title}`, `labels: ${w.labels.join(', ')}`];
    if (w.project) parts.push(`project: ${w.project}`);
    if (w.parent) parts.push(`parent: ${ref(numbers, w.parent)}`, `blocked-by: ${refs(w.blockedBy)}`);
    return parts.join(' · ');
  }
  const parts = [`issue edit #${w.number} [${w.key}]`];
  if (w.parent) parts.push(`parent: ${ref(numbers, w.parent)}`);
  if (w.addBlockedBy?.length > 0) parts.push(`add blocked-by: ${refs(w.addBlockedBy)}`);
  if (w.project) parts.push(`add project: ${w.project}`);
  return parts.join(' · ');
}

// Runs one write. A create records the number gh prints, so later writes can link to it.
export function perform(root, w, numbers) {
  const ids = (keys) => keys.map((k) => num(numbers, k)).join(',');
  if (w.kind === 'label') {
    gh(root, ['label', 'create', w.name]);
    return undefined;
  }
  if (w.kind === 'edit') {
    const args = ['issue', 'edit', String(w.number)];
    if (w.parent) args.push('--parent', String(num(numbers, w.parent)));
    if (w.addBlockedBy?.length > 0) args.push('--add-blocked-by', ids(w.addBlockedBy));
    if (w.project) args.push('--add-project', w.project);
    gh(root, args);
    return undefined;
  }
  const args = ['issue', 'create', '--title', w.title, '--body-file', '-', ...w.labels.flatMap((l) => ['--label', l])];
  if (w.parent) args.push('--parent', String(num(numbers, w.parent)));
  if (w.blockedBy?.length > 0) args.push('--blocked-by', ids(w.blockedBy));
  if (w.project) args.push('--project', w.project);
  const out = gh(root, args, body(w, numbers));
  const n = /\/issues\/(\d+)\s*$/.exec(out)?.[1];
  if (!n) throw new Error(`created ${w.key}, but no issue number could be read from gh's output: ${out.trim()}`);
  numbers.set(w.key, Number(n));
  return Number(n);
}
