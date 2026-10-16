#!/usr/bin/env node
// i2i: the deterministic spine of idea-to-issues. Zero dependencies, Node 20+.

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

  process.stderr.write(`i2i ${mode}: not implemented yet (#${MODES[mode].issue})\n`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
