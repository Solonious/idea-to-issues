// The design stage's one deterministic step: a PNG per screen of docs/design/prototype.html, through headless Chrome.
// Chrome is driven over the DevTools pipe (no port, no WebSocket): `--window-size` does not give an exact viewport
// in headless mode, and the system theme leaks into `prefers-color-scheme`, so both are set by protocol command.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contentLines } from './stack.mjs';

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
  return [...new Set(parsePrototype(html).screens.map((s) => s.id))];
}

const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const TAG = new RegExp(
  [
    '<!--[\\s\\S]*?-->',
    '<script\\b[^>]*>[\\s\\S]*?<\\/script\\s*>',
    '<style\\b[^>]*>[\\s\\S]*?<\\/style\\s*>',
    '<\\/([a-zA-Z][\\w-]*)\\s*>',
    '<([a-zA-Z][\\w-]*)((?:\\s+[^\\s=>\\/]+(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s>]+))?)*)\\s*(\\/?)>',
  ].join('|'),
  'g',
);
const ATTR = /\b(data-screen|data-state|data-to)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

// The screens, states and transitions of a prototype, read from the tags. Comments, <script> and <style> bodies
// are skipped; a `data-state` belongs to the nearest open `data-screen` element, else it is `loose`.
export function parsePrototype(html) {
  const screens = [];
  const transitions = [];
  const loose = [];
  const stack = [];
  let line = 1;
  let last = 0;
  for (const m of html.matchAll(TAG)) {
    line += html.slice(last, m.index).split('\n').length - 1;
    last = m.index;
    if (m[1] !== undefined) {
      const at = stack.findLastIndex((f) => f.name === m[1]);
      if (at >= 0) stack.length = at;
      continue;
    }
    if (m[2] === undefined) continue;
    const frame = { name: m[2], screen: false };
    const attrs = {};
    for (const a of m[3].matchAll(ATTR)) {
      const value = a[2] ?? a[3] ?? a[4];
      if (a[1] === 'data-to') transitions.push({ to: value, line });
      else attrs[a[1]] = value;
    }
    if (attrs['data-screen'] !== undefined) {
      screens.push({ id: attrs['data-screen'], line, states: [] });
      frame.screen = screens.at(-1);
    }
    if (attrs['data-state'] !== undefined) {
      const owner = stack.findLast((f) => f.screen);
      if (owner) owner.screen.states.push({ name: attrs['data-state'], line });
      else loose.push({ name: attrs['data-state'], line });
    }
    if (m[4] !== '/' && !VOID.has(m[2].toLowerCase())) stack.push(frame);
  }
  return { screens, transitions, loose };
}

// docs/design/index.md: the no-UI line, the Inventory ids, the Flows endpoints. Real line numbers, front matter skipped.
export function parseIndex(text) {
  let noUi = null;
  const inventory = [];
  const badIds = [];
  const flows = [];
  let section = null;
  for (const { line, at } of contentLines(text)) {
    const h = /^## (.+)$/.exec(line);
    if (h) section = h[1];
    const n = /^No screens: ui-library excluded by Ruling ([1-9]\d*)$/.exec(line);
    if (n && !noUi) noUi = { ruling: Number(n[1]), line: at };
    if (section === 'Inventory') {
      const r = /^\| [^|]* \| ([^|]*) \| /.exec(line);
      if (!r) continue;
      const cell = r[1].trim();
      if (cell === 'Id' || /^-+$/.test(cell)) continue;
      const id = /^`([a-z][a-z0-9-]*)`$/.exec(cell);
      if (id) inventory.push({ id: id[1], line: at });
      else badIds.push({ cell, line: at });
    } else if (section === 'Flows') {
      const r = /^\| ([^|]*) \| ([^|]*) \| /.exec(line);
      if (!r) continue;
      const [from, to] = [r[1], r[2]].map((c) => /^`([a-z][a-z0-9-]*)(?:\/(?:empty|filled|error))?`$/.exec(c.trim())?.[1] ?? null);
      if (from !== null || to !== null) flows.push({ from, to, line: at });
    }
  }
  return { noUi, inventory, badIds, flows };
}

const STATES = ['empty', 'filled', 'error'];
const ID = /^[a-z][a-z0-9-]*$/;

function readLabelled(root, dir, name) {
  const label = join(dir, name);
  try {
    return { label, text: readFileSync(resolve(root, dir, name), 'utf8') };
  } catch (err) {
    return { label, problem: err.code === 'ENOENT' ? `${label} does not exist` : err.message, code: err.code === 'ENOENT' ? 2 : 1 };
  }
}

// Checks docs/design/index.md against docs/design/prototype.html. Resolves { code, findings, problems, screens,
// transitions, noUi } like shots: 0 clean, 1 findings, 2 a missing file.
export function checkDesign(dir, { root = process.cwd() } = {}) {
  const findings = [];
  const fail = (r) => ({ code: r.code, findings, problems: [r.problem], screens: 0, transitions: 0, noUi: null });
  const index = readLabelled(root, dir, 'index.md');
  if (index.problem) return fail(index);
  const idx = parseIndex(index.text);
  const protoLabel = join(dir, 'prototype.html');
  const add = (file, line, key, rule, message) => findings.push({ file, line, key, rule, message });
  let screens = 0;
  let transitions = 0;
  if (idx.noUi) {
    if (existsSync(resolve(root, protoLabel))) add(protoLabel, 1, 'prototype.html', 'stray-prototype', 'the index is the no-UI form but a prototype.html exists');
  } else {
    const proto = readLabelled(root, dir, 'prototype.html');
    if (proto.problem) return fail(proto);
    const p = parsePrototype(proto.text);
    for (const b of idx.badIds) add(index.label, b.line, b.cell, 'bad-screen-id', `Id "${b.cell}" is not a backticked \`[a-z][a-z0-9-]*\` id`);
    const seen = new Map();
    const valid = [];
    for (const s of p.screens) {
      if (!ID.test(s.id)) add(protoLabel, s.line, s.id, 'bad-screen-id', `data-screen "${s.id}" is not a [a-z][a-z0-9-]* id`);
      else if (seen.has(s.id)) add(protoLabel, s.line, s.id, 'duplicate-screen', `data-screen "${s.id}" is already at line ${seen.get(s.id)}`);
      else {
        seen.set(s.id, s.line);
        valid.push(s);
      }
    }
    const ids = new Set(idx.inventory.map((r) => r.id));
    if (idx.inventory.length === 0) add(index.label, 1, 'inventory', 'no-screens', 'no `## Inventory` row with an Id, and not the no-UI form');
    else {
      for (const r of idx.inventory) {
        if (!seen.has(r.id)) add(index.label, r.line, r.id, 'screen-not-in-prototype', `\`${r.id}\` has no data-screen in prototype.html`);
      }
      for (const s of valid) {
        if (!ids.has(s.id)) add(protoLabel, s.line, s.id, 'screen-not-in-index', `data-screen "${s.id}" has no \`## Inventory\` row`);
      }
    }
    for (const s of valid) {
      const found = new Set();
      for (const st of s.states) {
        if (!STATES.includes(st.name)) add(protoLabel, st.line, `${s.id}/${st.name}`, 'bad-state', `data-state "${st.name}" is not empty, filled or error`);
        else if (found.has(st.name)) add(protoLabel, st.line, `${s.id}/${st.name}`, 'duplicate-state', `data-state "${st.name}" is already inside data-screen "${s.id}"`);
        else found.add(st.name);
      }
      for (const name of STATES) {
        if (!found.has(name)) add(protoLabel, s.line, `${s.id}/${name}`, 'missing-state', `no data-state="${name}" inside data-screen "${s.id}"`);
      }
    }
    for (const l of p.loose) add(protoLabel, l.line, l.name, 'bad-state', `data-state "${l.name}" is outside every data-screen`);
    for (const t of p.transitions) {
      const slash = t.to.indexOf('/');
      const screen = slash < 0 ? t.to : t.to.slice(0, slash);
      const state = slash < 0 ? undefined : t.to.slice(slash + 1);
      if (!seen.has(screen)) add(protoLabel, t.line, t.to, 'bad-transition-target', `data-to "${t.to}": no data-screen "${screen}"`);
      else if (state !== undefined && !STATES.includes(state)) add(protoLabel, t.line, t.to, 'bad-transition-target', `data-to "${t.to}": "${state}" is not empty, filled or error`);
    }
    for (const f of idx.flows) {
      for (const id of [f.from, f.to]) {
        if (id !== null && !ids.has(id)) add(index.label, f.line, id, 'unknown-screen', `\`${id}\` is not an \`## Inventory\` id`);
      }
    }
    screens = valid.length;
    transitions = p.transitions.length;
  }
  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return { code: findings.length > 0 ? 1 : 0, findings, problems: [], screens, transitions, noUi: idx.noUi };
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
