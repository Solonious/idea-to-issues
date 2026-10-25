import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screenIds } from '../bin/lib/design.mjs';

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

const logged = (ctx) => (existsSync(ctx.log) ? readFileSync(ctx.log, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);

test('design shots takes one headless shot per screen and width, then removes its profile', (t) => {
  const ctx = setup(t);
  const r = shots(ctx, ['shots', 'design']);
  assert.equal(r.status, 0, r.stderr);
  const calls = logged(ctx);
  assert.equal(calls.length, 4);
  const profiles = new Set();
  for (const argv of calls) {
    assert.ok(argv.includes('--headless'));
    const profile = argv.filter((a) => a.startsWith('--user-data-dir='));
    assert.equal(profile.length, 1);
    profiles.add(profile[0].slice('--user-data-dir='.length));
    assert.equal(argv.filter((a) => a === '--window-size=390,844' || a === '--window-size=1440,900').length, 1);
    const shot = argv.find((a) => a.startsWith('--screenshot='));
    assert.match(shot, new RegExp(`^--screenshot=${join(ctx.tmp, 'design/png').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(home|plant)-(mobile|desktop)\\.png$`));
    assert.match(argv.at(-1), /\/design\/prototype\.html#(home|plant)$/);
  }
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

test('design usage errors exit 2', (t) => {
  const ctx = setup(t);
  for (const args of [[], ['nope'], ['shots', 'a', 'b'], ['shots', '--x']]) {
    assert.equal(shots(ctx, args).status, 2, args.join(' '));
  }
});

test('screenIds returns the unique data-screen values in document order', () => {
  assert.deepEqual(screenIds(PROTOTYPE), ['home', 'plant']);
});
