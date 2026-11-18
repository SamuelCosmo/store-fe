---
name: accessibility-wcag
description: >
  Accesibilidad WCAG 2.2 AA para SAC+: HTML semántico, ARIA, navegación por
  teclado, lectores de pantalla, contraste y formularios accesibles.
  Usar en TODO componente UI nuevo o rediseño — también al decir
  "accesibilidad", "a11y", "WCAG", "ARIA", "teclado", "lector de pantalla".
---

# Accessibility — WCAG 2.2 AA (SAC+)

## Contexto

- Público: staff de restaurante (POS/KDS/kiosco) + admins. El **kiosco de
  autoservicio** es el caso más crítico — clientes finales sin capacitación,
  posible discapacidad motriz/visual.
- El panel admin es herramienta interna — prioridad menor pero debe ser
  usable con teclado.
- Idiomas: es/en — los textos accesibles también deben estar en i18n.

## Estado actual (audit)

- HTML semántico base (buttons, labels en forms) ✅ parcial
- Tailwind tokens con contraste razonable pero **sin verificar ratios**
- Iconos lucide sin `aria-label` consistente en botones solo-icono
- Navegación por teclado: modales probablemente sin focus trap
- Kiosco táctil: funciona por touch pero carece de soporte teclado completo
- **Sin auditoría formal WCAG** — pendiente

## Checklist por componente nuevo/modificado

### Perceptible
- [ ] Contraste texto/fondo ≥ 4.5:1 (normal) / 3:1 (large) — verificar con
      tokens `text-primary`, `text-secondary` sobre `bg-surface`.
- [ ] No comunicar información solo por color (ej. estados de orden usan
      color + texto/badge).
- [ ] `alt` en imágenes informativas (logos: `alt` con nombre del tenant).

### Operable
- [ ] Todo interactivo con `button`/`a` reales — nada de `div onClick`.
- [ ] Focus visible (`focus-visible:ring` o equivalente) en TODOS los
      controles.
- [ ] Navegación por teclado completa: tab order lógico, Esc cierra
      modales, Enter/Espacio activan.
- [ ] Focus trap en modales + return focus al cerrar.
- [ ] Timeouts del kiosco (90s idle) no deben perder el pedido sin aviso.

### Comprensible
- [ ] Labels asociados a inputs (`htmlFor`/`id` o aria-labelledby).
- [ ] Errores de formulario anunciados (`aria-describedby`, `role=alert`).
- [ ] Idioma del documento (`lang` en html según i18n).

### Robusto
- [ ] ARIA solo cuando el HTML semántico no alcanza.
- [ ] `aria-live` en zonas que cambian solas (KDS nuevos pedidos, toasts).
- [ ] Roles correctos: `role=dialog` en modales, `role=status` en toasts.

## Prioridades

1. **Kiosco** (`/kiosk` / OrderTerminal channel=KIOSK) — público general.
2. **POS** — operado por staff con posible discapacidad.
3. **Panel admin** — usuarios internos.
4. **Login/superadmin** — punto de entrada.

## Pendientes (audit)

- [ ] Auditoría formal con axe/Lighthouse en cada superficie.
- [ ] Focus trap en modales compartidos (Modal, ExtrasModal, TicketModal).
- [ ] `aria-label` en botones solo-icono (sidebar colapsado, acciones KDS).
- [ ] `aria-live` para nuevos pedidos en KDS y toasts de error.
- [ ] Verificar contraste de tokens en ambos temas (claro/oscuro).
- [ ] Skip-link "Saltar al contenido" en panel.
