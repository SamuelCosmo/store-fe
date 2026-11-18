---
name: release-management
description: >
  Gestión de releases para SAC+: versionado semántico, release notes,
  validación pre-deploy, rollback, change management y coordinación de
  migraciones DB. Usar al preparar deploys, releases o cambios de
  infraestructura — también al decir "release", "deploy", "versión",
  "rollback", "producción", "migración".
---

# Release Management — SAC+

## Versionado

- **No hay versionado formal aún** — commits descriptivos en inglés.
- Recomendado: SemVer en `pom.xml`/`package.json` + tags `v1.2.3` por
  release a producción. Hoy los deploys son continuos por push a main.
- CHANGELOG.md: pendiente — los release notes pueden vivir en commits
  bien escritos hasta formalizar.

## Pipeline de release actual

```
Push a main
  ├── store-be → Railway build (mvnw install + tests) → deploy :8080
  └── store-fe → Railway build (pnpm build) → deploy :3000
```

**Orden**: backend primero cuando hay contrato nuevo (el front puede
romperse si llama endpoints que aún no existen). Reverse-compatible
changes (campos nuevos opcionales) pueden ir en cualquier orden.

## Checklist pre-release

### Código
- [ ] `mvnw test` verde — incluye tests nuevos del cambio
- [ ] `tsc --noEmit` + `eslint` verdes en front
- [ ] Sin `console.log`/debuggers olvidados
- [ ] Secrets no commiteados (`.env.local`, `config.local.json` fuera)

### Base de datos
- [ ] Cambios de esquema: ¿aditivos? ¿rompen datos existentes?
- [ ] Migración destructiva (drop/rename) → plan expand/contract + backup
- [ ] Nuevas columnas con default o nullable para no romper inserts viejos
- [ ] Índices en tablas grandes → evaluar locking (CREATE INDEX
      CONCURRENTLY si es posible)

### Configuración
- [ ] Variables de entorno nuevas documentadas y seteadas en Railway
- [ ] `SEED_DEV_DATA=false` en producción
- [ ] `JWT_SECRET` vigente (rotar si se comprometió — invalida sesiones)
- [ ] `CORS_ORIGINS` incluye dominio del front de prod

### Validación post-deploy
- [ ] Health check: login funciona, dashboard carga, POS crea orden
- [ ] Logs de Railway sin errores 5xx nuevos
- [ ] `/superadmin` → Logs sin errores críticos

## Rollback

| Escenario | Acción |
|---|---|
| Deploy front roto | Railway redeploy commit anterior del front |
| Deploy back roto | Railway redeploy commit anterior del back |
| Migración DB destructiva | ⚠️ No hay rollback automático — restore backup o forward-fix |
| Bug en producción | Fix forward (commit nuevo) — más rápido que revert si el deploy es continuo |

## Change management

- Commits en inglés, descriptivos del "por qué".
- PRs: descripción con qué/por qué/cómo probar + screenshots si hay UI.
- Features grandes → feature flag o branch largo con merges frecuentes.
- Comunicación al equipo: qué se deployó, qué verificar, qué podría fallar.

## Pendientes (audit)

- [ ] SemVer + tags de release.
- [ ] CHANGELOG.md.
- [ ] Pipeline CI con gates (test+lint+build) antes de deploy.
- [ ] Staging environment para validar antes de prod.
- [ ] Runbook de incidentes (quién, cómo, cuándo escalar).
- [ ] Database migration strategy documentada (hoy ddl-auto).
