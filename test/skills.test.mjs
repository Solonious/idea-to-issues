import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../bin/lib/stack.mjs';

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p) => readFileSync(path(p), 'utf8');
const SKILLS = ['brainstorm', 'concept', 'stack', 'design', 'grilling', 'blueprint', 'specs', 'tickets'];

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

test('every gate page is in the language setting and names the English document approved', () => {
  const pages = SKILLS.filter((name) => read(`skills/${name}/SKILL.md`).includes('Build the gate page'));
  for (const name of ['stack', 'design', 'blueprint', 'tickets']) assert.ok(pages.includes(name), `${name} builds a gate page`);
  for (const name of pages) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    assert.ok(body.includes('The page is written entirely in ${user_config.language}'), `${name}: page language`);
    assert.ok(body.includes('Keys (`SKEL-1`)'), `${name}: keys stay untranslated`);
    assert.ok(body.includes('the approval is of the English document'), `${name}: names the approved document`);
    assert.ok(body.includes('Its headings and explanations are in ${user_config.language}'), `${name}: terminal fallback`);
  }
});

test('each gated stage skill hands off to its gate and never stamps', () => {
  for (const name of ['brainstorm', 'concept', 'stack', 'design', 'blueprint', 'tickets']) {
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
  assert.ok(lines.some((l) => /^\d+\. .*\[stack: .+\]$/.test(l)), 'a ruling line shows the stack tag');
});

test('the concept asks every product-dependent stack question as CATEGORIES words it, grouped by shared question, and never an always-on one', () => {
  const ref = read('skills/concept/references/stack-questions.md');
  const groups = new Map();
  for (const c of CATEGORIES) if (!c.always) groups.set(c.question, [...(groups.get(c.question) ?? []), c.category]);
  const expected = [...groups].map(([q, cats]) => `| ${cats.map((c) => `\`${c}\``).join(', ')} | ${q} |`);
  const rows = ref.slice(ref.indexOf('## Stack categories')).split('\n').filter((l) => l.startsWith('| `'));
  assert.deepEqual(rows, expected);
  for (const fact of ['platform', 'users', 'offline', 'budget', 'language']) assert.ok(ref.includes(`| ${fact} | `), `${fact} is asked`);
  for (const c of CATEGORIES) if (c.always) assert.ok(!ref.includes(`| \`${c.category}\``), `${c.category} is never asked`);
  assert.ok(ref.includes('`ci-cd`, `error-tracking` and `analytics` are always needed'));
});

test('the concept reads the approved brainstorm summary, asks the stack questions and runs no competitor scan of its own', () => {
  const skill = read('skills/concept/SKILL.md');
  assert.doesNotMatch(skill, /competitor scan|web search|3–5/i, 'the scan is gone, front matter included');
  assert.ok(skill.includes('docs/brainstorm/summary.md'));
  assert.ok(skill.includes('Competitor takeaways'));
  assert.ok(skill.includes('references/stack-questions.md'));
  for (const w of ['the platform', 'the number of users', 'offline use', 'the budget', 'the language users read on screen']) assert.ok(skill.includes(w), `${w} is in the frontier`);
  assert.ok(skill.includes('[stack: '));
  const template = read('skills/concept/references/concept-template.md');
  assert.doesNotMatch(template, /3–5 rows|web search/);
  assert.ok(template.includes('Competitor takeaways'));
});

test('the concept asks every question in the owner\'s language and keeps only the ruling text in English', () => {
  const { body } = splitFront(read('skills/concept/SKILL.md'));
  assert.ok(body.includes('Ask every question in ${user_config.language}, the stack questions included'));
  assert.ok(body.includes('Only the ruling in `docs/CONCEPT.md` keeps the English question'));
  assert.ok(!body.includes('asked as written'), 'no question is asked as written');
  const ref = read('skills/concept/references/stack-questions.md');
  assert.ok(ref.includes('in the owner\'s language, as a faithful translation'));
  assert.ok(!ref.includes('on this page, as written'), 'the reference does not ask for the English wording');
  const template = read('skills/concept/references/concept-template.md');
  assert.ok(!template.includes('as asked'), 'a ruling records the reference wording, not the translation');
});

test('the brainstorm summary template has the five sections in order and no front matter', () => {
  const lines = read('skills/brainstorm/references/summary-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# Brainstorm summary'));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Chosen shape', 'Key scenarios', 'Rejected alternatives', 'Competitor takeaways', 'Skipped activities']);
});

test('the brainstorm keeps an append-only, activity-tagged notes log, starts from an idea alone, and proposes activities in order', () => {
  const { body } = splitFront(read('skills/brainstorm/SKILL.md'));
  assert.ok(body.includes('`## <YYYY-MM-DD> — scenarios | attack | alternatives | competitors | free`'));
  assert.ok(body.includes('`Stopped at:`'));
  assert.ok(body.includes('If the owner continues, go on to item 2.'), 'a session after the summary still reads the notes');
  assert.ok(body.includes('scenarios → attack → alternatives → competitors'));
  assert.ok(body.includes('or "none"'), 'an idea alone is enough');
  assert.ok(body.includes('run them or finish anyway'));
  assert.ok(body.includes('Skipped activities'));
});

test('the attack prints both sides verbatim with a rebuttal round, competitors cite opened sources, and gate 0 has no page', () => {
  const { body } = splitFront(read('skills/brainstorm/SKILL.md'));
  assert.ok(body.includes('verbatim'));
  assert.ok(body.includes('rebuttal round'));
  assert.ok(body.includes('If the Agent tool is not in your tool list'));
  assert.ok(body.includes('a linked source you actually opened'));
  assert.ok(body.includes('the approval is of the English document `docs/brainstorm/summary.md`'));
  assert.ok(!body.includes('Build the gate page'), 'gate 0 is shown in the terminal, not on a page');
});

test('each skill names the model the owner chose for it, and the README records the same', () => {
  const MODELS = { brainstorm: 'opus', concept: 'opus', stack: 'opus', design: 'opus', grilling: 'inherit', blueprint: 'fable', specs: 'opus', tickets: 'sonnet' };
  assert.deepEqual(Object.keys(MODELS).sort(), [...SKILLS].sort());
  const readme = read('README.md');
  for (const name of SKILLS) {
    const { front } = splitFront(read(`skills/${name}/SKILL.md`));
    assert.ok(front.includes(`model: ${MODELS[name]}`), `${name}: model: ${MODELS[name]}`);
    if (name === 'grilling') continue;
    const model = MODELS[name][0].toUpperCase() + MODELS[name].slice(1);
    assert.ok(readme.includes(`| ${name} | ${model} |`), `${name}: the README table names ${model}`);
  }
  assert.ok(readme.includes('**One full run costs about $'));
});

test('every subagent dispatch names its model, and the stack stage never asks the owner for one', () => {
  let dispatches = 0;
  for (const name of SKILLS) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    for (const line of body.split('\n').filter((l) => /dispatch (a|one|two) subagents?/i.test(l))) {
      assert.match(line, /`model: (opus|sonnet|haiku|fable)`/, `${name}: a dispatch names its model: ${line.slice(0, 80)}`);
      dispatches++;
    }
  }
  assert.equal(dispatches, 5, 'the brainstorm attack, the stack pair, the ledger challenger, the design directions and the grilling lookup');
  const { body } = splitFront(read('skills/stack/SKILL.md'));
  assert.ok(body.includes('Never ask the owner which model a subagent runs on'));
});

test('each later stage skill checks its gates before anything else', () => {
  for (const name of ['concept', 'stack', 'design', 'blueprint', 'specs', 'tickets']) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    const lines = body.split('\n');
    const first = lines.findIndex((l) => l.startsWith('## Step'));
    assert.ok(first >= 0, `${name}: has steps`);
    const next = lines.findIndex((l, i) => i > first && l.startsWith('## '));
    const section = lines.slice(first, next).join('\n');
    assert.ok(section.includes(`i2i.mjs gate require ${name}`), `${name}: first step requires its gate`);
  }
});

test('after a refusal, each later stage waits for a new invocation of itself', () => {
  for (const name of ['concept', 'stack', 'design', 'blueprint', 'specs', 'tickets']) {
    const { body } = splitFront(read(`skills/${name}/SKILL.md`));
    const rule = `After a refusal, wait until the owner invokes \`/idea-to-issues:${name}\` again.`;
    const step1 = body.slice(body.indexOf('## Step 1'), body.indexOf('## Step 2'));
    assert.ok(step1.includes(rule), `${name}: the gate step carries the rule`);
    const refusals = body.split('\n').filter((l) => /verbatim and stop|no longer holds: stop/.test(l));
    assert.ok(refusals.length > 0, `${name}: has a refusal`);
    for (const line of refusals) {
      assert.ok(line.includes(rule), `${name}: a refusal waits for a new invocation: ${line}`);
      assert.ok(line.includes('is not an invocation'), `${name}: a later message or \`!\` output does not resume it`);
    }
  }
});

test('the blueprint builds on the approved stack and design and names no stack of its own', () => {
  const skill = read('skills/blueprint/SKILL.md');
  assert.doesNotMatch(skill, /Nx|Angular|NestJS|Prisma|Vercel|Railway/, 'no technology is named, front matter included');
  const { body } = splitFront(skill);
  const step2 = body.slice(body.indexOf('## Step 2'), body.indexOf('## Step 3'));
  for (const doc of ['docs/stack.md', 'docs/design/index.md', 'docs/adr/']) assert.ok(step2.includes(`\`${doc}\``), `step 2 reads ${doc}`);
  for (const needle of [
    'every technology this document names is the `Chosen:` line of one of its rows',
    'Never add a layer, never swap one',
    'settled by the stack stage — run /idea-to-issues:stack',
    'with the same Screen and the same Id, none added and none dropped',
    'No screens: ui-library excluded by Ruling N',
    'numbered after the highest `NNNN` already in `docs/adr/` (`0001` when the directory is empty or missing)',
    'A technology is never an ADR here',
    "Never change `docs/CONCEPT.md`, `docs/stack.md`, `docs/design/` or an existing ADR's body",
  ]) assert.ok(body.includes(needle), needle);
  const readme = read('README.md');
  assert.ok(readme.includes('It reads `docs/stack.md` and `docs/design/index.md`'));
  assert.ok(!readme.includes('### The fixed stack'));
});

test('no file of the plugin calls the stack fixed', () => {
  // test/fixtures/gh/issue-list.json is a verbatim gh capture; issue #10's title is GitHub's record, not the plugin's words.
  // test/skills.test.mjs holds the pattern's own literals (this test and the blueprint test above), so it would match itself.
  const files = ['README.md'];
  for (const dir of ['skills', 'commands', 'bin', 'docs', 'evals', '.claude-plugin', 'test']) {
    for (const f of readdirSync(path(dir), { recursive: true })) {
      if (dir === 'test' && (f === 'skills.test.mjs' || f === 'fixtures/gh/issue-list.json')) continue;
      if (/\.(md|mjs|json|yaml|sh)$/.test(f)) files.push(`${dir}/${f}`);
    }
  }
  assert.ok(files.length > 20, `${files.length} files scanned`);
  for (const f of files) assert.doesNotMatch(read(f), /fixed[ -]stack|stack is fixed|fixed by the plugin/i, f);
});

test('the blueprint gate falls back to a markdown summary without the Artifact tool', () => {
  const { body } = splitFront(read('skills/blueprint/SKILL.md'));
  assert.ok(body.includes('If the Artifact tool is not in your tool list'));
  assert.ok(body.includes('markdown summary'));
});

test('the blueprint template points at the stack and design, has its sections in order, screen ids, a mermaid diagram and the walking skeleton first', () => {
  const text = read('skills/blueprint/references/blueprint-template.md');
  const lines = text.split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# Blueprint'));
  assert.equal(lines[2], 'Concept: `docs/CONCEPT.md` · Stack: `docs/stack.md` · Design: `docs/design/index.md`');
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Architecture', 'Domain model', 'Modules', 'API surface', 'Screens', 'Decisions', 'Epics', 'Open threads']);
  assert.ok(lines.includes('| Screen | Id | Purpose | Calls |'));
  assert.ok(lines.includes('| [NNNN](adr/NNNN-<slug>.md) | <the decision in one line> |'));
  assert.doesNotMatch(text, /0001|Nx|Angular|NestJS|Prisma|Vercel|Railway/);
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

test('the specs skill cites the approved prototype in every screen ticket and reviews it before the hand-off', () => {
  const { body } = splitFront(read('skills/specs/SKILL.md'));
  const step2 = body.slice(body.indexOf('## Step 2'), body.indexOf('## Step 3'));
  assert.ok(step2.includes('`docs/design/index.md`'), 'step 2 reads the design inventory');
  assert.ok(step2.includes('No screens: ui-library excluded by Ruling N'), 'step 2 names the no-UI form');
  const line = 'Prototype: `docs/design/prototype.html#<screen-id>` — reference for layout and behaviour, not source code.';
  const step6 = body.slice(body.indexOf('## Step 6'), body.indexOf('## Step 7'));
  assert.ok(step6.includes(line), 'step 6 fixes the citation line');
  assert.ok(step6.includes('in backticks'), 'a screen is named by its backticked Id');
  const review = body.slice(body.indexOf('## Step 7: Run check'), body.indexOf('## Step 8: Hand off'));
  assert.ok(review.includes('`Prototype:`') && review.includes('reference for layout and behaviour, not source code'), 'the step 7 review checks the citation');
  assert.ok(body.includes('never change `docs/CONCEPT.md`, `docs/blueprint.md`, `docs/design/` or `docs/adr/`'), 'the design is never changed here');
  const template = read('skills/specs/references/epic-template.md');
  assert.ok(template.includes(line), 'the template shows the citation line');
  assert.ok(template.includes('a screen by its backticked Id'), 'the template names a screen by its Id');
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

test('the ADR template has a status line, context, decision and rejected alternatives', () => {
  const lines = read('skills/blueprint/references/adr-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# '));
  assert.equal(lines[2], 'Status: Accepted');
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Context', 'Decision', 'Rejected alternatives', 'Consequences']);
});

test('a changed decision gets a successor ADR, never a rewrite', () => {
  const { body } = splitFront(read('skills/blueprint/SKILL.md'));
  const step5 = body.slice(body.indexOf('## Step 5'), body.indexOf('## Step 6'));
  assert.ok(step5.includes('Never delete an ADR and never rewrite one'));
  assert.ok(step5.includes('`Status: Superseded by ADR-NNNN`'));
  assert.ok(step5.includes('`Status: Accepted — amended by ADR-NNNN`'));
});

test('the stack skill runs the stack check after writing the document and before the gate page', () => {
  const { body } = splitFront(read('skills/stack/SKILL.md'));
  assert.ok(body.includes('i2i.mjs stack check docs'));
  const at = (h) => body.indexOf(h);
  assert.ok(at('## Step 7: Write docs/stack.md') < at('## Step 8: Run the stack check'));
  assert.ok(at('## Step 8: Run the stack check') < at('## Step 9: Present the stack gate'));
  assert.ok(body.includes('Driver: always'));
});

test('the stack template has its sections in order, no front matter, and the ten row labels in order', () => {
  const text = read('skills/stack/references/stack-template.md');
  const lines = text.split('\n');
  assert.ok(lines[0].startsWith('# Stack'));
  assert.notEqual(lines[0], '---');
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Capability profile', 'Rows', 'Exclusion ledger', 'Ledger challenge', 'Rulings mapping']);
  const first = lines.findIndex((l) => l.startsWith('### '));
  const end = lines.findIndex((l, i) => i > first && /^##+ /.test(l));
  const row = lines.slice(first, end);
  const labels = ['Default:', 'Chosen:', 'Driver:', 'Alternative:', 'For the default:', 'For the alternative:', 'Rebuttal by the default:', 'Rebuttal by the alternative:', 'Why:', 'ADR:'];
  let at = -1;
  for (const label of labels) {
    const idx = row.findIndex((l) => l.startsWith(label));
    assert.ok(idx > at, `${label} appears after the previous label`);
    at = idx;
  }
  for (const needle of ['Default: none — the owner decides', '| Category | Ruling | Reason |', '| Ruling | Maps to |', 'Finding: none']) {
    assert.ok(text.includes(needle), needle);
  }
});

test('the stack skill argues each row with its own pair, a rebuttal round and opened sources, reads the defaults through i2i, and stops without a ruling or the Agent tool', () => {
  const { body } = splitFront(read('skills/stack/SKILL.md'));
  for (const needle of [
    'If the Agent tool is not in your tool list',
    "Neither sees the other's first argument",
    'rebuttal round',
    'never argue both sides yourself',
    'i2i.mjs stack defaults',
    'actually opened',
    '/idea-to-issues:concept',
    'Default: none — the owner decides',
    'the approval is of the English document `docs/stack.md`',
    'If the Artifact tool is not in your tool list',
    'markdown summary',
    'keep its front matter block exactly as it is',
  ]) {
    assert.ok(body.includes(needle), needle);
  }
});

test("the stack ADR template matches the blueprint's", () => {
  const stack = read('skills/stack/references/adr-template.md').split('\n');
  const blueprint = read('skills/blueprint/references/adr-template.md').split('\n');
  const headings = (lines) => lines.filter((l) => l.startsWith('## '));
  assert.deepEqual(headings(stack), headings(blueprint));
  assert.equal(stack[2], 'Status: Accepted');
  assert.equal(blueprint[2], 'Status: Accepted');
});

test('the design skill grills the inventory, keeps the directions, shoots the PNGs and never commits', () => {
  const { body } = splitFront(read('skills/design/SKILL.md'));
  for (const needle of [
    'i2i.mjs design shots',
    'data-direction',
    'never draw a direction yourself',
    'one question at a time',
    'Ruling N',
    'Change list',
    '/idea-to-issues:concept',
    'No screens: ui-library excluded by Ruling',
    'Which language or languages will the product\'s users read on screen?',
    'byte for byte',
    "git status --porcelain -- docs/design ':(exclude)docs/design/index.md'",
    'Never ask the owner which model a subagent runs on',
    'never commit',
  ]) assert.ok(body.includes(needle), needle);
  const at = (h) => body.indexOf(h);
  assert.ok(at('## Step 5: Directions') >= 0 && at('## Step 5: Directions') < at('## Step 6: Build'));
  assert.ok(at('## Step 8: Screenshots') >= 0 && at('## Step 8: Screenshots') < at('## Step 9: Present the design gate'));
});

test('the design index template has its sections in order and no front matter', () => {
  const lines = read('skills/design/references/index-template.md').split('\n');
  assert.notEqual(lines[0], '---');
  assert.ok(lines[0].startsWith('# Design'));
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  assert.deepEqual(headings, ['Inventory', 'States', 'Flows', 'Directions', 'Change list', 'Fidelity', 'Screenshots']);
  assert.ok(lines.includes('| Screen | Id | Basis | Purpose |'));
  assert.ok(lines.some((l) => l.includes('Ruling N')));
});
