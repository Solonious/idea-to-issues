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
// A real `gh issue list --state all --json number,title,parent,blockedBy,projectItems` of this repository,
// so the stub cannot drift from what gh returns. Its [CORE] issues are the graph of fixtures/core.
const CAPTURE = join(FIXTURES, 'gh/issue-list.json');

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

// A repository with gates 0, 1 and 2 approved, the given spec fixtures committed and, unless `approve` is false, gate 3 approved and pushed.
function approvedChain(t, { specs = ['core/core.md'], approve = true } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-verify-'));
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
  write(repo, 'docs/CONCEPT.md', '# Concept\n\nA tool for people who forget their plants.\n');
  commit(repo, 'concept');
  stamp(repo, 'concept');
  write(repo, 'docs/blueprint.md', '# Blueprint\n\nOne web app and one API.\n');
  commit(repo, 'blueprint');
  stamp(repo, 'blueprint');
  for (const spec of specs) {
    mkdirSync(join(repo, 'docs/specs'), { recursive: true });
    copyFileSync(join(FIXTURES, spec), join(repo, 'docs/specs', spec.split('/')[1]));
  }
  commit(repo, 'specs');
  write(repo, 'docs/specs/index.md', `# Epic order\n\n${specs.map((s, k) => `${k + 1}. ${s.split('/')[1].slice(0, -3)}`).join('\n')}\n`);
  commit(repo, 'index');
  if (approve) stamp(repo, 'tickets');
  git(repo, 'push', '--quiet');
  return { repo, tmp, state: join(tmp, 'gh.json') };
}

function run(ctx, mode, args, extra = {}) {
  const env = { ...ENV, PATH: `${STUB}:${process.env.PATH}`, GH_STUB_STATE: ctx.state, ...extra };
  return spawnSync(process.execPath, [BIN, mode, ...args], { cwd: ctx.repo, env, encoding: 'utf8' });
}

const state = (ctx) => (existsSync(ctx.state) ? JSON.parse(readFileSync(ctx.state, 'utf8')) : { issues: [], labels: [], writes: [] });

// The captured listing, changed by `edit`, as the env that makes the stub answer with it.
function listing(ctx, edit = () => {}) {
  const issues = JSON.parse(readFileSync(CAPTURE, 'utf8'));
  edit((n) => issues.find((i) => i.number === n), issues);
  const path = join(ctx.tmp, 'listing.json');
  writeFileSync(path, JSON.stringify(issues));
  return { GH_STUB_LISTING: path };
}

test('the captured listing of this repository holds every key of its spec once, with its parent and blockers', (t) => {
  const ctx = approvedChain(t);
  const r = run(ctx, 'verify', [], listing(ctx));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'verify: 1 epic(s), 5 ticket(s); GitHub holds each key once, with its parent and blockers\n');
  assert.equal(state(ctx).writes.length, 0);
});

const DEFECTS = [
  ['a missing key', (issue, issues) => issues.splice(issues.indexOf(issue(7)), 1), '[CORE-3] missing-issue: no issue holds CORE-3'],
  ['a duplicate key', (issue, issues) => issues.push({ ...issue(8), number: 14 }), '[CORE-4] duplicate-issue: CORE-4 held by #8 and #14'],
  ['a missing parent', (issue) => (issue(5).parent = null), '[CORE-2] parent: #5 has no parent, expected #1 (CORE)'],
  ['a wrong parent', (issue) => (issue(6).parent = issue(9).parent), '[CORE-5] parent: #6 has parent #2, expected #1 (CORE)'],
  ['a missing native blocker', (issue) => {
    const { blockedBy } = issue(7);
    blockedBy.nodes = blockedBy.nodes.filter((n) => n.number !== 6);
    blockedBy.totalCount = blockedBy.nodes.length;
  }, '[CORE-3] missing-blocker: #7 is not blocked by #6 (CORE-5)'],
];

for (const [name, edit, defect] of DEFECTS) {
  test(`${name} exits 1 and names the defect`, (t) => {
    const ctx = approvedChain(t);
    const r = run(ctx, 'verify', [], listing(ctx, edit));
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.stderr, `${defect}\nverify: 1 defect(s)\n`);
    assert.equal(r.stdout, '');
    assert.equal(state(ctx).writes.length, 0);
  });
}

test('verify passes after file --apply, and names every link a filing without links left out', (t) => {
  const specs = ['valid/auth.md', 'valid/billing.md'];
  const filed = approvedChain(t, { specs });
  assert.equal(run(filed, 'file', ['--apply']).status, 0);
  let r = run(filed, 'verify', []);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^verify: 2 epic\(s\), 5 ticket\(s\); GitHub holds each key once/);

  const unlinked = approvedChain(t, { specs });
  assert.equal(run(unlinked, 'file', ['--apply'], { GH_STUB_UNLINKED: '1' }).status, 0);
  const made = state(unlinked).writes.length;
  r = run(unlinked, 'verify', []);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^\[AUTH-2\] parent: #4 has no parent, expected #1 \(AUTH\)$/m);
  assert.match(r.stderr, /^\[AUTH-2\] missing-blocker: #4 is not blocked by #3 \(AUTH-1\)$/m);
  assert.match(r.stderr, /^\[BILL-1\] missing-blocker: #6 is not blocked by #4 \(AUTH-2\)$/m);
  assert.match(r.stderr, /^verify: 10 defect\(s\)$/m);
  assert.equal(state(unlinked).writes.length, made);
});

test('--wait returns once two consecutive polls agree', (t) => {
  const ctx = approvedChain(t);
  const r = run(ctx, 'verify', ['--wait', '--interval', '0.01'], { ...listing(ctx), GH_STUB_SETTLE: '2' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^verify: the listing settled after 4 polls$/m);
  assert.match(r.stdout, /^verify: 1 epic\(s\), 5 ticket\(s\)/m);
  assert.equal(state(ctx).lists, 4);
  assert.equal(state(ctx).writes.length, 0);
});

test('--wait gives up at its timeout and verifies nothing', (t) => {
  const ctx = approvedChain(t);
  const r = run(ctx, 'verify', ['--wait', '--interval', '0.01', '--timeout', '0.2'], { ...listing(ctx), GH_STUB_SETTLE: '100000' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^i2i verify: no two consecutive polls agreed in 0\.2s \(\d+ poll\(s\)\), so nothing was verified: run verify --wait again$/m);
  assert.doesNotMatch(r.stderr, /defect/);
  assert.equal(r.stdout, '');
});

test('verify refuses without gate 3, and on a listing that is truncated', (t) => {
  const ctx = approvedChain(t, { approve: false });
  let r = run(ctx, 'verify', [], listing(ctx));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/specs\/index\.md is not approved/);
  assert.match(r.stderr, /verify: may not run \(1 problem\(s\)\)/);

  const approved = approvedChain(t);
  r = run(approved, 'verify', [], { GH_STUB_TRUNCATE: '1' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /may be truncated/);
  r = run(approved, 'verify', [], listing(approved, (issue) => (issue(7).blockedBy.totalCount = 3)));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /only part of the blockers of #7/);
});

test('verify rejects stray, repeated and bad options with usage and exit 2', (t) => {
  const ctx = approvedChain(t);
  for (const args of [['--interval', '1'], ['--timeout', '1'], ['--wait', '--wait'], ['--wait', '--interval'], ['--wait', '--interval', '0'], ['--wait', '--timeout', '-1'], ['--wait', '--timeout', '1', '--timeout', '2'], ['--wait', '--interval', 'soon'], ['--bogus'], ['docs']]) {
    const r = run(ctx, 'verify', args, listing(ctx));
    assert.equal(r.status, 2, args.join(' '));
    assert.equal(r.stderr, 'Usage: i2i verify [--wait] [--interval <s>] [--timeout <s>]\n');
  }
});
