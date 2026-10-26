import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIZES, screenIds } from '../bin/lib/design.mjs';

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
