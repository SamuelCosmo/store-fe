<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules

## Git operations are forbidden

NEVER run commit, push, rebase, merge, pull, pull request creation, branch
creation/switching, worktrees, cherry-pick, stash, tag, or any other git
operation that modifies history, refs, remotes, or working-tree state beyond
reading it.

Read-only git commands (status, diff, log, show, blame) are allowed.

If a task seems to require a git write operation, stop and ask the user to
run it themselves.

# SAC+ — Master Agent Configuration

SAC+ is a multi-tenant SaaS ERP platform. Current vertical: Japanese food
restaurant (POS, kiosk, KDS, tokens). Backend: `../store-be` (Spring Boot
3.5, Java 21, PostgreSQL 16). This repo: `store-fe` (Next.js 16 App Router,
React, TypeScript, Tailwind v4, Redux session, pnpm). Future vertical:
hearing-aid clinic (NOT a confirmed customer — architecture foundation
only).

## Skills — activate by relevance, not all at once

Project skills live in `.devin/skills/<name>/SKILL.md` (mirrored in
`../store-be/.devin/skills/`). Invoke the ones matching the task:

| Task touches… | Activate |
|---|---|
| Requirements, scope, MVP, priorities | product-management |
| Design decisions, modules, refactors, ADRs | software-architecture |
| `store-be` Java/services/API | backend-engineering |
| `store-fe` React/components/UI | frontend-engineering (+ store-api for API calls) |
| Entities, schema, queries, migrations | database-engineering |
| Auth, permissions, secrets, tenant isolation | security-engineering |
| Tests, coverage, "is it done" | testing-qa |
| Deploy, Railway, Docker, env vars, backups | devops-sre |
| Personal data, contracts, privacy, invoicing | legal-compliance-mx |
| ERP modules, plans, entitlements | business-domain-erp |
| Payments, card terminals, refunds | payment-integration |
| Stock, recipes, food cost | inventory-management |
| New/changed UI components | accessibility-wcag |
| Slow pages/queries, caching, scale | performance-engineering |
| Logs, metrics, errors in prod | observability-monitoring |
| Docs, happy path, runbooks | documentation-engineering |
| Releases, versioning, rollback | release-management |
| LLM/AI features | ai-integration |
| Restaurant features (POS/KDS/menu) | restaurant-domain |
| Clinic/health features (future) | hearing-clinic-domain |

Cross-functional example — a payment integration activates:
product-management + backend-engineering + payment-integration +
security-engineering + testing-qa + documentation-engineering.

## Working rules

- **Inspect before implementing** — read the real code and docs first;
  never assume architecture or behavior.
- **Security review** for anything touching auth, permissions, personal
  data, payments, uploads, or secrets.
- **Tests before "done"** — backend: `./mvnw -q test` (+ compile);
  frontend: `tsc --noEmit` + eslint on touched files.
- **Docs in the same change** — API contract → `store-be/docs/` +
  `store-api` skill; happy path → `store-fe/docs/03-todos.md`.
- **No production changes without approval** — no prod DB migrations,
  no auth policy changes, no destructive ops, no infra changes.
- **Minimal dependencies** — stdlib/native first; justify any new dep.
- **Preserve working functionality** — no drive-by rewrites.
- Legal TODOs stay "Requires Review" until a Mexican lawyer signs off.
