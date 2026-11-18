---
name: hearing-clinic-domain
description: >
  Dominio de clínica de audífonos — vertical FUTURO de SAC+, NO cliente
  confirmado. Pacientes, citas, audiometría, expedientes, inventario de
  audífonos, seguimiento, garantía y datos de salud sensibles. Usar SOLO
  para diseñar fundación arquitectónica o evaluar viabilidad — también al
  decir "clínica", "audífonos", "paciente", "audiometría", "vertical".
---

# Hearing Clinic Domain — FUTURO (no confirmado)

> **IMPORTANTE**: esto es un vertical potencial, NO una implementación
> pendiente ni un cliente real. No construir funcionalidad específica de
> clínica salvo que sea fundación arquitectónica del core. La decisión
> de proceder requiere confirmación del cliente.

## Por qué este vertical importa arquitectónicamente

Una clínica de audífonos ejercita el core de SAC+ de formas que el
restaurante no:

- **Citas/programación** (vs órdenes impulsivas del POS)
- **Expedientes clínicos** (datos de salud = SENSIBLES bajo LFPDPPP)
- **Inventario por serie/número de serie** (audífonos individuales)
- **Garantías y seguimiento** (relación continua paciente-dispositivo)
- **Fitting/calibración** (datos técnicos del dispositivo)

Si el core soporta esto sin reescritura, la arquitectura multi-tenant es
válida. Si requiere cambios profundos, documentar antes de implementar.

## Módulos potenciales (futuro)

| Módulo | Entidades clave | Dependencias |
|---|---|---|
| Patients | patient, contact, consent | core users/client |
| Appointments | appointment, calendar, reminders | patients, staff |
| Audiometry | exam, results, charts | patients, clinical records |
| Clinical records | record, notes, attachments | patients (SENSITIVE) |
| Hearing aids inventory | device, serial, model, stock | inventory core |
| Device fitting | fitting, programming, verification | devices, patients |
| Follow-ups | followup, schedule, reminders | patients, devices |
| Warranty | warranty, claims, service | devices, patients |

## Consideraciones legales CRÍTICAS (ver legal-compliance-mx)

- **Datos de salud = datos personales SENSIBLES** (LFPDPPP art. 3-VI):
  requieren consentimiento expreso por escrito del titular.
- **NOM-004** (expediente clínico): retención mínima 5 años, acceso
  restringido, integridad de registros.
- **NOM-024**: sistemas de información de registro electrónico para la
  salud — certificación/aprobación de sistemas.
- **Consentimiento**: debe capturarse explícitamente, no implícito.
- **Acceso**: solo personal autorizado con rol clínico específico.
- **Portabilidad**: el paciente puede solicitar copia de su expediente
  (derecho ARCO ampliado para datos sensibles).
- **IA**: prohibido usar datos clínicos para entrenamiento de modelos
  sin base legal explícita.

## Requisitos arquitectónicos que el core debe soportar

1. **Datos sensibles flag**: campo `sensitive` o categoría en entidades
   que contengan datos de salud → afecta logs, backups, exports.
2. **Consentimiento**: entidad `consents` (titular, finalidad, fecha,
   revocación) — genérica para cualquier vertical regulado.
3. **Expediente inmutable**: registros clínicos append-only (no editables
   una vez firmados) — patrón audit trail.
4. **Inventario serializado**: `inventory_items` con número de serie
   único — extensión del inventory actual.
5. **Citas**: módulo de scheduling genérico (no solo restaurante).
6. **Adjuntos seguros**: documentos clínicos en storage con acceso
   controlado por rol — no URLs públicas como productos.

## Evaluación de readiness (para el audit)

| Requisito | Estado actual | Gap |
|---|---|---|
| Multi-tenant | ✅ client/store | Ninguno |
| Roles granulares | ✅ 6 roles | ¿Rol CLINICIAN? nuevo rol vertical |
| Módulos dinámicos | 🟡 client_modules/user_modules | Enforcement backend parcial |
| Datos sensibles | ❌ sin flag/categoría | Agregar metadata de sensibilidad |
| Consentimiento | ❌ no existe | Nueva entidad genérica |
| Inventario serializado | ❌ no existe | Extender inventory |
| Citas/scheduling | ❌ no existe | Módulo nuevo |
| Adjuntos privados | ❌ solo imágenes públicas | Storage con ACL/URLs firmadas |

## Conclusión para arquitectura

El core multi-tenant + módulos + roles es **suficiente como fundación**.
Los gaps son de **módulos nuevos** (citas, expedientes, inventory
serializado) y **metadata de sensibilidad** — no requieren rediseño del
core. La decisión de construir el vertical es de producto, no técnica.
