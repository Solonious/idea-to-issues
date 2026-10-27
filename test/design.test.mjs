import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIZES, screenIds, parsePrototype } from '../bin/lib/design.mjs';

const BIN = fileURLToPath(new URL('../bin/i2i.mjs', import.meta.url));
const STUB = fileURLToPath(new URL('./stub-chrome/chrome', import.meta.url));
const PROTOTYPE = '<!doctype html><html><body><section data-screen="home"><div data-state="filled">A</div></section><section data-screen="plant"><a data-to="home">back</a></section><section data-screen="home"></section></body></html>';

// A temp dir holding design/prototype.html, run with the stub in place of Chrome.
function setup(t, { prototype = PROTOTYPE } = {}) {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'i2i-design-')));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  mkdirSync(join(tmp, 'design'));
  if (prototype !== null) writeFileSync(join(tmp, 'design/prototype.html'), prototype);
  return { tmp, log: join(tmp, 'argv.log') };
}

function shots(ctx, args, extra = {}) {
  const env = { ...process.env, I2I_CHROME: STUB, CHROME_STUB_LOG: ctx.log, ...extra };
  return spawnSync(process.execPath, [BIN, 'design', ...args], { cwd: ctx.tmp, env, encoding: 'utf8' });
}

// The stub's log as one { argv, methods } per Chrome launch: an {argv} line starts a call, method lines belong to it.
function logged(ctx) {
  if (!existsSync(ctx.log)) return [];
  const calls = [];
  for (const line of readFileSync(ctx.log, 'utf8').trim().split('\n')) {
    const entry = JSON.parse(line);
    if (entry.argv) calls.push({ argv: entry.argv, methods: [] });
    else calls.at(-1).methods.push(entry);
  }
  return calls;
}

test('design shots takes one headless shot per screen and width, then removes its profile', (t) => {
  const ctx = setup(t);
  const r = shots(ctx, ['shots', 'design']);
  assert.equal(r.status, 0, r.stderr);
  const calls = logged(ctx);
  assert.equal(calls.length, 4);
  const profiles = new Set();
  const seen = [];
  for (const { argv, methods } of calls) {
    assert.ok(argv.includes('--headless'));
    assert.ok(argv.includes('--remote-debugging-pipe'));
    const profile = argv.filter((a) => a.startsWith('--user-data-dir='));
    assert.equal(profile.length, 1);
    profiles.add(profile[0].slice('--user-data-dir='.length));
    assert.equal(argv.filter((a) => a.startsWith('--window-size=') || a.startsWith('--screenshot=')).length, 0);
    const names = methods.map((m) => m.method);
    const metrics = methods.find((m) => m.method === 'Emulation.setDeviceMetricsOverride');
    const size = Object.entries(SIZES).find(([, [width, height]]) => metrics?.params.width === width && metrics.params.height === height);
    assert.ok(size, 'the viewport is one of SIZES');
    assert.deepEqual(metrics.params, { width: size[1][0], height: size[1][1], deviceScaleFactor: 1, mobile: false });
    const media = methods.find((m) => m.method === 'Emulation.setEmulatedMedia');
    assert.deepEqual(media?.params.features, [{ name: 'prefers-color-scheme', value: 'light' }]);
    const navigate = names.indexOf('Page.navigate');
    assert.ok(navigate !== -1);
    assert.ok(names.indexOf('Emulation.setDeviceMetricsOverride') < navigate, 'viewport is set before navigating');
    assert.ok(names.indexOf('Emulation.setEmulatedMedia') < navigate, 'theme is set before navigating');
    assert.ok(names.indexOf('Page.captureScreenshot') > navigate, 'capture comes after navigating');
    const url = methods[navigate].params.url;
    assert.match(url, /\/design\/prototype\.html#(home|plant)$/);
    seen.push(`${url.split('#')[1]} ${size[0]}`);
  }
  assert.deepEqual(seen.sort(), ['home desktop', 'home mobile', 'plant desktop', 'plant mobile']);
  for (const f of ['home-mobile', 'home-desktop', 'plant-mobile', 'plant-desktop']) assert.ok(existsSync(join(ctx.tmp, 'design/png', `${f}.png`)), f);
  assert.match(r.stdout, /^design shots: 2 screens, 4 files$/m);
  assert.match(r.stdout, /^ {2}design\/png\/home-mobile\.png$/m);
  assert.equal(profiles.size, 1, 'one profile for the whole run');
  assert.equal(existsSync([...profiles][0]), false, 'the profile is removed afterwards');
});

test('design shots exits 2 when I2I_CHROME names a missing file, without looking elsewhere', (t) => {
  const ctx = setup(t);
  const r = shots(ctx, ['shots', 'design'], { I2I_CHROME: join(ctx.tmp, 'nope') });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no Chrome found; looked for:/);
  assert.match(r.stderr, /I2I_CHROME=.*nope/);
  assert.equal(existsSync(join(ctx.tmp, 'design/png')), false);
});

test('design shots exits 2 when prototype.html is missing', (t) => {
  const ctx = setup(t, { prototype: null });
  const r = shots(ctx, ['shots', 'design']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /prototype\.html does not exist/);
});

test('design shots exits 1 on a prototype with no data-screen', (t) => {
  const ctx = setup(t, { prototype: '<!doctype html><html><body>Nothing</body></html>' });
  const r = shots(ctx, ['shots', 'design']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no data-screen in /);
});

test('design shots stops at the first failed shot and quotes Chrome', (t) => {
  const ctx = setup(t);
  const r = shots(ctx, ['shots', 'design'], { CHROME_STUB_FAIL: '1' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /screenshot of home at mobile failed: stub chrome: injected failure/);
  assert.equal(logged(ctx).length, 1);
});

test('design shots reports a protocol error and writes no screenshot', (t) => {
  const ctx = setup(t);
  const r = shots(ctx, ['shots', 'design'], { CHROME_STUB_ERROR: 'Page.navigate' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /screenshot of home at mobile failed: .*injected Page\.navigate error/);
  assert.equal(existsSync(join(ctx.tmp, 'design/png/home-mobile.png')), false);
});

test('design usage errors exit 2', (t) => {
  const ctx = setup(t);
  for (const args of [[], ['nope'], ['shots', 'a', 'b'], ['shots', '--x']]) {
    assert.equal(shots(ctx, args).status, 2, args.join(' '));
  }
});

test('screenIds returns the unique data-screen values in document order', () => {
  assert.deepEqual(screenIds(PROTOTYPE), ['home', 'plant']);
});

test('parsePrototype reads the tags, not the comments, scripts and styles, and keeps real line numbers', () => {
  const html = '<style>[data-screen="s"] {}</style>\n<!-- <p data-screen="c"> -->\n<section data-screen="a">\n<div data-state="empty"><br><img src="x"></div>\n<script>var x = \'<b data-state="no">\';</script>\n</section>\n<p data-state="filled" data-to="a/empty"></p>';
  assert.deepEqual(parsePrototype(html), {
    screens: [{ id: 'a', line: 3, states: [{ name: 'empty', line: 4 }] }],
    transitions: [{ to: 'a/empty', line: 7 }],
    loose: [{ name: 'filled', line: 7 }],
  });
});

const FIXTURES = fileURLToPath(new URL('./fixtures/design', import.meta.url));
const CONTRACT = fileURLToPath(new URL('../docs/CONTRACT.md', import.meta.url));

function check(...args) {
  return spawnSync(process.execPath, [BIN, 'design', 'check', ...args], { encoding: 'utf8' });
}

function tempDir(t) {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'i2i-design-check-')));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  return tmp;
}

// A copy of fixtures/design/valid in a temp dir, with each file passed through its edit function.
function mutated(t, { index = (x) => x, html = (x) => x } = {}) {
  const tmp = tempDir(t);
  writeFileSync(join(tmp, 'index.md'), index(readFileSync(join(FIXTURES, 'valid', 'index.md'), 'utf8')));
  writeFileSync(join(tmp, 'prototype.html'), html(readFileSync(join(FIXTURES, 'valid', 'prototype.html'), 'utf8')));
  return tmp;
}

// Replaces `from` with `to`, and fails the test when `from` is not there.
const swap = (from, to) => (text) => {
  assert.ok(text.includes(from), `no ${from} in the fixture`);
  return text.replace(from, to);
};
const PLANT_ROW = '| Plant | `plant` | Ruling 6 | one plant |\n';
const BACK_ROW = '| `plant` | `home` | Back |\n';
const THREE = '<div data-state="empty"></div><div data-state="filled"></div><div data-state="error"></div>';

test('design check passes the valid fixture', () => {
  const { status, stdout, stderr } = check(join(FIXTURES, 'valid'));
  assert.equal(status, 0, stderr);
  assert.equal(stderr, '');
  assert.match(stdout, /^design check: 2 screens, 2 transitions, 0 findings$/m);
});

test('design check passes the no-UI fixture', () => {
  const { status, stdout, stderr } = check(join(FIXTURES, 'no-ui'));
  assert.equal(status, 0, stderr);
  assert.match(stdout, /^design check: no screens \(ui-library excluded by Ruling 6\), 0 findings$/m);
});

test("design check skips an approved index.md's front matter", (t) => {
  const front = '---\napproved: 2026-01-01\ndigest: sha256:0\nbased-on: docs/design@0000000\n---\n';
  const { status, stderr } = check(mutated(t, { index: (x) => front + x }));
  assert.equal(status, 0, stderr);
});

const RULES = [
  ['screen-not-in-prototype', 'settings', { index: swap(PLANT_ROW, PLANT_ROW + '| Settings | `settings` | Ruling 6 | x |\n') }],
  ['screen-not-in-index', 'settings', { html: swap('</body>', `<section data-screen="settings">${THREE}</section></body>`) }],
  ['missing-state', 'plant/error', { html: swap('  <div data-state="error">The plant did not load</div>\n', '') }],
  ['bad-transition-target', 'settings', { html: swap('data-to="plant"', 'data-to="settings"') }],
  ['bad-transition-target', 'plant/open', { html: swap('data-to="home/filled"', 'data-to="plant/open"') }],
  ['duplicate-screen', 'home', { html: swap('</body>', '<section data-screen="home"></section></body>') }],
  ['duplicate-state', 'home/filled', { html: swap('  <div data-state="error">The list did not load</div>\n', '  <div data-state="filled"></div>\n  <div data-state="error">The list did not load</div>\n') }],
  ['bad-state', 'home/loading', { html: swap('  <a data-to="plant">', '  <div data-state="loading"></div>\n  <a data-to="plant">') }],
  ['bad-state', 'empty', { html: swap('<section data-screen="home">', '<div data-state="empty"></div>\n<section data-screen="home">') }],
  ['bad-screen-id', 'Home2', { html: swap('</body>', '<section data-screen="Home2"></section></body>') }],
  ['bad-screen-id', 'settings', { index: swap(PLANT_ROW, PLANT_ROW + '| Settings | settings | Ruling 6 | x |\n') }],
  ['unknown-screen', 'settings', { index: swap(BACK_ROW, BACK_ROW + '| `home` | `settings` | tap |\n') }],
  [
    'no-screens',
    'inventory',
    {
      index: (x) => x.replace(/^\| (Home|Plant) \| `.*\n/gm, '').replace(/^\| `(home|plant)` \| `.*\n/gm, ''),
      html: (x) => x.replace(/<section data-screen[\s\S]*?<\/section>\n/g, ''),
    },
  ],
];

for (const [rule, key, edits] of RULES) {
  test(`design check reports ${rule} [${key}] and only it`, (t) => {
    const { status, stdout, stderr } = check(mutated(t, edits));
    assert.equal(status, 1, stderr);
    assert.equal(stdout, '');
    assert.ok(stderr.includes(` [${key}] ${rule}: `), stderr);
    assert.match(stderr, /^design check: 1 finding\(s\)$/m);
  });
}

test('design check reports stray-prototype in the no-UI form', (t) => {
  const tmp = tempDir(t);
  copyFileSync(join(FIXTURES, 'no-ui', 'index.md'), join(tmp, 'index.md'));
  writeFileSync(join(tmp, 'prototype.html'), '<html></html>');
  const { status, stderr } = check(tmp);
  assert.equal(status, 1, stderr);
  assert.ok(stderr.includes('[prototype.html] stray-prototype:'), stderr);
});

test('design check usage and missing files exit 2', (t) => {
  for (const args of [['a', 'b'], ['--x']]) {
    const r = check(...args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, /^Usage: i2i design shots/);
  }
  const empty = check(tempDir(t));
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /index\.md does not exist/);
  const tmp = tempDir(t);
  copyFileSync(join(FIXTURES, 'valid', 'index.md'), join(tmp, 'index.md'));
  const noHtml = check(tmp);
  assert.equal(noHtml.status, 2);
  assert.match(noHtml.stderr, /prototype\.html does not exist/);
});

test('the design example in docs/CONTRACT.md passes design check', (t) => {
  const tmp = tempDir(t);
  const files = [...readFileSync(CONTRACT, 'utf8').matchAll(/^````(?:markdown|html) (docs\/design\/\S+)\n([\s\S]*?)\n````$/gm)];
  assert.equal(files.length, 2);
  mkdirSync(join(tmp, 'docs/design'), { recursive: true });
  for (const [, name, content] of files) writeFileSync(join(tmp, name), content + '\n');
  const { status, stdout, stderr } = check(join(tmp, 'docs/design'));
  assert.equal(status, 0, stderr);
  assert.match(stdout, /0 findings$/m);
});
