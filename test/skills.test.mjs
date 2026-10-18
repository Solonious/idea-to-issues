import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8');
const SKILLS = ['concept', 'grilling'];

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

test('both skills talk in the language setting, which the plugin declares', () => {
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

test('the concept skill hands off to gate 1 and never stamps', () => {
  const { body } = splitFront(read('skills/concept/SKILL.md'));
  assert.ok(body.includes('/idea-to-issues:approve concept'));
  for (const line of body.split('\n').filter((l) => l.includes('gate stamp'))) {
    assert.match(line, /never/i, `only the never rule may mention gate stamp: ${line}`);
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
