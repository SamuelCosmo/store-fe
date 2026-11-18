---
name: devops-sre
description: >
  Infraestructura de SAC+: Docker, Railway, PostgreSQL, storage S3,
  variables de entorno, secrets, entornos, backups, monitoreo y rollback.
  Usar en despliegues, configuración de producción, incidentes o cambios de
  infraestructura — también al decir "deploy", "Railway", "Docker",
  "producción", "backup", "env", "monitoreo".
---

# DevOps / SRE — SAC+

## Stack de infra

- **Backend**: Spring Boot → Railway (build `mvnw install`, JAR)
- **Frontend**: Next.js → Railway (build `pnpm build`)
- **DB**: PostgreSQL 16 (Railway plugin o externo) — local: docker-compose
  Postgres :5433 `storedb`
- **Storage**: S3-compatible — local `adobe/s3mock` :9090 (volumen
  persistente); prod: bucket S3/R2 vía env `STORAGE_*`
- **CI/CD**: Railway auto-deploy por push; no hay pipeline CI separado

## Entornos

| Entorno | Backend | Frontend | DB | Storage |
|---|---|---|---|---|
| Local | :8080 | :3000 | postgres :5433 | s3mock :9090 |
| Prod | Railway | Railway | Railway/externa | S3 real |

Staging: **no existe** — pendiente (ver audit).

## Variables de entorno críticas

**Backend**: `JWT_SECRET` (OBLIGATORIO, ≥256 bits — sin default en prod),
`CORS_ORIGINS`, `DATABASE_URL`/datasource, `STORAGE_*` (endpoint, bucket,
access/secret key), `SEED_DEV_DATA=false` en prod, `LOG_RETENTION_DAYS`,
`LOGGING_STRUCTURED_FORMAT_CONSOLE=logstash` (JSON en Railway).

**Frontend**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN` (futuro).

**Regla**: secrets NUNCA en código ni en git. `.env.local` local;
`config.local.json` para overrides Devin. Documentar cada var nueva en
`application.yml`/README.

## Operación

- **Deploy**: push a main → Railway rebuild. Backend primero si hay
  contrato nuevo (el front depende del back).
- **Rollback**: Railway redeploy de commit anterior; migraciones de DB
  destructivas NO tienen rollback automático → expand/contract pattern
  (agregar columna → migrar → remover después).
- **Logs**: Railway structured JSON + `app_logs` en DB (WARN/ERROR +
  mutaciones). `/superadmin` → pestaña Logs (`GET /api/logs`).
- **Backups DB**: ⚠️ PENDIENTE — Railway Postgres tiene backups del plan;
  documentar restore. Storage: versionado/lifecycle del bucket.
- **Health**: actuator no expuesto; health check = login endpoint.
  Pendiente `/actuator/health` + uptime monitor (UptimeRobot/BetterStack).
- **Secrets en Railway**: dashboard/env vars — nunca en repo.

## Checklist pre-deploy

- [ ] `mvnw test` verde (incluye tests nuevos del cambio)
- [ ] `tsc --noEmit` + `eslint` verdes en front
- [ ] Migración DB: ¿aditiva? ¿necesita ventana? ¿backup reciente?
- [ ] Variables nuevas documentadas y seteadas en Railway
- [ ] `SEED_DEV_DATA=false`, `JWT_SECRET` rotado si aplica
- [ ] Plan de rollback identificado

## Deuda operativa (audit)

- [ ] Staging environment.
- [ ] Backup/restore documentado y probado.
- [ ] Monitoring + alertas (errores 5xx, uptime, disco DB).
- [ ] Error tracking externo (Sentry) — hoy solo `app_logs` + browser logs.
- [ ] Rate limiter distribuido si hay >1 instancia (hoy in-memory).
