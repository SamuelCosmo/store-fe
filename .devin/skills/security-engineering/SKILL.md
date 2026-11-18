---
name: security-engineering
description: >
  Seguridad OWASP Top 10/ASVS para SAC+: autenticación JWT, RBAC multi-tenant,
  rate limiting, validación, secrets, uploads, CSRF/CORS y auditoría. Usar en
  TODO cambio que toque auth, permisos, datos sensibles, uploads, pagos o
  configuración — también al decir "seguridad", "vulnerabilidad", "auth",
  "permiso", "token", "secreto".
---

# Security Engineering — SAC+

## Postura actual (verificada en auditoría)

**Fortalezas**: JWT con `token_version` + TTL por rol (revocación real),
BCrypt, `@PreAuthorize` por rol en controllers, scoping tenant en service,
rate limiting en login/stores/superadmin/logs, `ErrorResponse` sin stack
traces, `RequestLogFilter` enmascara secrets en logs, uploads con whitelist
de MIME+tamaño, CORS restringido, `currentPassword` para mutaciones de
usuarios, soft-delete preserva historial.

**Gaps conocidos** (ver SAC_AUDIT_REPORT.md): sin RLS en Postgres,
rate limiter en memoria (no multi-instancia), sin audit log de cambios de
negocio, dependency scanning pendiente, session fixation n/a (stateless),
sin CSP headers, `/api/logs` público con solo rate limit.

## Reglas no negociables

1. **Nunca** loguear/commitear passwords, tokens, JWT_SECRET, credenciales
   S3, connection strings. `.env.local`/`config.local.json` fuera de git.
2. **Autorización en backend siempre** — el front oculta UI (UX), el
   `@PreAuthorize` + scoping es la barrera real.
3. **Tenant isolation**: toda query de negocio lleva filtro
   `store_id`/`client_id`. Un request con `?storeId=` ajeno debe dar 403,
   nunca datos. Agregar test de aislamiento cross-tenant al crear módulos.
4. **Input validation**: Bean Validation en DTOs + validación de negocio en
   service (pertenencia a tenant, estados válidos, montos ≥0, etc.).
5. **Errores**: `BusinessException(code)` — jamás exponer internals.
   `fieldErrors` para validación de campos.
6. **Rate limiting**: endpoints públicos sensibles (login, stores,
   superadmin, forgot-password futuro, `/api/logs`) usan `RateLimiter`.
   Login: 5 fallos/email o 30/IP en 10 min → 429 `RATE_LIMITED`.
7. **Uploads**: whitelist MIME (jpg/png/webp/gif), máx 5MB, nombres
   generados server-side, servir desde bucket (no proxy con path del user).
8. **JWT**: `JWT_SECRET` por env (mínimo 256 bits, documentado), nunca en
   código. Claims mínimos (sub, clientId, storeId, role, iat). Expiración
   por rol vía `sessionHours` + `token_version`.
9. **CSRF**: stateless Bearer → CSRF no aplica a API, pero cookies de
   sesión (si se reintroducen) requieren SameSite+CSRF token.
10. **CORS**: orígenes explícitos por env (`CORS_ORIGINS`), nunca `*` con
    credentials.

## Checklist por cambio sensible

- [ ] ¿El endpoint verifica rol Y scope tenant/store?
- [ ] ¿Hay validación de input (DTO + service)?
- [ ] ¿Errores usan códigos estables sin filtrar internals?
- [ ] ¿Se loguea lo necesario sin secrets?
- [ ] ¿Rate limit si es público/sensible?
- [ ] ¿Test de autorización negativa (rol incorrecto → 403, otro tenant →
      403/404)?
- [ ] ¿Cambios de permisos/settings críticos quedan en audit log (futuro
      módulo `audit`)?

## OWASP ASVS — mapeo rápido

| Área | Estado |
|---|---|
| V2 Auth | JWT+BCrypt+token_version ✅ / password policy ✅ / reset por email ⏳ |
| V3 Session | stateless, TTL por rol ✅ |
| V4 Access control | RBAC+tenant scope ✅ / RLS ⏳ / audit trail ⏳ |
| V5 Validation | Bean Validation + service ✅ |
| V6 Crypto | BCrypt, HTTPS en prod ⏳ (Railway TLS) |
| V7 Error handling | ErrorResponse codes ✅ |
| V8 Data protection | soft-delete, snapshots ✅ / encryption at rest ⏳ |
| V9 Comms | TLS, CORS whitelist ✅ |
| V10 Malicious code | deps scan ⏳ (pendiente CI) |
| V11 Business logic | idempotency keys, locks ✅ / descuentos ⏳ |
| V12 Files | upload whitelist ✅ / virus scan ⏳ |
| V13 API | REST+OpenAPI/Swagger ✅ / versioning ⏳ |
| V14 Config | env secrets ✅ / headers seguridad ⏳ |
