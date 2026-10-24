import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/i2i.mjs', import.meta.url));
const APPROVE = fileURLToPath(new URL('../commands/approve.md', import.meta.url));
const CONCEPT = '# Concept\n\nA tool for people who forget their plants.\n';
const BLUEPRINT_BODY = '# Blueprint\n\nOne web app and one API.\n';
const SUMMARY = '# Brainstorm summary: Plants\n\nA reminder per plant.\n';
const SHA = /^[0-9a-f]{40}$/;

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

function i2i(cwd, ...args) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, env: ENV, encoding: 'utf8' });
}

function write(repo, path, text) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
}

const read = (repo, path) => readFileSync(join(repo, path), 'utf8');

function commit(repo, message) {
  git(repo, 'add', '-A');
  git(repo, 'commit', '--quiet', '-m', message);
}

function stamp(repo, gate) {
  const r = i2i(repo, 'gate', 'stamp', gate);
  assert.equal(r.status, 0, r.stderr);
  commit(repo, `approve ${gate}`);
}

// A clone of a bare origin. With `remote: false`, a lone repository with no upstream branch.
function setup(t, { remote = true } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-gate-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const repo = join(tmp, 'repo');
  git(tmp, 'init', '--quiet', '-b', 'main', repo);
  write(repo, 'README.md', '# Product\n');
  commit(repo, 'init');
  const origin = join(tmp, 'origin.git');
  if (remote) {
    git(tmp, 'init', '--quiet', '--bare', '-b', 'main', origin);
    git(repo, 'remote', 'add', 'origin', origin);
    git(repo, 'push', '--quiet', '-u', 'origin', 'main');
  }
  return { tmp, repo, origin };
}

// Gates 0, 1 and 2 approved, committed and pushed.
function approvedChain(t, opts) {
  const ctx = setup(t, opts);
  write(ctx.repo, 'docs/brainstorm/summary.md', SUMMARY);
  commit(ctx.repo, 'brainstorm');
  stamp(ctx.repo, 'brainstorm');
  write(ctx.repo, 'docs/CONCEPT.md', CONCEPT);
  commit(ctx.repo, 'concept');
  stamp(ctx.repo, 'concept');
  write(ctx.repo, 'docs/blueprint.md', BLUEPRINT_BODY);
  commit(ctx.repo, 'blueprint');
  stamp(ctx.repo, 'blueprint');
  if (opts?.remote !== false) git(ctx.repo, 'push', '--quiet');
  return ctx;
}

test('require fails while the upstream document is missing or unapproved, and passes once it is approved', (t) => {
  const { repo } = setup(t);
  write(repo, 'docs/brainstorm/summary.md', SUMMARY);
  commit(repo, 'brainstorm');
  stamp(repo, 'brainstorm');
  git(repo, 'push', '--quiet');
  let r = i2i(repo, 'gate', 'require', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md does not exist/);

  write(repo, 'docs/CONCEPT.md', CONCEPT);
  commit(repo, 'concept');
  git(repo, 'push', '--quiet');
  r = i2i(repo, 'gate', 'require', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md is not approved: review it, then run \/idea-to-issues:approve concept/);

  stamp(repo, 'concept');
  git(repo, 'push', '--quiet');
  r = i2i(repo, 'gate', 'require', 'blueprint');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^gate: blueprint may start \(checked brainstorm, concept\)$/m);
});

test('require concept fails while the brainstorm summary is missing, unapproved or edited after its approval, and passes once it is approved', (t) => {
  const { repo } = setup(t);
  let r = i2i(repo, 'gate', 'require', 'concept');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/brainstorm\/summary\.md does not exist: the brainstorm stage has not run/);

  write(repo, 'docs/brainstorm/summary.md', SUMMARY);
  commit(repo, 'brainstorm');
  git(repo, 'push', '--quiet');
  r = i2i(repo, 'gate', 'require', 'concept');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/brainstorm\/summary\.md is not approved: review it, then run \/idea-to-issues:approve brainstorm/);

  stamp(repo, 'brainstorm');
  git(repo, 'push', '--quiet');
  r = i2i(repo, 'gate', 'require', 'concept');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^gate: concept may start \(checked brainstorm\)$/m);

  write(repo, 'docs/brainstorm/summary.md', read(repo, 'docs/brainstorm/summary.md') + '\nAlso a mobile app.\n');
  r = i2i(repo, 'gate', 'require', 'concept');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/brainstorm\/summary\.md was edited after its approval on \d{4}-\d{2}-\d{2}/);
});

test('the brainstorm notes are not pinned: editing them after gate 0 disturbs no later gate', (t) => {
  const { repo } = approvedChain(t);
  write(repo, 'docs/brainstorm/notes.md', '# Brainstorm notes\n\n## 2026-10-24 — free\n\nMore ideas.\n');
  commit(repo, 'notes');
  git(repo, 'push', '--quiet');
  assert.equal(i2i(repo, 'gate', 'require', 'concept').status, 0);
  assert.equal(i2i(repo, 'gate', 'require', 'specs').status, 0);
});

test('require fails when the upstream document is edited after its own approval', (t) => {
  const { repo } = approvedChain(t);
  write(repo, 'docs/CONCEPT.md', read(repo, 'docs/CONCEPT.md') + '\nAlso a mobile app.\n');
  const r = i2i(repo, 'gate', 'require', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md was edited after its approval on \d{4}-\d{2}-\d{2}/);
});

test('require fails when the upstream is edited after the downstream approval, and names the change', (t) => {
  const { repo } = approvedChain(t);
  assert.equal(i2i(repo, 'gate', 'require', 'specs').status, 0);

  // The concept is edited and even re-approved, but the blueprint was approved against the old one.
  const { body } = splitFront(read(repo, 'docs/CONCEPT.md'));
  write(repo, 'docs/CONCEPT.md', `${body}\nAlso a mobile app.\n`);
  commit(repo, 'edit concept');
  stamp(repo, 'concept');
  git(repo, 'push', '--quiet');

  const r = i2i(repo, 'gate', 'require', 'specs');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md changed after docs\/blueprint\.md was approved \(based on [0-9a-f]{7}\)/);
  assert.match(r.stderr, /docs\/CONCEPT\.md \| \d+/);
  assert.match(r.stderr, /run \/idea-to-issues:approve blueprint again/);
  assert.doesNotMatch(r.stderr, /CONCEPT\.md was edited after its approval/);
});

test('require fails on an edit made on the remote only, and lists its commits', (t) => {
  const { tmp, repo, origin } = approvedChain(t);
  const other = join(tmp, 'other');
  git(tmp, 'clone', '--quiet', origin, other);
  write(other, 'docs/CONCEPT.md', read(other, 'docs/CONCEPT.md') + '\nEdited on GitHub.\n');
  commit(other, 'Update CONCEPT.md on GitHub');
  git(other, 'push', '--quiet');

  const r = i2i(repo, 'gate', 'require', 'specs');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md changed on origin\/main and this checkout does not have it:\n {2}[0-9a-f]+ Update CONCEPT\.md on GitHub/);
  assert.match(r.stderr, /pull, then run this again/);
  assert.equal(git(repo, 'status', '--porcelain'), '', 'the working tree is not touched');
});

test('with no upstream branch, require skips the remote half and says so', (t) => {
  const { repo } = approvedChain(t, { remote: false });
  const r = i2i(repo, 'gate', 'require', 'specs');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /note: no upstream branch is configured, so edits on the remote were not checked/);
  assert.match(r.stdout, /^gate: specs may start \(checked brainstorm, concept, blueprint\)$/m);
});

test('a failing fetch fails the gate', (t) => {
  const { tmp, repo } = approvedChain(t);
  git(repo, 'remote', 'set-url', 'origin', join(tmp, 'missing.git'));
  const r = i2i(repo, 'gate', 'require', 'specs');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /git fetch failed/);
});

test('stamp writes a based-on sha that git rev-parse confirms, and keeps the rest of the document', (t) => {
  const { repo } = setup(t);
  write(repo, 'docs/brainstorm/summary.md', SUMMARY);
  commit(repo, 'brainstorm');
  let r = i2i(repo, 'gate', 'stamp', 'brainstorm');
  assert.equal(r.status, 0, r.stderr);
  const summary = read(repo, 'docs/brainstorm/summary.md');
  assert.ok(summary.startsWith('---\napproved: '), summary);
  assert.doesNotMatch(summary, /based-on:/, 'the brainstorm has nothing upstream');
  commit(repo, 'approve brainstorm');
  write(repo, 'docs/CONCEPT.md', CONCEPT);
  commit(repo, 'concept');
  r = i2i(repo, 'gate', 'stamp', 'concept');
  assert.equal(r.status, 0, r.stderr);
  const concept = read(repo, 'docs/CONCEPT.md');
  assert.ok(concept.startsWith('---\napproved: '), concept);
  assert.ok(concept.endsWith(`\n---\n${CONCEPT}`), 'a document without front matter keeps its text byte for byte');
  assert.match(concept, /^based-on: docs\/brainstorm\/summary\.md@[0-9a-f]{40}$/m, 'the concept pins the brainstorm summary');
  commit(repo, 'approve concept');

  const original = `---\ntitle: Blueprint\nowner: Ann\n---\n${BLUEPRINT_BODY}`;
  write(repo, 'docs/blueprint.md', original);
  commit(repo, 'blueprint');
  const head = git(repo, 'rev-parse', 'HEAD');
  r = i2i(repo, 'gate', 'stamp', 'docs/blueprint.md');
  assert.equal(r.status, 0, r.stderr);

  const { front, body } = splitFront(read(repo, 'docs/blueprint.md'));
  assert.equal(body, BLUEPRINT_BODY);
  assert.deepEqual(front.slice(0, 2), ['title: Blueprint', 'owner: Ann']);
  assert.match(field(front, 'approved'), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(field(front, 'digest'), /^sha256:[0-9a-f]{64}$/);
  const [path, sha] = field(front, 'based-on').split('@');
  assert.equal(path, 'docs/CONCEPT.md');
  assert.match(sha, SHA);
  assert.equal(sha, head);
  assert.equal(git(repo, 'rev-parse', '--verify', `${sha}^{commit}`), sha);

  // A second stamp replaces the keys instead of stacking them.
  commit(repo, 'approve blueprint');
  r = i2i(repo, 'gate', 'stamp', 'blueprint');
  assert.equal(r.status, 0, r.stderr);
  const again = splitFront(read(repo, 'docs/blueprint.md'));
  assert.equal(again.body, BLUEPRINT_BODY);
  for (const key of ['approved', 'digest', 'based-on']) assert.equal(again.front.filter((l) => l.startsWith(`${key}:`)).length, 1, key);
  assert.equal(field(again.front, 'based-on'), `docs/CONCEPT.md@${git(repo, 'rev-parse', 'HEAD')}`);
});

test('stamp refuses an upstream with uncommitted changes', (t) => {
  const { repo } = setup(t);
  write(repo, 'docs/brainstorm/summary.md', SUMMARY);
  commit(repo, 'brainstorm');
  stamp(repo, 'brainstorm');
  write(repo, 'docs/CONCEPT.md', CONCEPT);
  write(repo, 'docs/blueprint.md', BLUEPRINT_BODY);
  commit(repo, 'docs');
  assert.equal(i2i(repo, 'gate', 'stamp', 'concept').status, 0);
  git(repo, 'push', '--quiet');

  // The concept stamp is not committed, so HEAD holds a concept without its approval.
  const r = i2i(repo, 'gate', 'stamp', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md has uncommitted changes: commit them first/);
  assert.equal(read(repo, 'docs/blueprint.md'), BLUEPRINT_BODY);
});

test('stamp refuses when the gates before it do not pass', (t) => {
  const { repo } = setup(t);
  write(repo, 'docs/CONCEPT.md', CONCEPT);
  write(repo, 'docs/blueprint.md', BLUEPRINT_BODY);
  commit(repo, 'docs');
  git(repo, 'push', '--quiet');
  const r = i2i(repo, 'gate', 'stamp', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md is not approved/);
  assert.match(r.stderr, /gate: blueprint is not approved/);
  assert.equal(read(repo, 'docs/blueprint.md'), BLUEPRINT_BODY);
});

test('stamp refuses on a repository with no commit yet', (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-gate-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  git(tmp, 'init', '--quiet', '-b', 'main', '.');
  write(tmp, 'docs/CONCEPT.md', CONCEPT);
  const r = i2i(tmp, 'gate', 'stamp', 'concept');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no commit yet/);
  assert.equal(read(tmp, 'docs/CONCEPT.md'), CONCEPT);
});

test('gate 3 pins the specs without its own document, and require file checks it', (t) => {
  const { repo } = approvedChain(t);
  write(repo, 'docs/specs/auth.md', '# [AUTH] Authentication\n');
  write(repo, 'docs/specs/index.md', '# Epic order\n\n1. auth\n');
  commit(repo, 'specs');
  stamp(repo, 'tickets');
  git(repo, 'push', '--quiet');
  assert.match(read(repo, 'docs/specs/index.md'), /^based-on: docs\/specs@[0-9a-f]{40}$/m);

  let r = i2i(repo, 'gate', 'require', 'file');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^gate: file may start \(checked brainstorm, concept, blueprint, tickets\)$/m);

  write(repo, 'docs/specs/billing.md', '# [BILL] Billing\n');
  r = i2i(repo, 'gate', 'require', 'file');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/specs changed after docs\/specs\/index\.md was approved/);
  assert.match(r.stderr, /docs\/specs\/billing\.md \(untracked\)/);

  commit(repo, 'add billing');
  r = i2i(repo, 'gate', 'require', 'file');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/specs\/billing\.md \| \d+/);
});

test('require fails on front matter that is never closed', (t) => {
  const { repo } = setup(t);
  write(repo, 'docs/CONCEPT.md', `---\napproved: 2026-01-01\n${CONCEPT}`);
  const r = i2i(repo, 'gate', 'require', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md: the front matter opened on line 1 is never closed/);
});

test('require brainstorm has nothing to check', (t) => {
  const { repo } = setup(t);
  const r = i2i(repo, 'gate', 'require', 'brainstorm');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^gate: brainstorm has no gate before it$/m);
});

test('gate usage errors exit 2', (t) => {
  const { tmp, repo } = setup(t);
  for (const args of [[], ['stamp'], ['require'], ['stamp', 'nope'], ['stamp', 'specs'], ['stamp', 'docs/other.md'], ['require', 'nope'], ['require', 'specs', 'extra'], ['approve', 'concept']]) {
    assert.equal(i2i(repo, 'gate', ...args).status, 2, args.join(' '));
  }
  const outside = join(tmp, 'outside');
  mkdirSync(outside);
  const r = spawnSync(process.execPath, [BIN, 'gate', 'require', 'blueprint'], { cwd: outside, env: { ...ENV, GIT_CEILING_DIRECTORIES: tmp }, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /is not inside a git repository/);
});

test('the approve command is user-only', () => {
  const text = readFileSync(APPROVE, 'utf8');
  const { front } = splitFront(text);
  assert.ok(front.includes('disable-model-invocation: true'), 'disable-model-invocation: true is in the front matter');
  assert.match(text, /i2i\.mjs gate stamp \$ARGUMENTS/);
});

function splitFront(text) {
  const lines = text.split('\n');
  assert.equal(lines[0], '---');
  const close = lines.indexOf('---', 1);
  assert.ok(close > 0, 'front matter is closed');
  return { front: lines.slice(1, close), body: lines.slice(close + 1).join('\n') };
}

function field(front, key) {
  const line = front.find((l) => l.startsWith(`${key}: `));
  assert.ok(line, `${key} is in the front matter`);
  return line.slice(key.length + 2);
}
