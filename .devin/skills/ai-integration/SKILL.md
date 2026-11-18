---
name: ai-integration
description: >
  Integración de IA/LLM para SAC+: selección de modelos, prompt engineering,
  RAG, seguridad de datos sensibles, optimización de tokens, monitoreo de
  uso y costos. Usar al agregar features con IA, chatbots o análisis
  inteligente — también al decir "IA", "LLM", "GPT", "Claude", "AI",
  "inteligencia artificial", "chatbot".
---

# AI Integration — SAC+

## Estado actual

**Sin integraciones de IA en el producto** — ni LLM, ni ML, ni análisis
predictivo. SAC+ es SaaS de gestión de restaurantes sin features de IA.

## Cuándo considerar IA en SAC+

Posibles casos de uso futuros (NO implementar sin requerimiento):
- Análisis de ventas/recomendaciones ("qué producto promocionar")
- Chatbot de soporte para tenants
- OCR de tickets/recibos para captura de gastos
- Predicción de demanda para inventario
- Transcripción/asistente para notas de órdenes

## Restricciones de diseño (si se implementa)

1. **Datos sensibles NUNCA a LLMs de terceros sin base legal** —
   especialmente datos de salud del futuro vertical clínica (LFPDPPP:
   datos sensibles requieren consentimiento expreso).
2. **PII minimization**: enviar al LLM solo el contexto necesario —
   no el tenant completo, no datos de otros tenants.
3. **Tenant isolation en prompts**: un tenant nunca debe poder extraer
   datos de otro vía ingeniería de prompts — el backend filtra ANTES de
   enviar al LLM.
4. **Costo**: monitorear tokens por tenant → posible feature flag
   "AI credits" en planes premium.
5. **Fallback**: si el LLM falla, la funcionalidad core sigue — IA es
   enhancement, no dependencia crítica.
6. **Audit**: loguear prompts/respuestas (sin PII sensible) para debugging
   y cumplimiento.

## Stack si se implementa

- Backend Spring Boot → cliente HTTP al proveedor (OpenAI/Anthropic/etc.)
- API keys en env vars / secrets manager — nunca en código
- Rate limiting en endpoints que llaman IA (costo + abuso)
- Timeout + retry con backoff
- Cache de respuestas para queries repetitivas

## Evaluación de proveedor

| Criterio | Pregunta |
|---|---|
| Privacidad | ¿Entrena con mis datos? ¿Cumple LFPDPPP para datos MX? |
| Costo | ¿Por token? ¿Hay tier gratuito? ¿Precio por volumen? |
| Latencia | ¿SLA? ¿Timeouts? |
| Funcionalidad | ¿Soporta el caso de uso? ¿Function calling? |
| Compliance | ¿BAA/DPA disponible? ¿Residencia de datos? |

## Pendientes

- [ ] Definir caso de uso concreto antes de cualquier implementación.
- [ ] Evaluar proveedores según tabla anterior.
- [ ] Diseño de arquitectura IA (dónde vive, cómo se invoca, cómo se
      cobra).
- [ ] Política de datos sensibles para verticales regulados.
