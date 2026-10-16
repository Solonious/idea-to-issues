import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/i2i.mjs', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));

function i2i(...args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
}

test('--help lists the four modes and exits 0', () => {
  for (const flag of ['--help', '-h', 'help']) {
    const { status, stdout } = i2i(flag);
    assert.equal(status, 0, flag);
    for (const mode of ['check', 'file', 'verify', 'gate']) {
      assert.match(stdout, new RegExp(`^  ${mode} `, 'm'), `${flag} lists ${mode}`);
    }
  }
});

test('an unknown mode exits non-zero and names the mode', () => {
  const { status, stderr } = i2i('bogus');
  assert.notEqual(status, 0);
  assert.match(stderr, /unknown mode "bogus"/);
});

test('no mode prints usage and exits non-zero', () => {
  const { status, stderr } = i2i();
  assert.notEqual(status, 0);
  assert.match(stderr, /^Usage: i2i/);
});

test('package.json, if present, declares no runtime dependencies', (t) => {
  if (!existsSync(PACKAGE_JSON)) return t.skip('no package.json');
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies', 'bundleDependencies']) {
    assert.equal(pkg[field], undefined, `package.json declares ${field}`);
  }
});
