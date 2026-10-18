import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8');
const SKILLS = ['concept', 'grilling', 'blueprint'];

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
  for (const name of ['concept', 'blueprint']) {
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

test('the blueprint skill checks gate 1 before anything else', () => {
  const { body } = splitFront(read('skills/blueprint/SKILL.md'));
  const lines = body.split('\n');
  const first = lines.findIndex((l) => l.startsWith('## Step'));
  assert.ok(first >= 0);
  const next = lines.findIndex((l, i) => i > first && l.startsWith('## '));
  const section = lines.slice(first, next).join('\n');
  assert.ok(section.includes('i2i.mjs gate require blueprint'));
  assert.ok(first < lines.indexOf('## Step 4: Write `docs/blueprint.md`'));
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

test('the ADR template has context, decision and rejected alternatives', () => {
  const lines = read('skills/blueprint/references/adr-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# '));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Context', 'Decision', 'Rejected alternatives', 'Consequences']);
});
