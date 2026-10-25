// The design stage's one deterministic step: a PNG per screen of docs/design/prototype.html, through headless Chrome.
// Pure lookups and one spawn per shot; the caller prints.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CHROME_CANDIDATES = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'google-chrome', 'chromium', 'chromium-browser'];
export const SIZES = { mobile: [390, 844], desktop: [1440, 900] };

// `I2I_CHROME` wins and is never second-guessed: set but missing is a miss, not a fall-through.
export function findChrome(env = process.env) {
  if (env.I2I_CHROME) return existsSync(env.I2I_CHROME) ? { path: env.I2I_CHROME } : { missing: [`I2I_CHROME=${env.I2I_CHROME}`] };
  const dirs = (env.PATH ?? '').split(delimiter).filter(Boolean);
  for (const name of CHROME_CANDIDATES) {
    if (isAbsolute(name)) {
      if (existsSync(name)) return { path: name };
      continue;
    }
    for (const dir of dirs) if (existsSync(join(dir, name))) return { path: join(dir, name) };
  }
  return { missing: ['I2I_CHROME (unset)', ...CHROME_CANDIDATES] };
}

// The unique `data-screen` values, in document order.
export function screenIds(html) {
  return [...new Set([...html.matchAll(/data-screen="([^"]+)"/g)].map((m) => m[1]))];
}

export function shots(dir, { env = process.env, run = spawnSync } = {}) {
  const file = join(dir, 'prototype.html');
  let html;
  try {
    html = readFileSync(file, 'utf8');
  } catch (err) {
    return { code: err.code === 'ENOENT' ? 2 : 1, files: [], screens: 0, problems: [err.code === 'ENOENT' ? `${file} does not exist` : err.message] };
  }
  const ids = screenIds(html);
  if (ids.length === 0) return { code: 1, files: [], screens: 0, problems: [`no data-screen in ${file}`] };
  const chrome = findChrome(env);
  if (chrome.missing) return { code: 2, files: [], screens: ids.length, problems: ['no Chrome found; looked for:', ...chrome.missing.map((m) => `  ${m}`)] };

  mkdirSync(join(dir, 'png'), { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), 'i2i-shots-'));
  const files = [];
  try {
    for (const id of ids) {
      for (const [name, [w, h]] of Object.entries(SIZES)) {
        const out = resolve(dir, 'png', `${id}-${name}.png`);
        // A PNG left by an earlier run must not pass for this one.
        rmSync(out, { force: true });
        const argv = ['--headless', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, `--window-size=${w},${h}`, `--screenshot=${out}`, `${pathToFileURL(resolve(dir, 'prototype.html')).href}#${id}`];
        const r = run(chrome.path, argv, { encoding: 'utf8', timeout: 60_000 });
        if (r.status !== 0 || !existsSync(out)) {
          return { code: 1, files, screens: ids.length, problems: [`screenshot of ${id} at ${name} failed: ${(r.stderr ?? '').trim()}`] };
        }
        files.push(`${dir}/png/${id}-${name}.png`);
      }
    }
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
  return { code: 0, files, screens: ids.length, problems: [] };
}
