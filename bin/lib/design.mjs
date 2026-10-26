// The design stage's one deterministic step: a PNG per screen of docs/design/prototype.html, through headless Chrome.
// Chrome is driven over the DevTools pipe (no port, no WebSocket): `--window-size` does not give an exact viewport
// in headless mode, and the system theme leaks into `prefers-color-scheme`, so both are set by protocol command.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const SHOT_BUDGET_MS = 60_000;

// One Chrome per shot: set the viewport and the light theme, load the page, capture, close.
// Resolves { data } (base64 PNG) or { error }; the child is always gone and the timer cleared when it does.
async function capture(chromePath, profile, url, [width, height], launch) {
  const argv = ['--headless', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--remote-debugging-pipe', 'about:blank'];
  const child = launch(chromePath, argv, { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stdio[2]?.on('data', (d) => { stderr += d; });
  const tail = () => (stderr.trim() ? `: ${stderr.trim()}` : '');

  // Settles when the child is gone, whichever way (a failed spawn emits 'error', and maybe 'close').
  let gone = false;
  let onGone;
  const exited = new Promise((r) => { onGone = r; });
  const dead = new Promise((r) => {
    child.once('error', (err) => { gone = true; r({ error: err.message }); onGone(); });
    child.once('close', (code) => { gone = true; r({ error: stderr.trim() || `Chrome exited with code ${code}` }); onGone(); });
  });

  let nextId = 0;
  const pending = new Map();
  const waiters = [];
  let buf = '';
  child.stdio[4]?.setEncoding('utf8');
  child.stdio[4]?.on('data', (chunk) => {
    buf += chunk;
    let end;
    while ((end = buf.indexOf('\0')) !== -1) {
      const raw = buf.slice(0, end);
      buf = buf.slice(end + 1);
      if (!raw) continue;
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        continue; // not a protocol message; a missing reply ends in the timeout
      }
      if (msg.id !== undefined) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (p) msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result ?? {});
      } else {
        const at = waiters.findIndex((w) => w.method === msg.method && w.sessionId === msg.sessionId);
        if (at !== -1) waiters.splice(at, 1)[0].resolve(msg.params ?? {});
      }
    }
  });
  child.stdio[3]?.on('error', () => {}); // a dead child shows up through `dead`
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { method, resolve, reject });
    child.stdio[3].write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
  });
  const event = (method, sessionId) => new Promise((resolve) => { waiters.push({ method, sessionId, resolve }); });

  const sequence = async () => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }, sessionId);
    await send('Page.enable', {}, sessionId);
    const loaded = event('Page.loadEventFired', sessionId);
    const nav = await send('Page.navigate', { url }, sessionId);
    if (nav.errorText) return { error: `Page.navigate: ${nav.errorText}` };
    await loaded;
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    return { data };
  };

  let timer;
  const timeout = new Promise((r) => { timer = setTimeout(() => r({ timedOut: true }), SHOT_BUDGET_MS); });
  const wrapped = sequence().catch((err) => ({ error: err.message }));
  let result = await Promise.race([wrapped, dead, timeout]);
  clearTimeout(timer);
  if (result.timedOut) result = { error: `timed out after 60 s${tail()}` };
  else if (result.data && !gone) {
    // Ask Chrome to quit so it flushes its profile; the kill below is only the backstop.
    send('Browser.close').catch(() => {});
    let grace;
    await Promise.race([exited, new Promise((r) => { grace = setTimeout(r, 5000); })]);
    clearTimeout(grace);
  }
  child.kill('SIGKILL');
  if (!gone) await exited;
  return result;
}

export async function shots(dir, { env = process.env, launch = spawn } = {}) {
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
        const url = `${pathToFileURL(resolve(dir, 'prototype.html')).href}#${id}`;
        const r = await capture(chrome.path, profile, url, [w, h], launch);
        if (r.data) writeFileSync(out, Buffer.from(r.data, 'base64'));
        if (r.error !== undefined || !existsSync(out)) {
          return { code: 1, files, screens: ids.length, problems: [`screenshot of ${id} at ${name} failed: ${r.error ?? 'no screenshot written'}`] };
        }
        files.push(`${dir}/png/${id}-${name}.png`);
      }
    }
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
  return { code: 0, files, screens: ids.length, problems: [] };
}
