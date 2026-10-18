import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p) => readFileSync(path(p), 'utf8');
const SKILLS = ['concept', 'grilling', 'blueprint', 'specs', 'tickets'];

function splitFront(text) {
  const lines = text.split('\n');
  assert.equal(lines[0], '---');
  const close = lines.indexOf('---', 1);
  assert.ok(close > 0, 'front matter is closed');
  return { front: lines.slice(1, close), body: lines.slice(close + 1).join('\n') };
}

test('the grilling skill carries the upstream MIT attribution', () => {
  const license = read('skills/grilling/LICENSE');
  assert.ok(license.startsWith('MIT License'));
  assert.ok(license.includes('Copyright (c) 2026 Matt Pocock'));
  assert.ok(license.includes('Permission is hereby granted, free of charge'));
  const skill = read('skills/grilling/SKILL.md');
  assert.ok(skill.includes('mattpocock/skills'));
  assert.ok(skill.includes('](LICENSE)'));
});

test('each skill has name and description front matter, and the name matches its directory', () => {
  for (const name of SKILLS) {
    const { front } = splitFront(read(`skills/${name}/SKILL.md`));
    assert.ok(front.includes(`name: ${name}`), `${name}: name matches the directory`);
    assert.ok(front.some((l) => /^description: \S/.test(l)), `${name}: has a description`);
  }
});

test('every skill talks in the language setting, which the plugin declares', () => {
  for (const name of SKILLS) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    assert.ok(body.includes('${user_config.language}'), `${name} uses the language setting`);
  }
  const opt = JSON.parse(read('.claude-plugin/plugin.json')).userConfig.language;
  assert.equal(opt.type, 'string');
  for (const key of ['default', 'title', 'description']) {
    assert.ok(typeof opt[key] === 'string' && opt[key].length > 0, `language.${key} is set`);
  }
});

test('each gated stage skill hands off to its gate and never stamps', () => {
  for (const name of ['concept', 'blueprint', 'tickets']) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    assert.ok(body.includes(`/idea-to-issues:approve ${name}`), `${name} hands off to its gate`);
    for (const line of body.split('\n').filter((l) => l.includes('gate stamp'))) {
      assert.match(line, /never/i, `${name}: only the never rule may mention gate stamp: ${line}`);
    }
  }
});

test('the concept template has the five sections in order and no front matter', () => {
  const text = read('skills/concept/references/concept-template.md');
  const lines = text.split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# Concept'));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Problem', 'Who it is for', 'Competitors', 'Rulings', 'Open threads']);
  assert.ok(lines.includes('| Product | What it does | How we differ | Source |'));
});

test('the blueprint skill asks for the strongest model', () => {
  const { front } = splitFront(read('skills/blueprint/SKILL.md'));
  assert.ok(front.includes('model: best'));
});

test('each later stage skill checks its gates before anything else', () => {
  for (const name of ['blueprint', 'specs', 'tickets']) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    const lines = body.split('\n');
    const first = lines.findIndex((l) => l.startsWith('## Step'));
    assert.ok(first >= 0, `${name}: has steps`);
    const next = lines.findIndex((l, i) => i > first && l.startsWith('## '));
    const section = lines.slice(first, next).join('\n');
    assert.ok(section.includes(`i2i.mjs gate require ${name}`), `${name}: first step requires its gate`);
  }
});

test('the blueprint skill builds on the fixed stack', () => {
  const { body } = splitFront(read('skills/blueprint/SKILL.md'));
  for (const word of ['Nx', 'Angular', 'NestJS', 'Prisma', 'Vercel', 'Railway']) {
    assert.ok(body.includes(word), `mentions ${word}`);
  }
});

test('the blueprint gate falls back to a markdown summary without the Artifact tool', () => {
  const { body } = splitFront(read('skills/blueprint/SKILL.md'));
  assert.ok(body.includes('If the Artifact tool is not in your tool list'));
  assert.ok(body.includes('markdown summary'));
});

test('the blueprint template has its sections in order, a mermaid diagram and the walking skeleton first', () => {
  const lines = read('skills/blueprint/references/blueprint-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# Blueprint'));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Stack', 'Architecture', 'Domain model', 'Modules', 'API surface', 'Screens', 'Decisions', 'Epics', 'Open threads']);
  assert.ok(lines.includes('```mermaid'));
  const head = lines.indexOf('| # | Key | Epic | Delivers |');
  assert.ok(head >= 0);
  assert.ok(lines[head + 2].startsWith('| 1 |'));
  assert.ok(lines[head + 2].includes('Walking skeleton'));
});

test('the specs skill runs check before it hands over to the tickets stage, and never stamps', () => {
  const { body } = splitFront(read('skills/specs/SKILL.md'));
  assert.ok(body.includes('i2i.mjs check docs/specs'));
  assert.ok(body.includes('/idea-to-issues:tickets'));
  assert.ok(!body.includes('/idea-to-issues:approve specs'));
  const lines = body.split('\n');
  const check = lines.findIndex((l) => l.startsWith('## Step 7: Run check'));
  const hand = lines.findIndex((l) => l.startsWith('## Step 8: Hand off'));
  assert.ok(check >= 0 && hand > check, 'check step precedes hand-off');
  for (const line of lines.filter((l) => l.includes('gate stamp'))) {
    assert.match(line, /never/i, `only the never rule may mention gate stamp: ${line}`);
  }
});

test('the specs skill never splits by layer and leaves measurability to the agent', () => {
  const { body } = splitFront(read('skills/specs/SKILL.md'));
  assert.match(body, /never split by layer/i);
  assert.ok(body.includes('enforces the format only'));
  assert.ok(body.includes('measurable'));
});

test('the epic template passes check as it is', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'i2i-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  copyFileSync(path('skills/specs/references/epic-template.md'), join(dir, 'key.md'));
  const r = spawnSync(process.execPath, [path('bin/i2i.mjs'), 'check', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^check: 1 epics, 2 tickets, 2 ACs, 0 findings$/m);
  assert.equal(r.stderr, '');
});

test('the epic template has its preamble in order, the walking skeleton first and a coverage table', () => {
  const lines = read('skills/specs/references/epic-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# [KEY] '));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Acceptance criteria', 'Slices', 'Coverage', 'Tickets']);
  const head = lines.indexOf('| # | Ticket | Delivers | Blocked by |');
  assert.ok(head >= 0);
  assert.ok(lines[head + 2].startsWith('| 1 | KEY-1 | Walking skeleton'));
  assert.ok(lines[head + 2].endsWith('| none |'));
  assert.ok(lines.includes('| AC | Covered by |'));
});

test('the tickets skill resumes at gate 3, settles the Project, and files only after the dry run and the owner\'s yes', () => {
  const { body } = splitFront(read('skills/tickets/SKILL.md'));
  const step2 = body.slice(body.indexOf('## Step 2'), body.indexOf('## Step 3'));
  assert.ok(step2.includes('i2i.mjs gate require file'), 'a re-run checks gate 3 before ordering anything');
  const dry = body.indexOf('i2i.mjs file --dry-run');
  const apply = body.indexOf('i2i.mjs file --apply');
  const verify = body.indexOf('i2i.mjs verify --wait');
  assert.ok(body.indexOf('Choose the Project') < dry, 'the Project is settled before the dry run');
  assert.ok(dry >= 0 && apply > dry, 'the dry run comes before the apply');
  assert.match(body.slice(dry, apply), /owner's yes/, 'the apply waits for the owner\'s yes');
  assert.ok(verify > apply, 'verify --wait runs after the apply');
});

test('the tickets skill names a gh write only in a never rule or as a command for the owner', () => {
  const { body } = splitFront(read('skills/tickets/SKILL.md'));
  const write = /\bgh (issue|label|project) (create|edit|link|item-add)\b/g;
  assert.ok([...body.matchAll(write)].length > 0);
  for (const line of body.split('\n')) {
    if (/never/i.test(line)) continue;
    for (const m of line.matchAll(write)) {
      assert.equal(line.slice(m.index - 3, m.index), '`! ', `only the owner runs a gh write: ${line}`);
    }
  }
});

test('the tickets gate falls back to check --render without the Artifact tool', () => {
  const { body } = splitFront(read('skills/tickets/SKILL.md'));
  assert.ok(body.includes('If the Artifact tool is not in your tool list'));
  assert.ok(body.includes('i2i.mjs check --render docs/specs'));
});

test('the index template lists the epics by file name, key and title, with no front matter', () => {
  const lines = read('skills/tickets/references/index-template.md').split('\n');
  assert.equal(lines[0], '# Epic order');
  const items = lines.filter((l) => /^\d+\. /.test(l));
  assert.ok(items.length >= 2);
  items.forEach((l, k) => assert.match(l, new RegExp(`^${k + 1}\\. [a-z0-9-]+ — \\[[A-Z][A-Z0-9]*\\] \\S`)));
});

test('the ADR template has context, decision and rejected alternatives', () => {
  const lines = read('skills/blueprint/references/adr-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# '));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Context', 'Decision', 'Rejected alternatives', 'Consequences']);
});
