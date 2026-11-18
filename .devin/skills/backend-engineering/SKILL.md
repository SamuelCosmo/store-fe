---
name: backend-engineering
description: >
  Convenciones de store-be (Spring Boot 3.5, Java 21): controllers, services,
  repositories, DTOs/records, validación, excepciones, transacciones,
  logging y tests. Usar en CUALQUIER cambio de backend — también al decir
  "endpoint", "service", "repository", "DTO", "API".
---

# Backend Engineering — store-be

## Stack

Spring Boot 3.5.5 · Java 21 · Spring Data JPA/Hibernate · PostgreSQL 16 ·
JWT (jjwt) · Maven Wrapper (`./mvnw`) · Lombok.

## Estructura por módulo

```
<modulo>/
├── X.java            # @Entity
├── XRepository.java  # Spring Data + queries JPQL
├── XService.java     # lógica de negocio + @Transactional
├── XController.java  # REST, @PreAuthorize por rol
└── dto/              # records inmutables
```

## Reglas obligatorias

1. **Roles**: `@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")` — nunca confiar
   en el frontend. Roles: SUPERADMIN (plataforma, sin clientId), ADMIN,
   MANAGER, EMPLOYEE, KITCHEN, CUSTOMER.
2. **Scoping tenant**: toda query de negocio filtra por store/client vía
   `resolveScope`/`canScope` (StoreService) o `o.store.client.id = :clientId`.
   `?storeId=` solo lo honra ADMIN (cualquier tienda del cliente) o roles
   operativos para tiendas asignadas en `user_stores`.
3. **Errores**: `BusinessException(code, message, params)` — code UPPER_SNAKE
   estable para el front (`err.<CODE>` en i18n). 409 tiene subclases
   (`ConflictException`…). Nunca devolver stack ni mensajes internos.
4. **DTOs = records**, inmutables, con `from(entity)` estático. Nunca exponer
   la entidad JPA en la respuesta.
5. **Validación**: Bean Validation en DTOs (`@NotBlank`, `@Size`…) + reglas
   de negocio en service. Mensajes de campo → `fieldErrors`.
6. **Transacciones**: `@Transactional` en service; operaciones de dinero
   (órdenes, fichas) en una sola transacción con lock pesimista cuando haya
   consecutivos (folio `ticket_number` usa `PESSIMISTIC_WRITE` sobre store).
7. **Idempotencia**: cobros aceptan `Idempotency-Key` — reintento con la
   misma key devuelve la orden ya creada, no duplica.

## Queries y performance

- Agregados con JPQL `GROUP BY`/`SUM`/`COUNT` — **nunca** cargar entidades
  para contar (ver `OrderRepository`/`TokenSaleRepository` del dashboard).
- Ojo con el shape de resultados multi-columna: Spring Data envuelve
  `Object[]` en un array extra — usar `List<Object[]>` y `.get(0)`.
- `@BatchSize` en colecciones/entidades lazy calientes (Order.items,
  Product, User) para evitar N+1 al serializar.
- Paginación Spring (`Page`) cuando el front manda `page`/`size`; sin ellos
  devolver lista completa (contrato en store-api SKILL).

## Logging

- `RequestLogFilter`: una línea por request (muta=INFO, 4xx=WARN, 5xx=ERROR).
  MDC: requestId, userId, clientId, storeId, role.
- Loguear: login ok/fail, cobros, cancelaciones con refund, cambios de
  settings sensibles. NUNCA passwords/tokens (el filtro ya enmascara).
- `DbLogAppender` persiste WARN/ERROR + auditoría en `app_logs` (conexión
  propia, sobrevive rollback). `POST /api/logs` recibe eventos del front.

## Tests (obligatorios en el mismo cambio)

- `./mvnw -q -DskipTests compile` + `./mvnw -q test` antes de cerrar.
- Cambios de firma DTO/record/constructor → actualizar `src/test/` igual.
- Tests unitarios con Mockito (ver `OrderServiceTest`, `ReportServiceTest`,
  `RateLimiterTest`). No hay H2: tests de repositorio contra Postgres real
  son opcionales y NO van a CI (Railway no garantiza DB viva).

## Errores de usuario → front

`ErrorResponse{status,error,code,message,params,path,fieldErrors}`.
Agregar `err.<CODE>` en `store-fe/lib/i18n/es.json` **y** `en.json` en el
mismo cambio. Códigos actuales: ver skill `store-api` → "Formato de errores".
