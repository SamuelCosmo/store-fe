---
name: legal-compliance-mx
description: >
  Cumplimiento legal y regulatorio para SAC+ en México: LFPDPPP, avisos de
  privacidad, términos SaaS, ARCO, contratos de procesamiento, facturación
  electrónica, protección al consumidor. Usar al tocar datos personales,
  documentos legales, contratos, facturación o privacidad — también al decir
  "legal", "privacidad", "LFPDPPP", "términos", "ARCO", "factura", "SAT".
---

# Legal & Regulatory Compliance — México

> **ALCANCE**: esta skill da guía de investigación y checklist — NO es
> asesoría legal ni certificación. Todo documento legal debe ser revisado
> por un abogado mexicano calificado antes de usarse. Nunca marcar un
> documento como "aprobado" solo porque una IA lo generó.

## Distinción clave de responsabilidades

| Responsable | Qué cubre |
|---|---|
| **SAC+ (plataforma)** | Datos de tenants/usuarios de la plataforma, infraestructura, seguridad, contratos SaaS, aviso de privacidad propio, facturación de la suscripción, propiedad intelectual del software |
| **Cada cliente (tenant)** | Datos de SUS clientes/empleados/pacientes, obligaciones fiscales de su negocio, regulaciones de su industria, aviso de privacidad propio, facturación a sus clientes |

SAC+ provee capacidades técnicas (aislamiento, roles, logs) pero **no
cumple automáticamente** las obligaciones regulatorias del cliente.

## Marco legal aplicable (verificar vigencia — la ley cambia)

- **LFPDPPP** (Ley Federal de Protección de Datos Personales en Posesión de
  los Particulares) + Reglamento + Lineamientos del INAI.
- **LFPDPPP Sector Público** solo si SAC+ llegara a contratos de gobierno.
- **Código de Comercio / firma electrónica** si hay contratos digitales.
- **CFF + CFDI 4.0** — facturación electrónica vía PAC autorizado; si SAC+
  factura suscripciones, hay obligación fiscal.
- **PROFECO** — si SAC+ vende directamente a consumidores finales.
- **Sector salud (futuro vertical clínica)**: NOM-004 (expediente clínico),
  NOM-024 (sistemas de información de registro electrónico para la salud),
  datos personales sensibles (datos de salud = sensibles bajo LFPDPPP).
- **Alimentos (restaurante)**: NOM-251 (etiquetado), regulación sanitaria
  COFEPRIS paraManipulación de alimentos — responsabilidad del restaurante,
  no de SAC+.

## Checklist SAC+ (plataforma)

- [ ] Identidad legal del operador de SAC+ (persona física/moral).
- [ ] Aviso de privacidad de la plataforma (qué datos, finalidades,
      transferencias, ARCO, cambios).
- [ ] Términos y condiciones del servicio SaaS.
- [ ] Contrato de suscripción SaaS (planes, módulos, suspensión por
      falta de pago, propiedad de datos del cliente).
- [ ] Acuerdo de procesamiento de datos (DPA) — SAC+ como encargado del
      tratamiento de datos del tenant.
- [ ] Inventario de subencargados (Railway, PostgreSQL hosting, S3,
      futuros: pasarela de pago, servicio de correo, Bancomer).
- [ ] Transferencias internacionales (Railway/US infra → revisar mecanismo
      de transferencia LFPDPPP).
- [ ] Retención y eliminación de datos (política + procedimiento real).
- [ ] Procedimiento ARCO (recepción, verificación identidad, respuesta
      20 días hábiles).
- [ ] Plan de respuesta a incidentes de seguridad y de privacidad
      (notificación INAI si aplica).
- [ ] Propiedad intelectual del software + licencias open-source de
      dependencias (revisar pom.xml/package.json).
- [ ] Política de cancelación/reembolsos de suscripciones.
- [ ] SLA y responsabilidades de soporte.
- [ ] Obligaciones fiscales de SAC+ (CFDI por suscripciones, ISR/IVA).
- [ ] Revisión PROFECO si hay venta a público.

## Checklist por vertical

**Restaurante (cliente actual)**: aviso de privacidad del restaurante
(datos de clientes en pedidos/reservas), consentimiento para marketing,
responsabilidad del procesador de pagos (SAC+ vs terminal vs banco),
facturación CFDI de las ventas del restaurante (SAC+ solo provee datos;
el CFDI lo emite el restaurante con su PAC), normas sanitarias.

**Clínica de audífonos (FUTURO, no confirmado)**: datos de salud =
sensibles → consentimiento expreso, NOM-004/024, acceso restringido a
expedientes, retención de expedientes (mínimo 5 años según NOM-004),
prohibición de usar datos clínicos para IA sin base legal, aviso de
privacidad específico.

## Reglas de trabajo

1. Marcar TODO legal como **Requires Review** — nunca "Completed" sin
   visto bueno de abogado.
2. Documentar en `store-fe/docs/03-todos.md` sección "Legal & Regulatory
   Compliance — Mexico" con: descripción, razón, responsable
   (SAC+/cliente/abogado), prioridad, dependencias, entregable,
   criterios de aceptación, estado.
3. Al tocar datos personales en código: pensar en minimización, finalidad,
   retención — no recolectar datos "por si acaso".
4. Logs y reportes de auditoría NO deben contener datos personales
   sensibles innecesarios.
