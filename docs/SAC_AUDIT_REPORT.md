# SAC+ Audit Report

**Date:** 2025-11-17 · **Scope:** `store-be` (Spring Boot) + `store-fe` (Next.js)
**Method:** static inspection of source, config, docs, tests and infra files.

> **Update 2026-11-17:** F-07, F-08 and F-09 are now RESOLVED —
> `audit_events` + `GET /api/audit` + `/audit` panel page (HP-SEC-02),
> Swagger restricted to SUPERADMIN (HP-SEC-03), security headers in
> Spring Security + `next.config.ts` (HP-SEC-04). See findings register.
No code was modified. Findings cite verifiable evidence only.

---

## 1. Executive Summary

SAC+ is a **functional, well-disciplined modular monolith** covering the
restaurant vertical end-to-end: catalog, POS, kiosk, KDS, token sales,
thermal tickets, multi-store branding, dashboard reports, soft deletes,
idempotent payments and rate-limited auth. Code quality is unusually high
for its stage: stable error codes, tenant scoping in services, optimistic
locking on orders, batched lazy loading, structured request logging with
PII masking, and a complete es/en i18n layer.

The platform is **not yet a multi-tenant SaaS ERP**. The tenant model
exists (`Client`/`Store`/`user_stores`) and isolation is enforced in
application code, but the commercialization layer is mostly documentation:
module entitlements (`client_modules`/`user_modules`) are specified in
`docs/13` yet **absent from code**, there is no plan/subscription entity,
no tenant suspension, no feature flags, and no module dependency
validation. Security basics are solid (JWT + `token_version` + per-role
TTL, BCrypt, `@PreAuthorize`, rate limiting, upload whitelist) but there
is no RLS defense-in-depth, no security headers, no dependency scanning,
and no audit trail of business changes.

**Verdict:** correct architecture for the current stage (modular monolith
is right; do NOT introduce microservices). Ready to onboard the first
restaurant tenant carefully; **not ready to sell as multi-module SaaS**
until the HIGH findings below are addressed.

---

## 2. Current Architecture (verified)

```
store-fe (Next.js 16.3.6, React 19, TS, Tailwind v4, Redux session-only)
   │  REST + JWT Bearer + X-Request-Id
   ▼
store-be (Spring Boot 3.5.5, Java 21)
   ├── auth/ security/          JWT, BCrypt, tokenVersion, sessionHours TTL
   ├── client/ store/ user/     tenants, branches, users, user_stores
   ├── category/ product/ extra/ size/ inventory/   catalog
   ├── order/                   orders+items, state machine, refunds, folios
   ├── token/                   token sales (physical vouchers)
   ├── report/                  SQL aggregates dashboard
   ├── storage/                 S3-compatible uploads (MinIO SDK)
   └── common/                  exceptions, RateLimiter, Idempotency,
                                logging (RequestLogFilter, DbLogAppender)
   ▼
PostgreSQL 16 (ddl-auto: update) · S3 bucket · Railway deploy
```

Module pattern per feature: `Entity / Repository / Service / Controller /
dto/` — consistent across all 15 packages. No circular dependencies
observed; `OrderService` coordinates inventory/orders/stores cleanly.

## 3. Technology Stack (verified from manifests)

| Layer | Tech | Source |
|---|---|---|
| Backend | Spring Boot 3.5.5, Java 21, spring-data-jpa, security, validation, jjwt 0.12.6, minio 8.5.17, springdoc-openapi 2.8.9 | `store-be/pom.xml` |
| DB | PostgreSQL 16 (docker-compose local :5433) | `docker-compose.yml` |
| Frontend | Next.js 16.3.6, React 19.2.8, RTK 2.12, Tailwind v4, lucide | `store-fe/package.json` |
| Infra | Railway (builds), docker-compose for local pg+s3mock | READMEs, compose |

No unexpected dependencies. `spring-boot-devtools` present (runtime,
optional — fine). No testcontainers, no Jacoco, no CI pipeline files
(`.github/` absent).

## 4. Implemented Features (confirmed in code)

- Auth: login/superadmin/stores, JWT Bearer, `token_version` revocation,
  per-role session TTL (`sessionHours` claim checked in `JwtAuthFilter`),
  rate limiting (5/email, 30/IP, 10 min; `/api/logs` 60/min silent drop).
- RBAC: 6 roles (`ADMIN MANAGER EMPLOYEE CUSTOMER KITCHEN SUPERADMIN`),
  `@PreAuthorize` on every controller, `currentPassword` re-auth for user
  mutations, admin cannot self-demote/delete.
- Tenant/branch: `Client`→`Store`→`user_stores`; `resolveScope`/`canScope`
  + JPA `Specification` scoping; `?storeId=` rules per role.
- Catalog: categories (multi-store), products (price, sku, image, tokenCost,
  soldOut), extras, sizes with global ordering, N:M assignments.
- Orders: POS/KIOSK channels, DINE_IN/TAKEAWAY, CASH/CARD/TOKEN,
  size+extras+notes snapshots, tax snapshot, cashReceived/changeGiven,
  weekly folio with pessimistic store lock, idempotency key, state
  machine PENDING→…→COMPLETED/CANCELLED, `@Version` optimistic lock,
  cancel restores stock + optional refund flag + cancelledBy/At.
- Tokens: sale (`tokenPrice` per client) + redemption inside orders.
- Inventory: per product+store quantity with minStock, decrease/increase
  inside order transaction, row lock.
- Reports: dashboard with pure-SQL aggregates (status/refund, channel,
  type, payment, hourly, top products, employees, token sales).
- Tickets: `ticketNumber` folio, TicketResponse self-contained, 80mm
  print CSS, auto-print per device flag.
- Soft delete + restore on categories/products/extras/sizes/users/stores.
- Uploads: 5MB, MIME whitelist, S3-compatible, brand vs product buckets
  paths, old-image cleanup.
- Logging: request filter + MDC + `app_logs` table (30-day retention) +
  browser error reporting with breadcrumbs → SUPERADMIN Logs panel.
- Frontend: full es/en i18n (~560 keys), dark mode, per-store branding
  derived palette, PanelGuard, pagination/sort hooks, idle timeouts on
  POS/kiosk, error-code translation layer.
- SUPERADMIN panel: clients CRUD + plan limits (maxStores/Pos/Kiosks) +
  tenant admin management + logs viewer.

## 5. Missing Features (verified absent)

| Feature | Evidence |
|---|---|
| Module entitlements (`client_modules`/`user_modules`) | docs/13 specifies; zero Java matches for `Module` entity/claims |
| Plans/subscriptions entities | only `maxStores/maxPosPerStore/maxKiosksPerStore` ints on `Client` |
| Feature flags, module dependencies | no code |
| Tenant suspension | `Client` has no `active`/`suspended` field (only `Store.active`) |
| Cash shift / corte de caja | no `shift` package (TODO in 03-todos) |
| Audit log of business changes | ~~only `cancelledBy`~~ **RESOLVED** — `audit_events` entity + `GET /api/audit` + `/audit` page (2026-11-17) |
| Discounts | no `discount` field on Order (TODO) |
| Tables/reservations/bar module | no packages; docs pending |
| Inventory movements/warehouses/recipes | `InventoryService` is quantity-only (ponytail comment) |
| Bancomer/card terminal | `TODO(bancomer)` in OrderService; docs/14 research done |
| Password recovery by email | TODO (needs mail provider) |
| Customer-facing pages/SEO | app is internal-only; no robots/sitemap/OG |

## 6. Architecture Assessment

**Modular monolith is the right call** — single deployable, clear module
boundaries, no distributed-systems cost. Keep it.

Strengths: consistent layering, DTO records, specification-based
scoping, centralized exceptions, docs discipline (12+ numbered docs).

Weaknesses:
- `ddl-auto: update` — no migration tooling; schema drift risk grows
  (MEDIUM→HIGH as data accumulates).
- ~~`OrderTerminal.tsx` is 1,642 lines~~ — RESOLVED 2026-11-22: split into
  `terminal-utils` + 8 step components; parent ~660 lines orchestration.
- Categories↔stores M:N makes "product belongs to store" indirect
  (`product.getCategory().getStores()`) — works, but a direct
  `product_stores` or store-scoped catalog would be cleaner at scale.
- Reports/dashboard live inside `report/` — fine; a future `shift/`,
  `audit/`, `payment/` module slots exist conceptually.

## 7. Multi-Tenancy Assessment

**Isolation model (verified):**
- JWT carries `clientId`, `storeId`, `role`; `JwtAuthFilter` re-validates
  user state per request (active, not deleted, `tokenVersion`, role,
  session TTL).
- Every business query scopes via `resolveScope`/`canScope` or explicit
  `store.client.id` predicates; `findScopedOrThrow` guards by-id access.
- SUPERADMIN has null tenant claims and separate endpoints.

**Gaps:**
- No PostgreSQL RLS — isolation is 100% application-layer (HIGH: a single
  missed scope = cross-tenant leak; defense-in-depth absent).
- No module entitlements enforcement — a tenant that "didn't buy KDS"
  could still call its endpoints if a user has the role (HIGH vs the SaaS
  requirement; currently all tenants get everything).
- `users.email` is globally `unique` — a person cannot hold accounts in
  two tenants (MEDIUM design limitation for SaaS).
- No tenant suspension/lifecycle (Client lacks status field) (HIGH for
  commercialization).
- No automated cross-tenant isolation tests (MEDIUM).

## 8. Security Assessment (OWASP-flavored)

**Strong:** BCrypt; JWT secret mandatory via env (no default — app won't
boot without it); token revocation; rate limiting on all public auth
surfaces; Bean Validation + business validation; ErrorResponse without
stack traces; upload MIME+size whitelist; optimistic lock + pessimistic
store lock on money paths; idempotency keys; log sanitization of
password/token/secret keys; CORS origin whitelist; CSRF disabled is
acceptable for stateless Bearer API.

**Findings:**
- JWT in `localStorage` (XSS-exfiltratable) — accepted trade-off,
  documented; httpOnly cookie was tried and reverted for cross-domain
  Railway. Keep CSP tight if added (MEDIUM).
- ~~Swagger UI + `/v3/api-docs/**` are `permitAll`~~ **RESOLVED** —
  now `hasRole("SUPERADMIN")` in SecurityConfig (2026-11-17).
  API schema publicly exposed in production (MEDIUM; restrict in prod).
- ~~No security headers~~ **RESOLVED** — HSTS, CSP, X-Frame-Options,
  Referrer-Policy in Spring Security; CSP, nosniff, frame DENY,
  Referrer-Policy, Permissions-Policy, HSTS in `next.config.ts`
  (2026-11-17). Tickets/print unaffected (print uses `window.print`).
  configured in Spring or Next (MEDIUM).
- Rate limiter is in-memory — single instance OK on Railway today;
  breaks silently with >1 replica (MEDIUM, document scaling path).
- `POST /api/logs` is public by design (browser errors) — rate-limited
  and silently dropped, but unauthenticated writes to `app_logs` remain
  possible within limits (LOW).
- `/api/media/**` public — serves stored objects; verify bucket policy
  doesn't allow listing/enumeration (LOW, verify in prod bucket).
- No dependency vulnerability scanning (no OWASP dep-check/Dependabot/
  Trivy in CI) (MEDIUM).
- No encryption-at-rest beyond provider defaults; Postgres/S3 managed by
  Railway — document provider guarantees (LOW).
- Email enumeration: duplicate-email errors on user create reveal
  cross-tenant existence (LOW).
- ~~No audit trail for sensitive mutations~~ **RESOLVED** —
  `com.store.platform.audit` records create/update/delete/restore/
  settings/cancel/purchase/set from mutating services with actor
  snapshots and field diffs; `GET /api/audit` (ADMIN tenant scope,
  SUPERADMIN cross-tenant) + `/audit` panel page (2026-11-17).
  user role changes, module assignments) beyond order `cancelledBy`
  (HIGH for SaaS accountability + legal defensibility).

## 9. Legal Assessment (Mexico — requires lawyer review)

Nothing implemented; all items are **Requires Review** pending qualified
Mexican legal counsel. Full checklist in `03-todos.md` §Legal.

Key exposure today: platform will process personal data of tenant staff
(names, emails, roles) and, via orders, minimal customer data. LFPDPPP
obligations (privacy notice, ARCO procedure, processor agreements,
international transfers — Railway/US infra) are unmet. CFDI/invoicing
obligations for SAC+ subscriptions unidentified. Restaurant tenant's own
obligations (customer privacy notice, payment processor responsibilities,
food-safety regs) are the customer's, but SAC+ should document the split.

## 10. Testing Assessment

- Backend: 11 test classes, Mockito unit tests — good coverage of
  services (auth rate-limit, order lifecycle/refunds/idempotency, report
  aggregates, scoping, exception mapping, JWT filter, token sales).
- **No repository/DB integration tests in CI** (the one written was
  removed — needs live Postgres).
- ~~**No controller/web-layer tests**, no cross-tenant isolation tests.~~
  Resuelto (2026-11-18): `CrossTenantIsolationTest` cubre lectura y
  escritura cross-tenant por módulo (HP-QA-05).
- **Frontend: zero automated tests** (no Vitest/RTL/Cypress).
- **No CI pipeline** — Railway `mvnw install` compiles+runs tests at
  deploy, which is a gate but post-merge.
- No coverage tooling (Jacoco), no E2E, no load tests.

## 11. Infrastructure Assessment

- Local: docker-compose Postgres 16 + s3mock — clean, documented.
- Prod: Railway for both apps (assumed from env docs); **no Dockerfiles
  in repos** (Railway buildpacks/Nixpacks).
- Secrets: `JWT_SECRET` mandatory; storage creds have dev defaults in
  `application.yml` (`store`/`storedev123`) — acceptable for local, must
  be overridden in prod (verify Railway env).
- **No staging environment.**
- **Backups/DR undocumented** — relies on Railway Postgres defaults;
  no restore test, no runbook.
- **No monitoring/alerting** — logs exist (`app_logs` + Railway JSON) but
  no metrics, tracing, uptime check, or error tracker (Sentry etc.).
- No semver/changelog; deploys are continuous pushes to main.

## 12. Technical Debt (ranked)

1. Module/plan layer documented but unimplemented (blocks SaaS sales).
2. `ddl-auto: update` without migrations (blocks safe schema evolution).
3. ~~`OrderTerminal.tsx` 1,642-line god component.~~ RESOLVED (2026-11-22).
4. ~~No audit entity for business mutations.~~ RESOLVED (audit_events, 2026-11-17).
5. No RLS / defense-in-depth tenant isolation.
6. Missing inventory depth (movements, recipes, warehouses).
7. No CI gates, no frontend tests, no E2E.
8. ~~Public Swagger + missing security headers.~~ RESOLVED (2026-11-17).
9. ~~Docs drift: `06-database.md`, `10-frontend-screens.md`.~~ RESOLVED
   (2026-11-22).
10. Email globally unique limits multi-tenant personas.

## 13. Findings Register

| ID | Pri | Area | Finding | Evidence | Remediation | Skill | TODO |
|---|---|---|---|---|---|---|---|
| F-01 | HIGH | Multi-tenancy | ~~No module entitlements in code~~ **RESOLVED 2026-11-18** — `client_modules`/`user_modules` + per-request `MODULE_*` authorities + `X-Effective-Modules` live sync + UI in `/superadmin` & `/users` | `module/` package, `ModuleServiceTest`, `JwtAuthFilterTest` | — | business-domain-erp | HP-MT-01 ✅ |
| F-02 | HIGH | Multi-tenancy | ~~No tenant suspension/lifecycle~~ **RESOLVED 2026-11-19** — `Client.active`/`suspendedAt` + `PATCH /api/clients/{id}/active` + login (`CLIENT_SUSPENDED`) & `JwtAuthFilter` enforcement + `/superadmin` UI | `ClientService`, `AuthServiceTest`, `JwtAuthFilterTest` | — | business-domain-erp | HP-MT-02 ✅ |
| F-03 | HIGH | Security | Tenant isolation only app-layer, no RLS | no RLS policies; all scoping in services | Add Postgres RLS as defense-in-depth (keep app checks) | security-engineering, database-engineering | HP-SEC-01 |
| F-04 | HIGH | Compliance | No legal docs (privacy, terms, DPA, ARCO) | no legal files anywhere | Lawyer-reviewed MX pack — see §Legal TODOs | legal-compliance-mx | HP-LGL-* |
| F-05 | HIGH | Ops | No backups/DR runbook, no monitoring/alerting | no infra docs, no actuator | Document Railway backups; add health endpoint + uptime + alerts | devops-sre, observability-monitoring | HP-OPS-01/02 |
| F-06 | HIGH | Data | ~~`ddl-auto: update`, no migrations~~ **RESOLVED 2026-11-19** — Flyway (`V1__baseline.sql`, `V2__client_suspension.sql`) + `baseline-on-migrate` + `ddl-auto: validate` | `db/migration/`, `application.yml` | — | database-engineering | HP-DB-01 ✅ |
| F-07 | HIGH | Business | ~~No audit log of business changes~~ **RESOLVED 2026-11-17** — `audit_events` + service hooks + `GET /api/audit` + `/audit` UI | `audit/` package, `AuditServiceTest` | security-engineering | HP-SEC-02 ✅ |
| F-08 | MED | Security | ~~Swagger/docs public in prod~~ **RESOLVED 2026-11-17** — SUPERADMIN-only in SecurityConfig | `SecurityConfig.java` | security-engineering | HP-SEC-03 ✅ |
| F-09 | MED | Security | ~~No security headers~~ **RESOLVED 2026-11-17** — Spring headers + Next `headers()` | `SecurityConfig.java`, `next.config.ts` | security-engineering | HP-SEC-04 ✅ |
| F-10 | MED | Security | Rate limiter in-memory | `common/RateLimiter.java` | Redis/DB-backed when scaling replicas | devops-sre | HP-OPS-03 |
| F-11 | MED | Quality | ~~Zero frontend tests; no E2E~~ **RESOLVED 2026-11-24** — 33 tests Vitest en `lib/`+POS utils (`pnpm test`, en CI) y Playwright E2E feliz `e2e/` (local, contra stack real + `seed.sql`); **CI gates** en ambos repos | `vitest.config.mts`, `e2e/happy-path.spec.ts` | E2E en CI queda pendiente (necesita `store-be` en el runner) | testing-qa | HP-QA-01,02,03 ✅ |
| F-12 | MED | Quality | ~~No DB integration tests~~ **RESOLVED 2026-11-24** | `PostgresRepositoryIT` (Testcontainers, 7 tests: folio, aggregates, idempotencia, soft-delete; docker-java 3.7.0 + `api.version=1.44` para Engine ≥28) | — | testing-qa, database-engineering | HP-QA-04 ✅ |
| F-13 | MED | Arch | ~~`OrderTerminal.tsx` 1,642 lines~~ **RESOLVED 2026-11-22** — split into `terminal-utils` (money/cart helpers) + `TerminalHeader`, `MenuSection`, `CartPanel`, `PayModal`, `TokenSaleModal`, `ReceiptModal`, `ConfirmLogoutModal`, `IdleOverlay` | `app/pos/_components/` | — | frontend-engineering | HP-FE-01 ✅ |
| F-14 | MED | Tenancy | `users.email` globally unique | `User.java:36` | Decide: keep global (simpler) or scope per tenant | database-engineering | HP-DB-02 |
| F-15 | MED | Tenancy | ~~No cross-tenant isolation tests~~ **resuelto 2026-11-18** | `CrossTenantIsolationTest` cubre lectura+escritura cross-tenant por módulo | done | testing-qa, security-engineering | HP-QA-05 ✅ |
| F-16 | MED | Inventory | Stock only — no movements/recipes/waste | `InventoryService` ponytail comment | `inventory_movements` ledger + recipes/BOM later | inventory-management | HP-INV-01 |
| F-17 | MED | Payments | CARD is placeholder; no Payment entity | `TODO(bancomer)` in OrderService | Await Bancomer spec; then `payments` entity + PENDING_PAYMENT flow | payment-integration | HP-PAY-01 |
| F-18 | MED | Ops | No staging environment | only local+prod | Add Railway staging env | devops-sre | HP-OPS-04 |
| F-19 | LOW | Security | JWT in localStorage | `lib/store.ts` | Accepted trade-off; mitigate via CSP + short TTL | security-engineering | — |
| F-20 | LOW | Security | `/api/logs` public writes | `SecurityConfig` permitAll + rate limit | Acceptable; monitor volume | security-engineering | — |
| F-21 | LOW | Security | Email enumeration via duplicate errors | UserService | Generic messages where feasible | security-engineering | — |
| F-22 | LOW | Docs | ~~`06-database.md`, `10-frontend-screens.md` drift~~ **RESOLVED 2026-11-22** — DB doc synced (app_logs, audit_events, devices, suspension, idempotency, planned tables flagged); screens doc synced (SUPERADMIN, real panel screens, Barra flagged planned) | `store-be/docs/` | — | documentation-engineering | HP-DOC-01 ✅ |
| F-23 | LOW | SEO/UX | No robots/sitemap/OG; internal app | public/ has only images | N/A for app; add if marketing site appears | frontend-engineering | — |
| F-24 | LOW | A11y | No formal WCAG audit; icon buttons lack consistent aria-labels | spot check | axe/Lighthouse pass per surface | accessibility-wcag | HP-A11Y-01 |
| F-25 | MED | Business | Cash shift/corte de caja missing | no shift code; TODO documented | Implement per happy-path design | business-domain-erp, backend-engineering | HP-BIZ-01 |
| F-26 | MED | Business | Discounts not modeled | no discount field | `orders.discount` + POS input + ticket line | backend-engineering | HP-BIZ-02 |
| F-27 | LOW | Business | Password recovery pending mail provider | TODO in 03-todos | `forgot`/`reset` endpoints + rate limit + MailService | backend-engineering | HP-BIZ-03 |
| F-28 | MED | Tenancy | Module dependencies & feature flags undefined | docs only | Define catalog + `requires` graph + `tenant_features` | business-domain-erp | HP-MT-03 |

*CRITICAL: none found — no evidence of exploitable cross-tenant leak,
exposed secrets, or data-loss bug in current code. HIGH items are
commercialization/compliance/ops risks, not active breaches.*

## 14. Recommended Roadmap (priority order)

1. **HP-LGL-*** Legal pack kickoff (parallel — lawyer lead time) +
   privacy notice minimum viable.
2. **HP-SEC-01/02/03** Tenant defense-in-depth: audit entity, RLS pilot,
   lock down Swagger/headers.
3. **HP-MT-01/02** Module entitlements + tenant suspension — unblocks
   real SaaS sales.
4. **HP-DB-01** Baseline migrations (Flyway) before next schema change.
5. **HP-BIZ-01** Cash shift (highest daily-use gap in the POS).
6. **HP-QA-01/03** CI pipeline + frontend smoke tests.
7. **HP-OPS-01/02** Backup runbook + uptime/error monitoring.
8. **HP-INV-01, HP-PAY-01, HP-BIZ-02/03** Depth features as clients demand.
9. Future vertical evaluation (clinic) only after core module layer lands.

## 15. Actions Requiring Explicit Approval

- Any production DB migration or `ddl-auto` strategy change.
- Auth policy changes (e.g., switching JWT storage, tightening session
  TTLs, enabling RLS in prod).
- Introducing Flyway/Liquibase (new dependency + migration files).
- Adding security headers that could break embeds/printing.
- Suspending/deactivating any tenant or user in production.
- Signing any legal document (lawyer required regardless).
