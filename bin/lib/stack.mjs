import { readFileSync } from 'node:fs';

// The owner's default for every stack category, and the concept question that decides whether a
// product needs it. The research behind each default is docs/stack-defaults.md.

// Categories that share a question are needed together: a browser UI needs a web framework, web
// hosting and a UI library; server-side data needs data access, an engine and its hosting.
const MONOREPO = 'Will the product ship more than one deployable app or service, such as a web app and an API, from one codebase?';
const WEB = 'Does the product need a user interface in the browser, or is it an API, a CLI or an integration only?';
const API = 'Does the product need server-side logic or data shared between users, or can it run entirely in the browser?';
const DATA = 'Does the product store data on a server: records that outlive a session or are shared between users?';

// `question` is null exactly when `always` is true: an always-needed category is never asked about.
export const CATEGORIES = [
  { category: 'monorepo', default: 'Nx', question: MONOREPO, always: false },
  { category: 'web-framework', default: 'Angular', question: WEB, always: false },
  { category: 'web-hosting', default: 'Vercel', question: WEB, always: false },
  { category: 'ui-library', default: 'spartan/ui (Tailwind CSS v4)', question: WEB, always: false },
  { category: 'api-framework', default: 'NestJS', question: API, always: false },
  { category: 'api-hosting', default: 'Railway', question: API, always: false },
  { category: 'data-access', default: 'Prisma 7 (prisma@7)', question: DATA, always: false },
  { category: 'database-engine', default: 'PostgreSQL', question: DATA, always: false },
  { category: 'database-hosting', default: 'Railway Postgres', question: DATA, always: false },
  { category: 'auth', default: 'Better Auth', question: 'Will people sign in to the product, or does any of its data belong to a specific person?', always: false },
  { category: 'file-storage', default: 'Cloudflare R2', question: 'Will users upload or download files in the product, such as images, documents or exports?', always: false },
  { category: 'email', default: 'Resend', question: 'Must the product ever email a user, such as a sign-in link, a password reset, a receipt or an alert?', always: false },
  { category: 'push', default: 'Web Push (VAPID)', question: 'Must the product alert users while they do not have it open?', always: false },
  { category: 'payments', default: 'Paddle', question: 'Will users pay money inside the product: a subscription, a one-off purchase or usage charges?', always: false },
  { category: 'ai-api', default: 'Anthropic Claude API via the AI SDK', question: 'Does any feature need to generate, summarise, classify or converse in natural language rather than follow fixed rules?', always: false },
  { category: 'ci-cd', default: 'GitHub Actions', question: null, always: true },
  { category: 'error-tracking', default: 'Sentry (EU region)', question: null, always: true },
  { category: 'analytics', default: 'PostHog Cloud EU', question: null, always: true },
];

// The research behind the defaults, shipped with the plugin. Resolved from this file, as test/stack.test.mjs does,
// so the skill never reads outside its directory.
const DEFAULTS_DOC = new URL('../../docs/stack-defaults.md', import.meta.url);

// One block per category, all of them by default: its CATEGORIES fields, then its section of
// docs/stack-defaults.md, the lines after its `## \`<category>\`: …` heading up to the next `## ` heading.
export function renderDefaults(names = []) {
  const all = CATEGORIES.map((c) => c.category);
  for (const n of names) {
    if (!all.includes(n)) throw new Error(`"${n}" is not a category; the categories are ${all.join(', ')}`);
  }
  const parts = readFileSync(DEFAULTS_DOC, 'utf8').split(/^## /m);
  const blocks = (names.length === 0 ? all : names).map((name) => {
    const c = CATEGORIES.find((x) => x.category === name);
    const part = parts.find((p) => p.startsWith(`\`${name}\`:`));
    if (part === undefined) throw new Error(`docs/stack-defaults.md has no section for ${name}`);
    const nl = part.indexOf('\n');
    const heading = nl === -1 ? part : part.slice(0, nl);
    const body = nl === -1 ? '' : part.slice(nl + 1).trim();
    return `## ${heading}\ncategory: ${name}\ndefault: ${c.default}\nalways: ${c.always ? 'yes' : 'no'}\nquestion: ${c.question ?? 'none'}\n\n${body}\n`;
  });
  return blocks.join('\n');
}
