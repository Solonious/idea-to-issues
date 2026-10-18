import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, copyFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/i2i.mjs', import.meta.url));
const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const CONTRACT = fileURLToPath(new URL('../docs/CONTRACT.md', import.meta.url));
const SUMMARY = /^check: 2 epics, 5 tickets, 5 ACs, 0 findings$/m;

function i2i(...args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
}

function tempDir(t) {
  const tmp = mkdtempSync(join(tmpdir(), 'i2i-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  return tmp;
}

// A copy of fixtures/valid in a temp dir, with auth.md passed through `edit`.
function mutated(t, edit) {
  const tmp = tempDir(t);
  copyFileSync(join(FIXTURES, 'valid', 'billing.md'), join(tmp, 'billing.md'));
  writeFileSync(join(tmp, 'auth.md'), edit(readFileSync(join(FIXTURES, 'valid', 'auth.md'), 'utf8')));
  return tmp;
}

test('check passes the valid two-epic fixture', () => {
  const { status, stdout, stderr } = i2i('check', join(FIXTURES, 'valid'));
  assert.equal(status, 0);
  assert.match(stdout, SUMMARY);
  assert.equal(stderr, '');
});

test('check --render prints one row per ticket in dependency order', () => {
  const dir = join(FIXTURES, 'valid');
  const { status, stdout } = i2i('check', '--render', dir);
  assert.equal(status, 0);
  const lines = stdout.trimEnd().split('\n');
  assert.equal(lines[0], '| Epic | Ticket | Effort | Blocked by | Covers |');
  const rows = lines.slice(2);
  const tickets = readdirSync(dir).map((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => l.startsWith('### [')).length);
  assert.equal(rows.length, tickets.reduce((a, b) => a + b, 0));
  const at = (key) => rows.findIndex((r) => r.includes(`[${key}]`));
  assert.ok(at('AUTH-2') < at('BILL-1'));
  assert.match(rows[at('BILL-1')], /AUTH-2.*AC-1/);
  assert.match(rows[at('AUTH-1')], /—/);
});

for (const [dir, key, rule] of [
  ['verify-missing', 'AUTH AC-2', 'verify'],
  ['ac-uncovered', 'AUTH AC-2', 'coverage'],
  ['effort-missing', 'AUTH-2', 'effort'],
  ['cycle', 'AUTH-2', 'cycle'],
  ['unknown-blocker', 'AUTH-2', 'unknown-blocker'],
  ['sections-missing', 'AUTH-2', 'sections'],
]) {
  test(`check rejects ${dir} with [${key}] ${rule}`, () => {
    const { status, stdout, stderr } = i2i('check', join(FIXTURES, dir));
    assert.equal(status, 1);
    assert.match(stderr, new RegExp(`\\[${key}\\] ${rule}:`));
    assert.equal(stdout, '');
  });
}

test('check rejects an epic with more than 100 tickets', (t) => {
  const tmp = tempDir(t);
  const sections = ['Problem', 'Proposed solution', 'Affected areas', 'Acceptance criteria', 'Validation', 'Dependencies', 'Risks', 'Notes for implementer'];
  let text = '# [BIG] Big epic\n\n- **AC-1** Everything works — verify: the suite passes\n\n';
  for (let n = 1; n <= 101; n++) {
    text += `### [BIG-${n}] Ticket ${n}\n\neffort: S · blocked-by: none · covers: AC-1\n\n`;
    text += sections.map((s) => `#### ${s}\n\n`).join('');
  }
  writeFileSync(join(tmp, 'big.md'), text);
  const { status, stderr } = i2i('check', tmp);
  assert.equal(status, 1);
  assert.match(stderr, /\[BIG\] cap:/);
});

for (const [rule, from, to] of [
  ['duplicate-key', '### [AUTH-3]', '### [AUTH-2]'],
  ['duplicate-ac', '- **AC-3**', '- **AC-2**'],
  ['unknown-ac', 'covers: AC-2, AC-3', 'covers: AC-2, AC-9'],
  ['foreign-key', '### [AUTH-3]', '### [BILL-3]'],
  ['malformed-meta', 'blocked-by: ', 'blocked_by: '],
  ['malformed-ac', '- **AC-3** ', '- **AC-3:** '],
  ['malformed-heading', '### [AUTH-3] ', '### AUTH-3 '],
  ['epic-heading', '# [AUTH] ', '# AUTH '],
  ['unclosed-fence', '```bash', '````bash'],
]) {
  test(`check reports ${rule} for a mutated valid epic`, (t) => {
    const tmp = mutated(t, (text) => text.replace(from, to));
    const { status, stderr } = i2i('check', tmp);
    assert.equal(status, 1);
    assert.ok(stderr.includes(` ${rule}:`), stderr);
  });
}

test('check skips leading front matter and keeps real line numbers', (t) => {
  const block = '---\napproved: 2026-01-01\nbased-on: docs/blueprint.md@0000000\n---\n\n';
  const ok = i2i('check', mutated(t, (text) => block + text));
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, SUMMARY);

  const open = i2i('check', mutated(t, (text) => '---\napproved: 2026-01-01\n' + text));
  assert.equal(open.status, 1);
  assert.ok(open.stderr.includes(' epic-heading:'));

  const plain = i2i('check', mutated(t, (text) => text.replace(' — verify: the login form test passes', '')));
  const shifted = i2i('check', mutated(t, (text) => block + text.replace(' — verify: the login form test passes', '')));
  const line = (r) => Number(/auth\.md:(\d+): \[AUTH AC-1\] verify:/.exec(r.stderr)[1]);
  assert.equal(line(shifted), line(plain) + block.split('\n').length - 1);
});

test('the example in docs/CONTRACT.md passes check', (t) => {
  const tmp = tempDir(t);
  const files = [...readFileSync(CONTRACT, 'utf8').matchAll(/^````markdown (\S+\.md)\n([\s\S]*?)\n````$/gm)];
  assert.ok(files.length >= 1);
  for (const [, name, content] of files) writeFileSync(join(tmp, name), content + '\n');
  const { status, stderr } = i2i('check', tmp);
  assert.equal(status, 0, stderr);
});

test('check usage errors exit 2 and --render prints no table on findings', (t) => {
  assert.equal(i2i('check').status, 2);
  assert.equal(i2i('check', join(tempDir(t), 'missing')).status, 2);
  assert.equal(i2i('check', tempDir(t)).status, 2);
  const { status, stdout } = i2i('check', '--render', join(FIXTURES, 'cycle'));
  assert.equal(status, 1);
  assert.equal(stdout, '');
});

test('the other modes are still not implemented', () => {
  for (const mode of ['file', 'verify']) {
    const { status, stderr } = i2i(mode);
    assert.equal(status, 1, mode);
    assert.match(stderr, /not implemented yet \(#\d+\)/);
  }
});
