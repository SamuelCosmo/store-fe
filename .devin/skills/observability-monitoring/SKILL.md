---
name: observability-monitoring
description: >
  Observabilidad para SAC+: logging estructurado, métricas, tracing,
  error tracking, alertas, uptime y gestión de incidentes. Usar al tocar
  logs, dashboards de monitoreo, errores en producción o incidentes —
  también al decir "logs", "monitoreo", "métricas", "alertas", "Sentry",
  "incidente", "uptime".
---

# Observability & Monitoring — SAC+

## Estado actual (verificado)

**Logs estructurados**:
- `RequestLogFilter`: 1 línea/request — mutaciones INFO, 4xx WARN, 5xx
  ERROR con body sanitizado (password/token/secret → `***`).
- MDC: `requestId`, `userId`, `clientId`, `storeId`, `role`.
- `X-Request-Id` viaja front→back; errores 5xx muestran `· ref <id>`.
- `DbLogAppender`: WARN/ERROR + INFO auditoría → tabla `app_logs`
  (conexión propia, sobrevive rollback; retención `LOG_RETENTION_DAYS=30`).
- `POST /api/logs`: eventos del browser (js.error, react.crash,
  breadcrumbs 40) → SUPERADMIN los ve en `/superadmin` pestaña Logs.
- Railway: `LOGGING_STRUCTURED_FORMAT_CONSOLE=logstash` → JSON.

**Métricas/tracing**: ❌ sin Micrometer/Prometheus, sin tracing
distribuido, sin error tracking externo.

**Alertas/uptime**: ❌ no hay monitor externo ni alertas.

## Arquitectura de observabilidad objetivo

```
┌─ Front (browser) ── POST /api/logs ──→ app_logs (DB)
├─ Back (Spring) ──── RequestLogFilter ──→ console (Railway JSON)
│                  └→ DbLogAppender ────→ app_logs
└─ [FUTURO] Micrometer → Prometheus → Grafana
          Sentry → error tracking front+back
          UptimeRobot → health check externo
```

## Reglas

1. **Todo error 5xx debe tener `requestId`** trazable en logs — ya existe;
   mantenerlo en código nuevo.
2. **Logs de negocio** (cobros, cancelaciones, cambios de settings,
   login) a nivel INFO con contexto MDC — nunca DEBUG para auditoría.
3. **No loguear PII innecesaria** — emails se loguean en auth (necesario
   para soporte), pero no en requests de catálogo.
4. **`app_logs` es para soporte/debug** — para audit trail de negocio
   (quién cambió qué) se necesita módulo `audit` separado (pendiente).
5. **Errores del front** → `report()` en `lib/log.ts` con breadcrumbs;
   nunca enviar passwords/tokens en payload.

## Al agregar observabilidad nueva

- [ ] ¿Genera volumen excesivo? `/api/logs` ya tiene rate limit 60/min.
- [ ] ¿Contiene PII/secrets? Sanitizar antes de persistir.
- [ ] ¿Sobrevive al rollback de la transacción? DbLogAppender usa conexión
      propia — mantener ese patrón para auditoría crítica.
- [ ] ¿Se puede buscar por `requestId`/`userId`/`clientId`? Indexar si es
      tabla grande.

## Pendientes (audit)

- [ ] Actuator `/actuator/health` + `/actuator/metrics` (protegido).
- [ ] Micrometer + Prometheus metrics (orders/min, error rate, latencia).
- [ ] Sentry o similar para error tracking front+back.
- [ ] Uptime monitor externo (health endpoint o login page).
- [ ] Alertas: 5xx rate, login failures spike, disk DB, deploy failures.
- [ ] Dashboard de logs en `/superadmin` ya existe — mejorar filtros
      (por store, por evento type).
