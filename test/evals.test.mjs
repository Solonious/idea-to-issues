import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = join(ROOT, 'bin/i2i.mjs');
const EVALS = join(ROOT, 'evals');
const CASES = readdirSync(EVALS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'lib' && e.name !== 'results')
  .map((e) => e.name);
const FREE = ['regex', 'tool_used', 'tool_order', 'file_exists'];

// Run a case's scaffold the way the eval runner does: an empty workspace and a minimal environment.
function scaffold(t, name) {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-eval-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const cwd = join(tmp, 'workspace');
  const home = join(tmp, 'home');
  mkdirSync(cwd);
  mkdirSync(home);
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: tmp, TERM: 'dumb' };
  const r = spawnSync('bash', [join(EVALS, name, 'scaffold.sh')], { cwd, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return { cwd, env };
}

const i2i = ({ cwd, env }, ...args) => spawnSync(process.execPath, [BIN, ...args], { cwd, env, encoding: 'utf8' });
const git = ({ cwd, env }, ...args) => spawnSync('git', args, { cwd, env, encoding: 'utf8' }).stdout.trim();

test('there are five eval cases', () => {
  assert.deepEqual([...CASES].sort(), ['cyclic-graph', 'no-artifact-tool', 'prototype-edited', 'stack-findings', 'upstream-edited']);
});

test('upstream-edited: the specs gate refuses and names the edited concept', (t) => {
  const ws = scaffold(t, 'upstream-edited');
  const r = i2i(ws, 'gate', 'require', 'specs');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/CONCEPT\.md (was edited|changed) after/);
});

test('stack-findings: the design gate refuses and names the stack finding', (t) => {
  const ws = scaffold(t, 'stack-findings');
  const r = i2i(ws, 'gate', 'require', 'design');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/stack\.md has \d+ finding/);
  assert.match(r.stderr, /missing-category/);
  assert.equal(existsSync(join(ws.cwd, 'docs/design')), false);
});

test('prototype-edited: the blueprint gate refuses and names the edited prototype', (t) => {
  const ws = scaffold(t, 'prototype-edited');
  const r = i2i(ws, 'gate', 'require', 'blueprint');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/design changed after docs\/design\/index\.md was approved/);
  assert.match(r.stderr, /prototype\.html/);
  assert.equal(existsSync(join(ws.cwd, 'docs/blueprint.md')), false);
});

test('cyclic-graph: the gate is open and check reports the cycle', (t) => {
  const ws = scaffold(t, 'cyclic-graph');
  assert.equal(i2i(ws, 'gate', 'require', 'tickets').status, 0);
  const r = i2i(ws, 'check', 'docs/specs');
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /cycle/);
});

test('no-artifact-tool: gate 1 is open and the blueprint is not written yet', (t) => {
  const ws = scaffold(t, 'no-artifact-tool');
  assert.equal(i2i(ws, 'gate', 'require', 'blueprint').status, 0);
  assert.equal(existsSync(join(ws.cwd, 'docs/blueprint.md')), false);
});

for (const name of CASES) {
  test(`${name}: the scaffold has no remote and files nothing`, (t) => {
    const ws = scaffold(t, name);
    assert.equal(git(ws, 'remote'), '');
    assert.equal(existsSync(join(ws.cwd, 'docs/specs/index.md')), false);
  });

  test(`${name}: case.yaml scaffolds, grades for free and grants no gh`, () => {
    const yaml = readFileSync(join(EVALS, name, 'case.yaml'), 'utf8');
    assert.match(yaml, /^\s*scaffold_script: scaffold\.sh$/m);
    const types = [...yaml.matchAll(/^\s*type: (\S+)$/gm)].map((m) => m[1]);
    assert.ok(types.length > 0, 'at least one grader');
    for (const type of types) assert.ok(FREE.includes(type), `${type} is not a free grader`);
    const tools = yaml.match(/^\s*allowed_tools: \[(.*)\]$/m);
    assert.ok(tools, 'allowed_tools is listed');
    assert.doesNotMatch(tools[1], /gh/i);
  });
}

test('the README eval command grants no gh', () => {
  const line = readFileSync(join(ROOT, 'README.md'), 'utf8')
    .split('\n')
    .find((l) => l.includes('claude plugin eval .'));
  assert.ok(line, 'the README shows the eval command');
  assert.doesNotMatch(line, /\bgh\b/);
});
