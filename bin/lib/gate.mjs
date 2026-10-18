// Gate stamps: approval front matter on the stage documents, and the check a stage runs before it starts.
// There is no state file; the front matter is the state.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Every stage in order. A gated stage's document carries the stamp; `file` is not a stage of its own,
// it names the filing step, which needs gate 3.
export const STAGES = {
  concept: { doc: 'docs/CONCEPT.md', gate: true },
  blueprint: { doc: 'docs/blueprint.md', gate: true, upstream: 'concept' },
  specs: { doc: 'docs/specs', upstream: 'blueprint' },
  tickets: { doc: 'docs/specs/index.md', gate: true, upstream: 'specs' },
  file: { upstream: 'tickets' },
};

const OWN_KEYS = ['approved', 'digest', 'based-on'];
const OWN_KEY_LINE = new RegExp(`^(${OWN_KEYS.join('|')}):`);
const BASED_ON = /^(\S+)@([0-9a-f]{40}|[0-9a-f]{64})$/;

function git(root, args) {
  return spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
}

export function repoRoot(cwd) {
  const r = spawnSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : undefined;
}

// A gate name, or the path of a gate's document relative to the working directory.
export function resolveGate(root, cwd, target) {
  if (STAGES[target]?.gate) return target;
  const rel = relative(root, resolve(cwd, target)).split('\\').join('/');
  return Object.keys(STAGES).find((name) => STAGES[name].gate && STAGES[name].doc === rel);
}

// The path a stage's `based-on` pins, and the pathspec that diffs it without the stamped document itself.
function pinOf(name) {
  const up = STAGES[STAGES[name].upstream];
  if (!up) return undefined;
  const own = STAGES[name].doc;
  return { path: up.doc, spec: own.startsWith(`${up.doc}/`) ? [up.doc, `:(exclude)${own}`] : [up.doc] };
}

// The gated stages a stage builds on, from the root down.
function gatesBefore(name) {
  const out = [];
  for (let s = STAGES[name].upstream; s; s = STAGES[s].upstream) if (STAGES[s].gate) out.unshift(s);
  return out;
}

function readDoc(file) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const keys = {};
  if (lines[0] !== '---') return { front: [], keys, body: text };
  const close = lines.indexOf('---', 1);
  if (close < 0) throw new Error('the front matter opened on line 1 is never closed');
  const front = [];
  for (const line of lines.slice(1, close)) {
    const m = OWN_KEY_LINE.exec(line);
    if (m) keys[m[1]] = line.slice(m[0].length).trim();
    else front.push(line);
  }
  return { front, keys, body: lines.slice(close + 1).join('\n') };
}

function digest(body) {
  return `sha256:${createHash('sha256').update(body).digest('hex')}`;
}

function today() {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}

function untracked(root, spec) {
  return git(root, ['ls-files', '--others', '--exclude-standard', '--', ...spec]).stdout.split('\n').filter(Boolean);
}

// Uncommitted changes under a pathspec, untracked files included.
function dirty(root, spec) {
  return git(root, ['diff', '--quiet', 'HEAD', '--', ...spec]).status !== 0 || untracked(root, spec).length > 0;
}

function checkGate(root, name, problems) {
  const { doc } = STAGES[name];
  const again = `/idea-to-issues:approve ${name}`;
  if (!existsSync(join(root, doc))) {
    problems.push(`${doc} does not exist: the ${name} stage has not run`);
    return;
  }
  let fm;
  try {
    fm = readDoc(join(root, doc));
  } catch (err) {
    problems.push(`${doc}: ${err.message}`);
    return;
  }
  if (!fm.keys.approved) {
    problems.push(`${doc} is not approved: review it, then run ${again}`);
    return;
  }
  if (fm.keys.digest !== digest(fm.body)) {
    problems.push(`${doc} was edited after its approval on ${fm.keys.approved}: review it, then run ${again} again`);
  }
  const pin = pinOf(name);
  if (!pin) return;
  const m = BASED_ON.exec(fm.keys['based-on'] ?? '');
  if (!m || m[1] !== pin.path) {
    problems.push(`${doc} has no valid "based-on: ${pin.path}@<sha>" line: run ${again} again`);
    return;
  }
  const sha = m[2];
  if (git(root, ['rev-parse', '--verify', '--quiet', `${sha}^{commit}`]).status !== 0) {
    problems.push(`${doc} is based on commit ${sha}, which this repository does not have`);
    return;
  }
  const diff = git(root, ['diff', '--quiet', sha, '--', ...pin.spec]);
  const added = untracked(root, pin.spec);
  if (diff.status === 0 && added.length === 0) return;
  if (diff.status > 1) {
    problems.push(`git diff failed on ${pin.path}: ${diff.stderr.trim()}`);
    return;
  }
  const stat = [git(root, ['diff', '--stat', sha, '--', ...pin.spec]).stdout.trimEnd(), ...added.map((f) => ` ${f} (untracked)`)]
    .filter(Boolean)
    .join('\n');
  problems.push(`${pin.path} changed after ${doc} was approved (based on ${sha.slice(0, 7)}):\n${stat}\n  review ${doc}, then run ${again} again`);
}

// Edits on the remote that this checkout has not pulled. `git fetch` does not touch the working tree,
// so a document edited on GitHub is visible only through the upstream branch.
function checkRemote(root, gates, problems, notes) {
  const fetch = git(root, ['fetch', '--quiet']);
  if (fetch.status !== 0) {
    problems.push(`git fetch failed, so edits on the remote cannot be checked: ${fetch.stderr.trim()}`);
    return;
  }
  const up = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (up.status !== 0) {
    notes.push('no upstream branch is configured, so edits on the remote were not checked');
    return;
  }
  const upstream = up.stdout.trim();
  const seen = new Set();
  for (const name of gates) {
    for (const { path, spec } of [{ path: STAGES[name].doc, spec: [STAGES[name].doc] }, pinOf(name)].filter(Boolean)) {
      if (seen.has(path)) continue;
      seen.add(path);
      const log = git(root, ['log', '--format=  %h %s', 'HEAD..@{u}', '--', ...spec]);
      if (log.status !== 0) problems.push(`git log failed on ${path}: ${log.stderr.trim()}`);
      else if (log.stdout.trim()) problems.push(`${path} changed on ${upstream} and this checkout does not have it:\n${log.stdout.trimEnd()}\n  pull, then run this again`);
    }
  }
}

// May `name` start? Every gated stage before it must be approved, unedited since, and current with what it was based on.
export function requireStage(root, name) {
  const gates = gatesBefore(name);
  const problems = [];
  const notes = [];
  if (gates.length === 0) return { gates, problems, notes };
  checkRemote(root, gates, problems, notes);
  for (const gate of gates) checkGate(root, gate, problems);
  return { gates, problems, notes };
}

// Approve a gate: write `approved`, `digest` and `based-on` into its document's front matter, nothing else.
export function stamp(root, name) {
  const { doc } = STAGES[name];
  const head = git(root, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']);
  if (head.status !== 0) return { problems: ['the repository has no commit yet: commit the documents, then approve'], notes: [] };
  if (!existsSync(join(root, doc))) return { problems: [`${doc} does not exist: the ${name} stage has not run`], notes: [] };
  const before = requireStage(root, name);
  if (before.problems.length > 0) return before;
  let fm;
  try {
    fm = readDoc(join(root, doc));
  } catch (err) {
    return { problems: [`${doc}: ${err.message}`], notes: before.notes };
  }
  const keys = { approved: today(), digest: digest(fm.body) };
  const pin = pinOf(name);
  if (pin) {
    if (dirty(root, pin.spec)) {
      return { problems: [`${pin.path} has uncommitted changes: commit them first, so based-on pins what you approved`], notes: before.notes };
    }
    keys['based-on'] = `${pin.path}@${head.stdout.trim()}`;
  }
  const front = [...fm.front, ...OWN_KEYS.filter((k) => keys[k]).map((k) => `${k}: ${keys[k]}`)];
  writeFileSync(join(root, doc), `---\n${front.join('\n')}\n---\n${fm.body}`);
  return { problems: [], notes: before.notes, doc, keys };
}
