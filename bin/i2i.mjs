#!/usr/bin/env node
// i2i: the deterministic spine of idea-to-issues. Zero dependencies, Node 20+.
import { parseSpecs, checkSpecs, renderTable, formatFinding } from './lib/spec.mjs';
import { STAGES, repoRoot, resolveGate, requireStage, stamp } from './lib/gate.mjs';

const MODES = {
  check: { usage: 'check [--render] <dir>', summary: 'validate the spec blocks before gate 3', issue: 5 },
  file: { usage: 'file --dry-run | --apply [--limit N]', summary: 'file Issues, links, labels and Project items in dependency order', issue: 7 },
  verify: { usage: 'verify', summary: 'compare the approved spec blocks with what GitHub holds', issue: 8 },
  gate: { usage: 'gate stamp <doc> | require <stage>', summary: 'write and check the approval front matter', issue: 6 },
};

const HELP = `Usage: i2i <mode> [options]

Modes:
${Object.values(MODES).map((m) => `  ${m.usage.padEnd(38)}${m.summary}`).join('\n')}

Options:
  -h, --help                            show this help
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

  process.stderr.write(`i2i ${mode}: not implemented yet (#${MODES[mode].issue})\n`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
