#!/usr/bin/env node
// i2i: the deterministic spine of idea-to-issues. Zero dependencies, Node 20+.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSpecs, checkSpecs, renderTable, formatFinding } from './lib/spec.mjs';
import { STAGES, repoRoot, resolveGate, requireStage, stamp } from './lib/gate.mjs';
import { renderDefaults, parseRulings, checkStack } from './lib/stack.mjs';
import { planFile, describe, perform } from './lib/file.mjs';
import { readIssues } from './lib/github.mjs';
import { verifyIssues, formatDefect, waitSettled } from './lib/verify.mjs';
import { shots, checkDesign } from './lib/design.mjs';

const MODES = {
  check: { usage: 'check [--render] <dir>', summary: 'validate the spec blocks before gate 3' },
  file: { usage: 'file --dry-run | --apply [--limit N] [--project <title>]', summary: 'file Issues, links, labels and Project items in dependency order' },
  verify: { usage: 'verify [--wait] [--interval <s>] [--timeout <s>]', summary: 'compare the approved spec blocks with what GitHub holds' },
  gate: { usage: 'gate stamp <doc> | require <stage>', summary: 'write and check the approval front matter' },
  stack: { usage: 'stack defaults [<category>…] | check [<dir>]', summary: 'print the research behind each stack category, or check docs/stack.md against docs/CONCEPT.md' },
  design: { usage: 'design shots [<dir>] | check [<dir>]', summary: 'screenshot every data-screen of docs/design/prototype.html at mobile and desktop widths, or check docs/design/index.md against the prototype' },
};

// Seconds between two --wait polls, and the most --wait spends before it gives up.
const WAIT = { interval: 5, timeout: 120 };

const COL = Math.max(...Object.values(MODES).map((m) => m.usage.length)) + 2;
const HELP = `Usage: i2i <mode> [options]

Modes:
${Object.values(MODES).map((m) => `  ${m.usage.padEnd(COL)}${m.summary}`).join('\n')}

Options:
  ${'-h, --help'.padEnd(COL)}show this help
`;

function runCheck(args) {
  let render = false;
  let dir;
  for (const arg of args) {
    if (arg === '--render') render = true;
    else if (arg.startsWith('--') || dir !== undefined) {
      process.stderr.write('Usage: i2i check [--render] <dir>\n');
      return 2;
    } else dir = arg;
  }
  if (dir === undefined) {
    process.stderr.write('Usage: i2i check [--render] <dir>\n');
    return 2;
  }
  let spec;
  try {
    spec = parseSpecs(dir);
  } catch (err) {
    process.stderr.write(`i2i check: ${err.code === 'ENOENT' ? `${dir} does not exist` : err.message}\n`);
    return 2;
  }
  if (spec.files.length === 0) {
    process.stderr.write(`i2i check: no epic files in ${dir}\n`);
    return 2;
  }
  const { findings, order } = checkSpecs(spec);
  if (findings.length > 0) {
    process.stderr.write(findings.map((f) => `${formatFinding(f)}\n`).join('') + `check: ${findings.length} finding(s)\n`);
    return 1;
  }
  if (render) {
    process.stdout.write(renderTable(order));
    return 0;
  }
  const acs = spec.epics.reduce((sum, e) => sum + e.acs.length, 0);
  process.stdout.write(`check: ${spec.epics.length} epics, ${order.length} tickets, ${acs} ACs, 0 findings\n`);
  return 0;
}

function runStack(args) {
  const [action, ...names] = args;
  const usage = 'Usage: i2i stack defaults [<category>…] | check [<dir>]\n';
  if (action === 'check') return runStackCheck(names, usage);
  if (action !== 'defaults') {
    process.stderr.write(usage);
    return 2;
  }
  try {
    process.stdout.write(renderDefaults(names));
    return 0;
  } catch (err) {
    process.stderr.write(`i2i stack defaults: ${err.message}\n`);
    return /is not a category/.test(err.message) ? 2 : 1;
  }
}

function runStackCheck(args, usage) {
  const [dir = 'docs', ...extra] = args;
  if (extra.length > 0 || dir.startsWith('--')) {
    process.stderr.write(usage);
    return 2;
  }
  const stackFile = join(dir, 'stack.md');
  const conceptFile = join(dir, 'CONCEPT.md');
  let stackText;
  let conceptText;
  let path = stackFile;
  try {
    stackText = readFileSync(stackFile, 'utf8');
    path = conceptFile;
    conceptText = readFileSync(conceptFile, 'utf8');
  } catch (err) {
    process.stderr.write(`i2i stack check: ${err.code === 'ENOENT' ? `${path} does not exist` : err.message}\n`);
    return err.code === 'ENOENT' ? 2 : 1;
  }
  const { findings, rows, ledger, mapped } = checkStack(stackFile, stackText, parseRulings(conceptText));
  if (findings.length > 0) {
    process.stderr.write(findings.map((f) => `${formatFinding(f)}\n`).join('') + `stack check: ${findings.length} finding(s)\n`);
    return 1;
  }
  process.stdout.write(`stack check: ${rows} rows, ${ledger} ledger lines, ${mapped} rulings mapped, 0 findings\n`);
  return 0;
}

async function runDesign(args) {
  const [action, dir = 'docs/design', ...extra] = args;
  if (!['shots', 'check'].includes(action) || extra.length > 0 || dir.startsWith('--')) {
    process.stderr.write('Usage: i2i design shots [<dir>] | check [<dir>]\n');
    return 2;
  }
  if (action === 'check') return runDesignCheck(dir);
  const { code, files, screens, problems } = await shots(dir);
  if (code === 0) {
    process.stdout.write(files.map((f) => `  ${f}\n`).join('') + `design shots: ${screens} screens, ${files.length} files\n`);
    return 0;
  }
  process.stderr.write(problems.map((p) => `i2i design shots: ${p}\n`).join(''));
  return code;
}

function runDesignCheck(dir) {
  const { code, findings, problems, screens, transitions, noUi } = checkDesign(dir);
  if (code === 2 || (code === 1 && findings.length === 0)) {
    process.stderr.write(problems.map((p) => `i2i design check: ${p}\n`).join(''));
    return code;
  }
  if (findings.length > 0) {
    process.stderr.write(findings.map((f) => `${formatFinding(f)}\n`).join('') + `design check: ${findings.length} finding(s)\n`);
    return 1;
  }
  process.stdout.write(noUi ? `design check: no screens (ui-library excluded by Ruling ${noUi.ruling}), 0 findings\n` : `design check: ${screens} screens, ${transitions} transitions, 0 findings\n`);
  return 0;
}

function runGate(args) {
  const [action, target, ...rest] = args;
  if (!['stamp', 'require'].includes(action) || target === undefined || rest.length > 0) {
    process.stderr.write('Usage: i2i gate stamp <doc> | require <stage>\n');
    return 2;
  }
  const cwd = process.cwd();
  const root = repoRoot(cwd);
  if (root === undefined) {
    process.stderr.write(`i2i gate: ${cwd} is not inside a git repository\n`);
    return 2;
  }
  const gates = Object.keys(STAGES).filter((s) => STAGES[s].gate);
  const name = action === 'stamp' ? resolveGate(root, cwd, target) : Object.hasOwn(STAGES, target) ? target : undefined;
  if (name === undefined) {
    process.stderr.write(action === 'stamp'
      ? `i2i gate stamp: "${target}" is not a gate; the gates are ${gates.join(', ')}, or their documents ${gates.map((s) => STAGES[s].doc).join(', ')}\n`
      : `i2i gate require: "${target}" is not a stage; the stages are ${Object.keys(STAGES).join(', ')}\n`);
    return 2;
  }
  const result = action === 'stamp' ? stamp(root, name) : requireStage(root, name);
  for (const note of result.notes) process.stderr.write(`i2i gate: note: ${note}\n`);
  if (result.problems.length > 0) {
    const what = action === 'stamp' ? `${name} is not approved` : `${name} may not start`;
    process.stderr.write(result.problems.map((p) => `i2i gate: ${p}\n`).join('') + `gate: ${what} (${result.problems.length} problem(s))\n`);
    return 1;
  }
  if (action === 'stamp') {
    process.stdout.write(`gate: approved ${result.doc}\n${Object.entries(result.keys).map(([k, v]) => `  ${k}: ${v}\n`).join('')}Commit ${result.doc} before the next gate is approved.\n`);
  } else {
    process.stdout.write(result.gates.length > 0 ? `gate: ${name} may start (checked ${result.gates.join(', ')})\n` : `gate: ${name} has no gate before it\n`);
  }
  return 0;
}

// The spec blocks gate 3 approved: the gate holds and check passes. Otherwise it reports why
// and returns the exit code instead.
function approvedSpec(mode, err, bare) {
  const cwd = process.cwd();
  const root = repoRoot(cwd);
  if (root === undefined) {
    err(`${cwd} is not inside a git repository`);
    return { code: 2 };
  }
  const gate = requireStage(root, 'file');
  for (const note of gate.notes) err(`note: ${note}`);
  if (gate.problems.length > 0) {
    gate.problems.forEach(err);
    bare(`${mode}: may not run (${gate.problems.length} problem(s))`);
    return { code: 1 };
  }
  let spec;
  try {
    spec = parseSpecs(join(root, STAGES.specs.doc));
    if (spec.files.length === 0) throw new Error(`no epic files in ${STAGES.specs.doc}`);
  } catch (e) {
    err(e.message);
    return { code: 1 };
  }
  const { findings, order } = checkSpecs(spec);
  if (findings.length > 0) {
    findings.forEach((f) => bare(formatFinding(f)));
    bare(`${mode}: check found ${findings.length} finding(s)`);
    return { code: 1 };
  }
  return { root, spec, order };
}

function runFile(args) {
  const usage = () => {
    process.stderr.write('Usage: i2i file --dry-run | --apply [--limit N] [--project <title>]\n');
    return 2;
  };
  let apply, limit, project;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run' || a === '--apply') {
      if (apply !== undefined) return usage();
      apply = a === '--apply';
    } else if (a === '--limit' || a === '--project') {
      const v = args[++i];
      if (!v || v.startsWith('--') || (a === '--limit' ? limit : project) !== undefined || (a === '--limit' && !/^[1-9]\d*$/.test(v))) return usage();
      if (a === '--limit') limit = Number(v);
      else project = v;
    } else return usage();
  }
  if (apply === undefined || (limit !== undefined && !apply)) return usage();
  const err = (s) => process.stderr.write(`i2i file: ${s}\n`);
  const bare = (s) => process.stderr.write(`${s}\n`);
  const out = (s) => process.stdout.write(`${s}\n`);
  const approved = approvedSpec('file', err, bare);
  if (approved.code !== undefined) return approved.code;
  const { root, spec, order } = approved;
  let plan;
  try {
    plan = planFile(root, spec, order, project);
  } catch (e) {
    err(e.message);
    return 1;
  }
  const { writes, existing, numbers } = plan;
  out(`file: ${spec.epics.length} epic(s), ${order.length} ticket(s); ${existing} already on GitHub`);
  if (!project) err('note: no --project given, so no epic is added to a Project');
  if (writes.length === 0) {
    out('file: GitHub already holds every key, nothing to write');
    return 0;
  }
  if (!apply) {
    writes.forEach((w, i) => out(`  ${i + 1}. ${describe(w, numbers)}`));
    out(`file: dry run, ${writes.length} write(s) planned, none made`);
    return 0;
  }
  let made = 0;
  for (const w of writes) {
    if (made === limit) {
      out(`file: stopped after ${made} write(s), ${writes.length - made} remaining: run file --apply again`);
      return 0;
    }
    try {
      const n = perform(root, w, numbers);
      out(`  ${++made}. ${describe(w, numbers)}${n ? ` → #${n}` : ''}`);
    } catch (e) {
      err(`write ${made + 1} failed: ${e.message}`);
      bare(`file: ${made} write(s) made before the failure: run file --apply again; keys already on GitHub are skipped`);
      return 1;
    }
  }
  out(`file: ${made} write(s) made`);
  return 0;
}

function runVerify(args) {
  const usage = () => {
    process.stderr.write('Usage: i2i verify [--wait] [--interval <s>] [--timeout <s>]\n');
    return 2;
  };
  let wait = false;
  const seconds = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--wait' && !wait) wait = true;
    else if (a === '--interval' || a === '--timeout') {
      const name = a.slice(2);
      const v = args[++i];
      if (!/^(\d+\.?\d*|\.\d+)$/.test(v ?? '') || Number(v) <= 0 || seconds[name] !== undefined) return usage();
      seconds[name] = Number(v);
    } else return usage();
  }
  if (!wait && Object.keys(seconds).length > 0) return usage();
  const err = (s) => process.stderr.write(`i2i verify: ${s}\n`);
  const bare = (s) => process.stderr.write(`${s}\n`);
  const out = (s) => process.stdout.write(`${s}\n`);
  const approved = approvedSpec('verify', err, bare);
  if (approved.code !== undefined) return approved.code;
  const { root, spec, order } = approved;
  const read = () => readIssues(root, wait ? 'number,title,parent,blockedBy,projectItems' : 'number,title,parent,blockedBy');
  let listing;
  try {
    const { interval, timeout } = { ...WAIT, ...seconds };
    listing = wait ? waitSettled(read, { interval: interval * 1000, timeout: timeout * 1000 }) : read();
  } catch (e) {
    err(e.message);
    return 1;
  }
  if (wait) out(`verify: the listing settled after ${listing.polls} polls`);
  const defects = verifyIssues(spec, order, listing.groups);
  if (defects.length > 0) {
    defects.forEach((d) => bare(formatDefect(d)));
    bare(`verify: ${defects.length} defect(s)`);
    return 1;
  }
  out(`verify: ${spec.epics.length} epic(s), ${order.length} ticket(s); GitHub holds each key once, with its parent and blockers`);
  return 0;
}

function main(argv) {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) {
    process.stderr.write(`i2i: Node 20 or later is required (found ${process.versions.node})\n`);
    return 1;
  }

  const [mode] = argv;
  if (mode === undefined) {
    process.stderr.write(HELP);
    return 2;
  }
  if (mode === '-h' || mode === '--help' || mode === 'help') {
    process.stdout.write(HELP);
    return 0;
  }
  if (!Object.hasOwn(MODES, mode)) {
    process.stderr.write(`i2i: unknown mode "${mode}". Run "i2i --help" for the list of modes.\n`);
    return 2;
  }

  if (mode === 'check') return runCheck(argv.slice(1));
  if (mode === 'gate') return runGate(argv.slice(1));
  if (mode === 'file') return runFile(argv.slice(1));
  if (mode === 'stack') return runStack(argv.slice(1));
  if (mode === 'design') return runDesign(argv.slice(1));
  return runVerify(argv.slice(1));
}

process.exitCode = await main(process.argv.slice(2));
