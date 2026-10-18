// Reading GitHub through gh. Every mode keys an issue by the [KEY] or [KEY-N] prefix of its title.
import { spawnSync } from 'node:child_process';

const LIMIT = 1000;
const KEY_IN_TITLE = /^\[([A-Z][A-Z0-9]*(?:-[1-9]\d*)?)\]/;

export function gh(root, args, input) {
  const r = spawnSync('gh', args, { cwd: root, encoding: 'utf8', input, env: { ...process.env, GH_PROMPT_DISABLED: '1' } });
  if (r.error?.code === 'ENOENT') throw new Error('gh is not installed or not on PATH');
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(r.stderr.trim() || `gh exited with status ${r.status}`);
  return r.stdout;
}

// A listing that hit its limit may hide the rest: a plan built on it would duplicate issues,
// and a verify would report the hidden keys as missing.
export function list(root, noun, args) {
  let rows;
  try {
    rows = JSON.parse(gh(root, [noun, 'list', '--limit', String(LIMIT), ...args]));
  } catch (err) {
    throw new Error(`gh ${noun} list failed: ${err.message}`);
  }
  if (rows.length >= LIMIT) throw new Error(`gh ${noun} list returned ${LIMIT} ${noun === 'issue' ? 'issues' : 'labels'}, its limit, so the listing may be truncated; nothing was written`);
  return rows;
}

// Every issue, open and closed, in number order, and the issues that hold each key.
export function readIssues(root, fields) {
  const issues = list(root, 'issue', ['--state', 'all', '--json', fields]).sort((a, b) => a.number - b.number);
  const truncated = issues.find((i) => (i.blockedBy?.totalCount ?? 0) > (i.blockedBy?.nodes.length ?? 0));
  if (truncated) throw new Error(`gh issue list returned only part of the blockers of #${truncated.number}, so the listing may be truncated; nothing was written`);
  const groups = new Map();
  for (const i of issues) {
    const key = KEY_IN_TITLE.exec(i.title)?.[1];
    if (key) groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  return { issues, groups };
}
