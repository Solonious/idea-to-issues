import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/i2i.mjs', import.meta.url));
const STUB = fileURLToPath(new URL('./stub-gh', import.meta.url));
const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const DESIGN_INDEX = '# Design: Plants\n\n## Inventory\n\n| Screen | Id | Basis | Purpose |\n|---|---|---|---|\n| Home | `home` | Ruling 6 | the plant list |\n';
const PROTOTYPE = '<!doctype html>\n<html><body><section data-screen="home"><div data-state="empty"></div><div data-state="filled">Plants</div><div data-state="error"></div></section></body></html>\n';
const KEYS = ['AUTH', 'BILL', 'AUTH-1', 'AUTH-2', 'AUTH-3', 'BILL-1', 'BILL-2'];

// Git isolated from the user's configuration, so signing or hooks there cannot break a test commit.
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_TERMINAL_PROMPT: '0',
};

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, env: ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function write(repo, path, text) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
}

function commit(repo, message) {
  git(repo, 'add', '-A');
  git(repo, 'commit', '--quiet', '-m', message);
}

function stamp(repo, gate) {
  const r = spawnSync(process.execPath, [BIN, 'gate', 'stamp', gate], { cwd: repo, env: ENV, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  commit(repo, `approve ${gate}`);
}

// A repository with every gate up to 2 approved, the given spec fixtures committed and, unless `approve` is false, gate 3 approved and pushed.
function approvedChain(t, { specs = ['valid/auth.md', 'valid/billing.md'], approve = true } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-file-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const repo = join(tmp, 'repo');
  git(tmp, 'init', '--quiet', '-b', 'main', repo);
  write(repo, 'README.md', '# Product\n');
  commit(repo, 'init');
  git(tmp, 'init', '--quiet', '--bare', '-b', 'main', join(tmp, 'origin.git'));
  git(repo, 'remote', 'add', 'origin', join(tmp, 'origin.git'));
  git(repo, 'push', '--quiet', '-u', 'origin', 'main');
  write(repo, 'docs/brainstorm/summary.md', '# Brainstorm summary: Plants\n\nA reminder per plant.\n');
  commit(repo, 'brainstorm');
  stamp(repo, 'brainstorm');
  write(repo, 'docs/CONCEPT.md', readFileSync(join(FIXTURES, 'stack/valid/CONCEPT.md'), 'utf8'));
  commit(repo, 'concept');
  stamp(repo, 'concept');
  write(repo, 'docs/stack.md', readFileSync(join(FIXTURES, 'stack/valid/stack.md'), 'utf8'));
  commit(repo, 'stack');
  stamp(repo, 'stack');
  write(repo, 'docs/design/index.md', DESIGN_INDEX);
  write(repo, 'docs/design/prototype.html', PROTOTYPE);
  commit(repo, 'design');
  stamp(repo, 'design');
  write(repo, 'docs/blueprint.md', '# Blueprint\n\nOne web app and one API.\n');
  commit(repo, 'blueprint');
  stamp(repo, 'blueprint');
  for (const spec of specs) {
    mkdirSync(join(repo, 'docs/specs'), { recursive: true });
    copyFileSync(join(FIXTURES, spec), join(repo, 'docs/specs', spec.split('/')[1]));
  }
  commit(repo, 'specs');
  write(repo, 'docs/specs/index.md', '# Epic order\n\n1. auth\n2. billing\n');
  commit(repo, 'index');
  if (approve) stamp(repo, 'tickets');
  git(repo, 'push', '--quiet');
  return { repo, state: join(tmp, 'gh.json') };
}

function file(ctx, args, extra = {}) {
  const env = { ...ENV, PATH: `${STUB}:${process.env.PATH}`, GH_STUB_STATE: ctx.state, ...extra };
  return spawnSync(process.execPath, [BIN, 'file', ...args], { cwd: ctx.repo, env, encoding: 'utf8' });
}

const state = (ctx) => (existsSync(ctx.state) ? JSON.parse(readFileSync(ctx.state, 'utf8')) : { issues: [], labels: [], writes: [] });
const byKey = (ctx, key) => state(ctx).issues.filter((i) => i.title.startsWith(`[${key}]`));
const lineOf = (stdout, text) => stdout.split('\n').findIndex((l) => l.includes(text));

test('--dry-run lists labels, then epics, then tickets with blockers first, and writes nothing', (t) => {
  const ctx = approvedChain(t);
  const r = file(ctx, ['--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^file: 2 epic\(s\), 5 ticket\(s\); 0 already on GitHub$/m);
  assert.match(r.stdout, /^file: dry run, 13 write\(s\) planned, none made$/m);
  assert.match(r.stderr, /note: no --project given/);
  const at = (text) => lineOf(r.stdout, text);
  assert.ok(at('label create effort:XL') < at('issue create [AUTH] '));
  assert.ok(at('issue create [BILL] ') < at('issue create [AUTH-1]'));
  assert.ok(at('issue create [AUTH-1]') < at('issue create [AUTH-2]'));
  assert.ok(at('issue create [AUTH-2]') < at('issue create [BILL-1]'));
  assert.match(r.stdout, /issue create \[AUTH-2\] Session cookie · labels: effort:M, epic:auth · parent: <AUTH> · blocked-by: <AUTH-1>/);
  assert.equal(state(ctx).writes.length, 0);
});

test('--apply --limit stops and a re-run completes; a third run writes nothing', (t) => {
  const ctx = approvedChain(t);
  let r = file(ctx, ['--apply', '--limit', '3']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^file: stopped after 3 write\(s\), 10 remaining: run file --apply again$/m);
  assert.equal(state(ctx).writes.length, 3);
  r = file(ctx, ['--apply']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^file: 10 write\(s\) made$/m);
  for (const key of KEYS) assert.equal(byKey(ctx, key).length, 1, key);
  r = file(ctx, ['--apply']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GitHub already holds every key/);
  assert.equal(state(ctx).writes.length, 13);
});

test('a write that fails midway leaves no duplicates after a re-run', (t) => {
  const ctx = approvedChain(t);
  let r = file(ctx, ['--apply'], { GH_STUB_FAIL_AT: '9' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /i2i file: write 9 failed: stub gh: injected failure/);
  assert.match(r.stderr, /file: 8 write\(s\) made before the failure: run file --apply again/);
  r = file(ctx, ['--apply']);
  assert.equal(r.status, 0, r.stderr);
  for (const key of KEYS) assert.equal(byKey(ctx, key).length, 1, key);
});

test('issues created without their links are repaired by issue edit alone', (t) => {
  const ctx = approvedChain(t);
  let r = file(ctx, ['--apply', '--project', 'Roadmap'], { GH_STUB_UNLINKED: '1' });
  assert.equal(r.status, 0, r.stderr);
  const made = state(ctx).writes.length;
  assert.ok(state(ctx).issues.every((i) => i.parent === null && i.projects.length === 0));
  r = file(ctx, ['--apply', '--project', 'Roadmap']);
  assert.equal(r.status, 0, r.stderr);
  const later = state(ctx).writes.slice(made);
  assert.equal(later.length, 7);
  assert.ok(later.every((w) => w[0] === 'issue' && w[1] === 'edit'), JSON.stringify(later));
  for (const key of ['AUTH', 'BILL']) assert.deepEqual(byKey(ctx, key)[0].projects, ['Roadmap']);
  const num = (key) => byKey(ctx, key)[0].number;
  for (const key of KEYS.slice(2)) assert.equal(byKey(ctx, key)[0].parent, num(key.split('-')[0]), key);
  assert.deepEqual(byKey(ctx, 'AUTH-3')[0].blockedBy, [num('AUTH-1'), num('AUTH-2')]);
  r = file(ctx, ['--apply', '--project', 'Roadmap']);
  assert.match(r.stdout, /GitHub already holds every key/);
});

test('a listing at its limit is refused before any write', (t) => {
  const ctx = approvedChain(t);
  for (const mode of ['--dry-run', '--apply']) {
    const r = file(ctx, [mode], { GH_STUB_TRUNCATE: '1' });
    assert.equal(r.status, 1, mode);
    assert.match(r.stderr, /may be truncated/);
  }
  assert.equal(state(ctx).writes.length, 0);
});

test('a key held by two issues is refused before any write', (t) => {
  const ctx = approvedChain(t);
  write(dirname(ctx.state), 'gh.json', JSON.stringify({ next: 3, labels: [], writes: [], attempts: 0, issues: [1, 2].map((number) => ({ number, title: `[AUTH-1] twice ${number}`, state: 'OPEN', body: '', labels: [], parent: null, blockedBy: [], projects: [] })) }));
  const r = file(ctx, ['--apply']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /AUTH-1 is held by #1 and #2: close or retitle one, then run again/);
  assert.equal(state(ctx).writes.length, 0);
});

test('file refuses without gate 3, after an edit, or on a spec that fails check', (t) => {
  const ctx = approvedChain(t, { approve: false });
  let r = file(ctx, ['--apply']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/specs\/index\.md is not approved/);
  assert.match(r.stderr, /file: may not run \(1 problem\(s\)\)/);
  assert.equal(state(ctx).writes.length, 0);

  const edited = approvedChain(t);
  write(edited.repo, 'docs/specs/auth.md', `${readFileSync(join(edited.repo, 'docs/specs/auth.md'), 'utf8')}\nAn edit.\n`);
  r = file(edited, ['--apply']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /changed after docs\/specs\/index\.md was approved/);
  assert.equal(state(edited).writes.length, 0);

  const cyclic = approvedChain(t, { specs: ['cycle/auth.md'] });
  r = file(cyclic, ['--apply']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cycle/);
  assert.match(r.stderr, /file: check found \d+ finding\(s\)/);
  assert.equal(state(cyclic).writes.length, 0);
});

test('--apply gives every issue its labels, parent, blockers and dependency line', (t) => {
  const ctx = approvedChain(t);
  const r = file(ctx, ['--apply']);
  assert.equal(r.status, 0, r.stderr);
  const one = (key) => byKey(ctx, key)[0];
  assert.deepEqual(one('AUTH').labels, ['epic:auth']);
  assert.deepEqual(one('BILL').labels, ['epic:billing']);
  assert.match(one('AUTH').body, /^Tracking issue\./);
  assert.match(one('AUTH').body, /- \*\*AC-2\*\* A session survives a page reload — verify: the cookie test passes/);
  const tickets = { 'AUTH-1': ['S', 'AUTH', []], 'AUTH-2': ['M', 'AUTH', ['AUTH-1']], 'AUTH-3': ['L', 'AUTH', ['AUTH-1', 'AUTH-2']], 'BILL-1': ['XL', 'BILL', ['AUTH-2']], 'BILL-2': ['S', 'BILL', ['BILL-1']] };
  for (const [key, [effort, epic, blockers]] of Object.entries(tickets)) {
    const i = one(key);
    assert.deepEqual(i.labels, [`effort:${effort}`, `epic:${epic === 'AUTH' ? 'auth' : 'billing'}`], key);
    assert.equal(i.parent, one(epic).number, key);
    assert.deepEqual(i.blockedBy, blockers.map((b) => one(b).number), key);
  }
  assert.ok(one('AUTH-2').body.includes(`## Dependencies\n\n⛓ Depends on: #${one('AUTH-1').number} (AUTH-1).\n\nPlaceholder text for dependencies.`));
  assert.ok(!one('AUTH-1').body.includes('⛓'));
});

test('file rejects a missing or conflicting mode, a stray limit and a bad limit with usage and exit 2', (t) => {
  const ctx = approvedChain(t);
  for (const args of [[], ['--dry-run', '--apply'], ['--dry-run', '--limit', '2'], ['--apply', '--limit', '0'], ['--apply', '--limit'], ['--apply', 'docs'], ['--apply', '--bogus'], ['--dry-run', '--project', '--apply']]) {
    const r = file(ctx, args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, /^Usage: i2i file --dry-run \| --apply \[--limit N\] \[--project <title>\]$/m);
  }
  assert.equal(state(ctx).writes.length, 0);
});
