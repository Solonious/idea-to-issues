// Verify mode: compare the approved spec blocks with what GitHub holds, reading native links only.
// It never writes; the only gh call is `issue list`.

// The defects of one listing: every missing or duplicate key, epics before tickets, then the missing links,
// tickets in dependency order.
export function verifyIssues(spec, order, groups) {
  const defects = [];
  const add = (key, rule, message) => defects.push({ key, rule, message });
  const held = new Map();
  for (const key of [...spec.epics.map((e) => e.key), ...order.map((t) => t.key)]) {
    const g = groups.get(key) ?? [];
    if (g.length === 0) add(key, 'missing-issue', `no issue holds ${key}`);
    else if (g.length > 1) add(key, 'duplicate-issue', `${key} held by ${g.map((i) => `#${i.number}`).join(' and ')}`);
    else held.set(key, g[0]);
  }
  // A key that is missing or held twice is reported once, above, and not again as a link of its neighbours.
  for (const t of order) {
    const i = held.get(t.key);
    if (!i) continue;
    const epic = held.get(t.epic);
    if (epic && i.parent?.number !== epic.number) {
      add(t.key, 'parent', `#${i.number} has ${i.parent ? `parent #${i.parent.number}` : 'no parent'}, expected #${epic.number} (${t.epic})`);
    }
    const have = new Set((i.blockedBy?.nodes ?? []).map((n) => n.number));
    for (const b of t.blockedBy) {
      const blocker = held.get(b);
      if (blocker && !have.has(blocker.number)) add(t.key, 'missing-blocker', `#${i.number} is not blocked by #${blocker.number} (${b})`);
    }
  }
  return defects;
}

export function formatDefect(d) {
  return `[${d.key}] ${d.rule}: ${d.message}`;
}

// What two polls must agree on. A Project item's status is left out: it moves from Todo to Done on its own.
function snapshot(issues) {
  return JSON.stringify(issues.map((i) => [
    i.number,
    i.title,
    i.parent?.number ?? null,
    (i.blockedBy?.nodes ?? []).map((n) => n.number).sort((a, b) => a - b),
    i.projectItems?.length ?? 0,
  ]));
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Reads until two consecutive polls agree, so a listing GitHub is still filling in is never verified.
// Gives up once the next poll would start after `timeout`.
export function waitSettled(read, { interval, timeout }) {
  const start = Date.now();
  let last;
  for (let polls = 1; ; polls++) {
    const listing = read();
    const now = snapshot(listing.issues);
    if (now === last) return { ...listing, polls };
    last = now;
    if (Date.now() - start + interval > timeout) {
      throw new Error(`no two consecutive polls agreed in ${timeout / 1000}s (${polls} poll(s)), so nothing was verified: run verify --wait again`);
    }
    sleep(interval);
  }
}
