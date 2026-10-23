# Stack defaults

The owner's default for every category in `CATEGORIES` (`bin/lib/stack.mjs`), and the research behind each one. The stack stage argues each needed category as the default against the best alternative; this file is where the default and the options it was chosen from are recorded.

Researched on 2026-10-23. Every price, licence and date below comes from a source page opened that day; anything that could not be confirmed is listed under "Unverified". Defaults age: changing one is a PR to `CATEGORIES` and to its section here.

Each section gives the default, whether a product always needs the category, the options considered and the sources.

## `monorepo`: monorepo tooling

**Default:** Nx (ruled at the 2026-10-23 grill).
**Needed:** when the concept answers yes to: "Will the product ship more than one deployable app or service, such as a web app and an API, from one codebase?"

- **Nx** (default). MIT. Nx Cloud Hobby is free (50,000 credits a month, 5 contributors); Team is $29 a month plus $19 per contributor. Nx 23.1 supports Angular 22; Nx 24.0.0 shipped on 2026-10-21. Lock-in: medium (`project.json` and generators are Nx-specific; the code is plain TypeScript).
- **Turborepo**. MIT. A task runner and cache with no Angular or NestJS generators; the Vercel remote cache is free on every plan. Lock-in: low.
- **moon**. MIT. A Rust build tool with remote caching and toolchain management, no Angular tooling, a small community (4.2k stars).
- **pnpm workspaces** alone. Free, no task caching; fits small repositories only.

Why the default stands: the only option with current, first-class Angular support and generators, and a free tier that covers a small team.

Unverified: whether Nx Cloud credits roll over; what a credit buys per CI minute.

Sources: https://nx.dev/pricing, https://github.com/nrwl/nx, https://github.com/nrwl/nx/releases, https://nx.dev/blog/nx-23-1-release, https://github.com/vercel/turborepo, https://turborepo.dev/docs/core-concepts/remote-caching, https://github.com/moonrepo/moon, https://pnpm.io/workspaces

## `web-framework`: web framework

**Default:** Angular (ruled at the 2026-10-23 grill).
**Needed:** when the concept answers yes to: "Does the product need a user interface in the browser, or is it an API, a CLI or an integration only?"

- **Angular** (default). MIT. v22 released 2026-06-03, active until 2027-06 and in LTS until 2028-06; from v22 a major ships every 12 months instead of every 6.
- **Next.js** (React). MIT. The best-supported framework on Vercel, but it moves the web layer away from the owner's Angular expertise. Lock-in: high.
- **Nuxt** (Vue). MIT, v4.6.2. Supported on Vercel. Lock-in: high.
- **Analog**. MIT. A meta-framework on top of Angular (file routing, SSR, API routes); a small community (3.2k stars). An add-on, not a replacement.

Why the default stands: support runs into 2028, and it shares TypeScript and dependency injection with NestJS.

Sources: https://angular.dev/reference/releases, https://github.com/angular/angular, https://registry.npmjs.org/next/latest, https://vercel.com/docs/frameworks/frontend, https://github.com/nuxt/nuxt, https://github.com/analogjs/analog

## `web-hosting`: web hosting

**Default:** Vercel (ruled at the 2026-10-23 grill).
**Needed:** when the concept answers yes to: "Does the product need a user interface in the browser, or is it an API, a CLI or an integration only?"

- **Vercel** (default). Hobby is free but "for personal, non-commercial use"; Pro is $20 a month per paid seat with $20 of included credit. A commercial product starts at Pro. Angular is listed as a zero-configuration framework; Vercel's docs do not confirm Angular SSR.
- **Netlify**. Free, Personal $9 a month, Pro $20 a month with unlimited members. Documents Angular SSR through an Edge Function.
- **Cloudflare Workers** (static assets). Free 100k requests a day, Paid from $5 a month; static asset requests and egress are free. The Angular guide covers static builds only.
- **Firebase App Hosting**. Pay-as-you-go (Blaze) with monthly free quotas; supports Nx, but its Angular support table lists Angular only up to 19.2.

Why the default stands: low risk and cheap to leave for a client-rendered Angular build. Budget Pro for anything commercial; when a product needs Angular SSR, check Vercel's support first, with Netlify as the fallback.

Unverified: Vercel support for Angular SSR; whether Netlify Free allows commercial use.

Sources: https://vercel.com/pricing, https://vercel.com/docs/frameworks/frontend, https://www.netlify.com/pricing/, https://docs.netlify.com/build/frameworks/framework-setup-guides/angular/, https://developers.cloudflare.com/workers/platform/pricing/, https://firebase.google.com/docs/app-hosting/frameworks-tooling

## `api-framework`: API framework

**Default:** NestJS (ruled at the 2026-10-23 grill).
**Needed:** when the concept answers yes to: "Does the product need server-side logic or data shared between users, or can it run entirely in the browser?"

- **NestJS** (default). MIT. Two maintained lines: v12.2.0 (2026-10-19) and v11.2.8. Nest 12 needs Node 20.19+ or 22.12+. One TypeScript language with Angular and Prisma, and an Angular-like module structure.
- **Fastify**. v5.12.7; Nest can run on it as an adapter. Loses Nest's structure, which matters when agents build. Exit cost: moderate.
- **Hono**. A small multi-runtime framework with a Vercel adapter, no dependency injection; v5 is still a release candidate.
- **Express**. v5.3.0; the minimal classic, and one of the two HTTP adapters Nest runs on.

Why the default stands: actively maintained on two majors, and its structure suits work handed to agents. Start new projects on v12.

Unverified: the licences of Fastify, Hono and Express; the end-of-support date for Nest 11.

Sources: https://github.com/nestjs/nest/releases, https://docs.nestjs.com/migration-guide, https://docs.nestjs.com/faq/http-adapter, https://github.com/fastify/fastify/releases, https://github.com/honojs/hono/releases, https://github.com/expressjs/express/releases

## `api-hosting`: API hosting

**Default:** Railway (ruled at the 2026-10-23 grill).
**Needed:** when the concept answers yes to: "Does the product need server-side logic or data shared between users, or can it run entirely in the browser?"

- **Railway** (default). Hobby $5 a month including $5 of usage; Pro $20 per workspace including $20. RAM about $10 per GB-month, CPU about $20 per vCPU-month, egress $0.05 per GB. A small API at 0.5 GB of RAM costs about $5 a month. The database can share the API's private network.
- **Render**. Free web services sleep after 15 idle minutes; paid instance prices did not render on the pricing page.
- **Fly.io**. Micro-VMs from $2.19 a month (256 MB) to $8.78 (1 GB); more operations work than Railway.

Why the default stands: cheap usage-based pricing at small scale, and the database on the same private network.

Unverified: Render's dollar prices.

Sources: https://railway.com/pricing, https://docs.railway.com/pricing/plans, https://render.com/docs/free, https://render.com/docs/compute-plans, https://fly.io/pricing

## `data-access`: data access

**Default:** Prisma 7, pinned (`prisma@7`). Prisma was ruled at the 2026-10-23 grill; the version was ruled the same day after the research below. Revisit when Prisma 8 reaches general availability.
**Needed:** when the concept answers yes to: "Does the product store data on a server: records that outlive a session or are shared between users?"

- **Prisma 7** (default). Apache-2.0. Stable (7.10.1). Receives bug fixes and security updates for 18 months after Prisma 8 reaches general availability. Prisma advises installing `prisma@7` explicitly.
- **Prisma 8**. A release candidate, general availability "expected in October 2026". `npm install prisma` already installs its command-line tool, which has no `generate`, `migrate dev` or `db push`. Only PostgreSQL is at release-candidate level; MongoDB is early access, SQLite experimental, MySQL "coming soon". It has no `$extends` and most nested writes are not yet supported.
- **Drizzle**. Apache-2.0, stable 0.45.4, v1 in release candidate. SQL-like queries. Exit cost: moderate.
- **TypeORM**. 1.1.2. Decorator-based, close to the Nest and Angular style.

Why Prisma 7: Prisma stays the default; version 8 is not yet stable, lacks features and effectively forces PostgreSQL, and a bare `npm install prisma` would install it silently.

Unverified: TypeORM's licence.

Sources: https://www.prisma.io/docs/orm/release-status, https://www.prisma.io/changelog/2026-10-02, https://www.prisma.io/docs/orm/reference/supported-databases, https://www.prisma.io/docs/orm/v7/reference/supported-databases, https://github.com/prisma/prisma, https://github.com/drizzle-team/drizzle-orm, https://github.com/typeorm/typeorm/releases

## `database-engine`: database engine

**Default:** PostgreSQL (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Does the product store data on a server: records that outlive a session or are shared between users?"

- **PostgreSQL** (default). Supported in Prisma 7 (versions 9.6 to 18) and the only engine at release-candidate level in Prisma 8. Each major is supported for five years; 18 reaches end of life on 2030-11-14. Open and portable (`pg_dump`).
- **MySQL**. Supported in Prisma 7 (5.6 to 8.4); "coming soon" in Prisma 8.
- **SQLite**. Public domain; one embedded file, so one API instance only. Experimental in Prisma 8.
- **MongoDB**. SSPL v1 licence; early access in Prisma 8, without transactions.

Why PostgreSQL: the only engine fully on Prisma's path forward, open and portable, supported into 2030, and offered by every host in the next category.

Sources: https://www.postgresql.org/support/versioning/, https://www.prisma.io/docs/orm/v7/reference/supported-databases, https://dev.mysql.com/doc/relnotes/mysql/9.6/en/, https://sqlite.org/copyright.html, https://github.com/mongodb/mongo

## `database-hosting`: database hosting

**Default:** Railway Postgres, with scheduled backups on from day one (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Does the product store data on a server: records that outlive a session or are shared between users?"

- **Railway Postgres**. A single-node Postgres on the API's private network. Scheduled backups (daily kept 6 days, weekly 27, monthly 89), billed as volume storage. Volume capped at 5 GB on Hobby, 1 TB on Pro. About $3–5 a month at small scale, sharing the Hobby credit with the API. High availability and connection pooling are extra steps.
- **Neon**. Serverless Postgres. Free: 100 compute-unit hours and 1 GB per project, suspends after 5 idle minutes. Launch: $0.106 per compute-unit hour plus $0.35 per GB-month; about $19 a month running 0.25 CU around the clock.
- **Supabase**. Free 500 MB, paused after a week of inactivity. Pro from $25 a month with 8 GB of disk. Its other services overlap with a NestJS API.
- **Prisma Postgres**. Billed per operation: free 200k operations and 2 GB; Starter $10 a month for 1M operations.

Unverified: whether private-network traffic between Railway services is free; which Railway plans include volume backups.

Sources: https://docs.railway.com/databases/postgresql, https://docs.railway.com/volumes/backups, https://docs.railway.com/pricing/plans, https://neon.com/pricing, https://supabase.com/pricing, https://www.prisma.io/pricing

## `ui-library`: UI library or design system

**Default:** spartan/ui, on Tailwind CSS v4 (ruled 2026-10-23, after the owner reviewed the demos below).
**Needed:** when the concept answers yes to: "Does the product need a user interface in the browser, or is it an API, a CLI or an integration only?"

Open source:

- **spartan/ui** (default). MIT. shadcn-style for Angular: headless primitives from npm, styles copied into the repository by its CLI, so the product owns the code. Requires Tailwind CSS v4 and the CDK, ships Nx generators, supports the two latest Angular majors; 1.x is stable, from a small team. Its gallery lists a data table, a date picker and charts. Demo: https://www.spartan.ng/components
- **Zard UI**. MIT. The same copy-into-the-repo model, "based in Shadcn/ui and Ng-zorro", about 60 components plus blocks, Nx install guides; supports Angular 20 to 22, left beta in October 2026. Demo: https://www.zardui.com/docs/components
- **Angular Material and CDK**. MIT, first-party; its support follows Angular's own policy. A Material 3 look; a custom brand takes theming work; no charts. Demo: https://material.angular.dev/components/categories
- **NG-ZORRO**. MIT. Ant Design, 71 components, no charts; releases monthly and supports Angular 22. Theming is Less variables, which pulls against Tailwind and a custom brand. Demo: https://ng.ant.design/components/overview/en
- **Taiga UI**. Apache-2.0. A large kit with its own design language; 5.x supports Angular 19 and later. Demo: https://taiga-ui.dev/
- **ng-bootstrap** and **ngx-bootstrap**. MIT. Bootstrap 5 widgets, no data table or charts. Demo: https://ng-bootstrap.github.io
- **ng-primitives** and **Angular Aria** (`@angular/aria`). Headless primitives with no look of their own; ng-primitives is still pre-1.0.

Commercial or closed:

- **PrimeNG**. The MIT line receives security fixes only; from v22 it ships as compiled packages under the closed PrimeUI licence, $599 per developer at launch and $799 from 2027, with a free Community licence for organisations under $1M revenue, 5 developers, 10 employees and $3M venture funding. Themes Aura, Lara and Nora, 90+ components. Demo: https://primeng.dev/
- **Syncfusion**. $1,199 per developer a year, with a Community licence on the same thresholds as PrimeNG's. Tailwind, Material 3 and Fluent 2 themes, 140+ components. Demo: https://ej2.syncfusion.com/angular/demos/
- **Kendo UI for Angular**. From $799 per developer a year, no free tier. The strongest grid and charts. Demo: https://www.telerik.com/kendo-angular-ui/components
- **DevExtreme** ($899.99 per developer for the first year) and **Ignite UI** (the grids and charts are commercial) are in the same class.

Dropped: Nebular (minimal maintenance, Angular 21 at most), Flowbite Angular (Angular 21 at most, one maintainer), Covalent (Angular 20), Carbon Components Angular (no Angular 22 support in a stable release), Ionic (built for mobile apps, no data table).

Why spartan/ui: the product owns the component code, so there is no library lock-in and the brand is fully Tailwind; it fits agents working in an Nx repository. The risk is a small team; Zard UI is the nearest replacement on the same model.

Unverified: whether Angular Aria is stable or in developer preview; Zard UI's Tailwind version; the theming of Clarity, Siemens iX and Fundamental NGX, which were not compared.

Sources: https://github.com/spartan-ng/spartan, https://www.spartan.ng/documentation/installation, https://www.spartan.ng/documentation/version-support, https://www.spartan.ng/components, https://github.com/zard-ui/zardui, https://www.zardui.com/docs/version-support, https://github.com/angular/components, https://ng.ant.design/docs/customize-theme/en, https://registry.npmjs.org/ng-zorro-antd/latest, https://github.com/taiga-family/taiga-ui, https://github.com/ng-bootstrap/ng-bootstrap/releases, https://angular.dev/guide/aria/overview, https://github.com/ng-primitives/ng-primitives/releases, https://github.com/primefaces/primeng, https://primeui.dev/nextchapter, https://www.syncfusion.com/products/communitylicense, https://www.syncfusion.com/sales/products, https://www.telerik.com/purchase/kendo-ui, https://js.devexpress.com/Licensing, https://www.infragistics.com/pricing, https://github.com/akveo/nebular, https://github.com/themesberg/flowbite-angular/releases, https://github.com/carbon-design-system/carbon-components-angular/releases

## `auth`: authentication

**Default:** Better Auth, self-hosted in the NestJS API with its Prisma adapter (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Will people sign in to the product, or does any of its data belong to a specific person?"

- **Better Auth**, self-hosted in the NestJS API. MIT, free at any scale. An official Prisma adapter generates the schema; NestJS support comes from a community package (`@thallesp/nestjs-better-auth`); Angular uses the vanilla JavaScript client. Users live in the product's own Postgres, so there is nothing to export on exit.
- **Clerk**. Hosted. Free up to 50,000 monthly retained users; Pro $25 a month. The Angular SDK is unofficial and there is no NestJS SDK. Users, including password hashes, export as CSV from the dashboard.
- **Auth0**. Hosted. Free up to 25,000 monthly active users; B2C Essentials from $35 a month at 500 users. The only option with an official Angular SDK. Password hashes need a support ticket and are not available on the free tier.
- **Supabase Auth**. Free 50,000 monthly active users, but free projects pause after a week of inactivity; Pro $25 a month. Users live in Supabase's Postgres, which pulls the database toward Supabase.

Unverified: the Auth0 path for NestJS; whether Supabase Auth exports password hashes.

Sources: https://www.better-auth.com/docs/introduction, https://github.com/better-auth/better-auth, https://www.better-auth.com/docs/adapters/prisma, https://www.better-auth.com/docs/integrations/nestjs, https://www.better-auth.com/docs/concepts/client, https://clerk.com/pricing, https://clerk.com/docs/guides/development/migrating/overview, https://auth0.com/pricing, https://github.com/auth0/auth0-angular, https://auth0.com/docs/troubleshoot/customer-support/manage-subscriptions/export-data, https://supabase.com/pricing

## `file-storage`: file storage

**Default:** Cloudflare R2, with presigned URLs issued by the NestJS API (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Will users upload or download files in the product, such as images, documents or exports?"

- **Cloudflare R2**. Free 10 GB-month and 1M write and 10M read operations; then $0.015 per GB-month. Egress is free. S3-compatible: NestJS signs presigned URLs and Angular uploads directly.
- **Railway Storage Buckets**. $0.015 per GB-month, operations and bucket egress free; no free tier, no public buckets, no versioning or lifecycle rules. One vendor fewer.
- **Vercel Blob**. Hobby includes 1 GB, and going over is a hard stop with a 30-day lockout; Pro about $0.023 per GB.
- **UploadThing**. 2 GB free, $10 a month for 100 GB.

Unverified: whether Railway Buckets are generally available; AWS S3 prices (the pricing tables did not load, so S3 is not priced here).

Sources: https://developers.cloudflare.com/r2/pricing/, https://developers.cloudflare.com/r2/api/s3/presigned-urls/, https://docs.railway.com/guides/storage-buckets, https://vercel.com/docs/vercel-blob/usage-and-pricing, https://uploadthing.com/pricing

## `email`: transactional email

**Default:** Resend, with templates kept as HTML in the NestJS API (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Must the product ever email a user, such as a sign-in link, a password reset, a receipt or an alert?"

- **Resend**. Free 3,000 emails a month (100 a day); Pro $20 a month for 50k. A simple Node API (`resend`, MIT); plain HTML built in NestJS keeps the exit cheap.
- **Postmark**. Free 100 emails a month; about $15 a month for 10,000.
- **AWS SES**. $0.10 per 1,000 emails, the cheapest at volume, but needs an AWS account.
- **SendGrid**. No permanent free tier (a 60-day trial); from $19.95 a month.

Unverified: whether Resend supports SMTP; the SES sandbox requirements.

Sources: https://resend.com/pricing, https://resend.com/docs/send-with-nodejs, https://registry.npmjs.org/resend/latest, https://postmarkapp.com/pricing, https://aws.amazon.com/ses/pricing/, https://www.twilio.com/en-us/products/email-api/pricing

## `push`: push notifications

**Default:** Web Push with VAPID (Angular `SwPush` and `web-push` in NestJS); Firebase Cloud Messaging once a product gets a native mobile app (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Must the product alert users while they do not have it open?"

- **Web Push with VAPID**: Angular's `SwPush` plus the `web-push` package (MPL-2.0) in NestJS. Free and vendor-free; subscriptions live in the product's own database. On iOS and iPadOS, web push works from 16.4 and only for web apps added to the Home Screen.
- **Firebase Cloud Messaging**. Free; also covers native mobile apps. Tokens work only with FCM; its service worker sits beside Angular's own.
- **OneSignal**. Free up to 1,000 mobile monthly users; Growth $19 a month plus per-user fees. Expensive at growth.

Unverified: when `web-push` was last released; how FCM's service worker coexists with Angular's.

Sources: https://angular.dev/ecosystem/service-workers/push-notifications, https://angular.dev/api/service-worker/SwPush, https://github.com/web-push-libs/web-push, https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/, https://firebase.google.com/pricing, https://firebase.google.com/docs/cloud-messaging/js/client, https://onesignal.com/pricing

## `payments`: payments and billing

**Default:** Paddle, as merchant of record (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Will users pay money inside the product: a subscription, a one-off purchase or usage charges?"

- **Paddle**. Merchant of record: Paddle collects and files sales tax and VAT. 5% + 50¢ per transaction, no monthly fee. Works with software businesses almost anywhere, except a sanctions list.
- **Stripe**, with the seller as merchant. 2.9% + 30¢, +1.5% for international cards, +1% currency conversion; Billing 0.7%; Stripe Tax calculates but the seller registers and files. The business must be registered in a supported country.
- **Stripe Managed Payments**. Stripe as merchant of record for digital products: +3.5% on top of payment fees. Checkout and Payment Links only, a limited list of business countries, and an eligibility review.
- **Lemon Squeezy**. Not a candidate: owned by Stripe and being folded into Stripe Managed Payments.

Unverified: whether Managed Payments is generally available or by invitation.

Sources: https://www.paddle.com/pricing, https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle, https://github.com/PaddleHQ/paddle-node-sdk/releases, https://stripe.com/pricing, https://stripe.com/global, https://docs.stripe.com/payments/managed-payments, https://docs.stripe.com/payments/managed-payments/eligibility, https://www.lemonsqueezy.com/blog/2026-update

## `ai-api`: AI APIs

**Default:** Anthropic Claude API, called from the NestJS API through the AI SDK provider (`@ai-sdk/anthropic`) so the provider is one line of configuration (ruled 2026-10-23).
**Needed:** when the concept answers yes to: "Does any feature need to generate, summarise, classify or converse in natural language rather than follow fixed rules?"

- **Anthropic Claude API**. Per million tokens: Opus 5.5 $4 in and $20 out, Sonnet 5.5 $2 and $10, Haiku 5.5 $0.10 and $0.50 for prompts up to 100K tokens. Batch is half price. An official TypeScript SDK. Inference runs "global" or "us" only; there is no EU option on the first-party API.
- **OpenAI API**. Prices comparable at each tier; regional processing costs 10% more.
- **Google Gemini API**. Comparable paid prices; free-tier data is used to improve Google's products, which rules the free tier out for real user data.
- **Vercel AI Gateway with the AI SDK**. A layer over the providers above, no markup on tokens; an Angular package exists. OpenRouter is the alternative gateway, with a 5.5% fee on credit purchases.

Unverified: EU regions for Claude through cloud providers; whether the AI SDK officially supports NestJS.

Sources: https://claude.com/pricing, https://platform.claude.com/docs/en/api/client-sdks, https://platform.claude.com/docs/en/build-with-claude/data-residency, https://developers.openai.com/api/docs/pricing, https://ai.google.dev/gemini-api/docs/pricing, https://vercel.com/docs/ai-gateway/pricing, https://openrouter.ai/pricing, https://ai-sdk.dev/docs/introduction

## `ci-cd`: CI/CD

**Default:** GitHub Actions; Nx Cloud Hobby added for remote caching once CI time matters (ruled 2026-10-23).
**Needed:** always.

- **GitHub Actions**. Free for public repositories; private repositories get 2,000 to 3,000 minutes a month, then $0.006 a minute on Linux. Native to the repository; Vercel and Railway deploy from git.
- **Nx Cloud**, as an add-on to Actions: remote cache and distributed tasks; Hobby free, Team $29 a month. Removing it falls back to the local cache.
- **CircleCI**. Free 30,000 credits a month; a second vendor next to GitHub with no clear gain for this stack.

Unverified: whether Nx's self-hosted cache is free.

Sources: https://docs.github.com/en/billing/concepts/product-billing/github-actions, https://nx.dev/pricing, https://nx.dev/docs/features/ci-features/remote-cache, https://circleci.com/pricing/

## `error-tracking`: error tracking

**Default:** Sentry, with the organization created in the EU (Frankfurt) region (ruled 2026-10-23).
**Needed:** always.

- **Sentry**. Developer plan free (1 user, 5k errors); Team $29 a month. Official SDKs for Angular and NestJS. Data stored in the US or the EU (Frankfurt), chosen when the organization is created and never changeable.
- **PostHog error tracking**. First 100,000 exceptions a month free; one vendor with analytics, but no NestJS-specific package.
- **LaunchDarkly observability** (formerly Highlight). Free 5K errors; paid prices not listed.
- **Rollbar** (5K free) and **BugSnag** (7.5K free): paid prices not shown.

Unverified: the paid prices of Rollbar, BugSnag and LaunchDarkly; Sentry's Prisma instrumentation.

Sources: https://sentry.io/pricing/, https://docs.sentry.io/platforms/javascript/guides/angular/, https://docs.sentry.io/platforms/javascript/guides/nestjs/, https://docs.sentry.io/organization/data-storage-location/, https://posthog.com/pricing.md, https://launchdarkly.com/pricing/, https://rollbar.com/pricing/, https://www.bugsnag.com/pricing/

## `analytics`: product analytics

**Default:** PostHog Cloud EU (ruled 2026-10-23).
**Needed:** always.

- **PostHog**. Free each month: 1M events, 5K replays, 1M feature-flag requests. No per-seat charge. EU hosting in Frankfurt and a DPA. Works in Angular through `posthog-js`. Can be self-hosted.
- **Plausible**. From $9 a month; cookieless and EU-hosted, but measures traffic rather than product behaviour.
- **Vercel Web Analytics**. Hobby 50,000 events a month; Angular route changes are not tracked automatically.
- **Google Analytics 4**. Free; data kept 2 or 14 months; high lock-in on history.

Unverified: GA4's standing on EU data transfers; PostHog's pattern for NestJS.

Sources: https://posthog.com/pricing.md, https://posthog.com/docs/privacy/gdpr-compliance, https://posthog.com/docs/libraries/angular, https://plausible.io/#pricing, https://vercel.com/docs/analytics/limits-and-pricing, https://vercel.com/docs/analytics/quickstart, https://support.google.com/analytics/answer/7667196
