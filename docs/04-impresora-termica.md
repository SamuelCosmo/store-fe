# 4. Impresora térmica de tickets

Guía de instalación y uso de la impresora de tickets en Caja y Kiosco.

**Hardware:** Rongta ACE H1-UE — térmica 80 mm, ESC/POS, puertos
USB + Serial + Ethernet (sin WiFi ni Bluetooth), autocortadora y soporte
para cajón de dinero.

## Cómo funciona

El sistema imprime con `window.print()` contra la **impresora
predeterminada del sistema operativo** — no hay agente ni cola propia.
El formato del papel (80 mm continuo, solo el ticket en negro) lo define
`@media print` en `app/globals.css`.

Opciones de cada equipo:

| Config | Efecto |
|---|---|
| Switch `/settings` → Impresión → "Imprimir ticket al cobrar" | Al confirmar el cobro, el ticket sale automático (una vez por orden) |
| Flag `--kiosk-printing` en Chrome | Imprime directo, sin diálogo de Windows |
| Botón "Imprimir ticket" (POS) / icono 🖨 (Cocina y `/orders`) | Reimpresión manual, con o sin auto-impresión activa |

## Instalación por equipo

1. **Driver**: descargar el driver Windows de la ACE H1-UE desde el sitio
   oficial de Rongta (`rongtatech.com` → soporte/descargas) e instalarlo.
2. **Conectar** la impresora por USB, encenderla y cargar el rollo de
   papel térmico de 80 mm.
3. **Predeterminada**: en Windows → Configuración → Impresoras, dejarla
   como impresora predeterminada y mandar una página de prueba.
4. **Corte automático**: en Propiedades de la impresora → opciones de
   papel, activar "cortar al final del documento" (el nombre exacto varía
   por driver). El cajón de dinero (si se conecta) se habilita ahí mismo:
   "abrir cajón al imprimir".
5. **Navegador**: crear un acceso directo de Chrome para cada terminal:

   ```text
   # Caja — imprime sin diálogo cada vez que se cobra o se pide reimprimir
   "C:\Program Files\Google\Chrome\chrome.exe" --kiosk-printing https://<frontend>/pos

   # Kiosco — modo kiosco completo (pantalla fija) + impresión silenciosa
   "C:\Program Files\Google\Chrome\chrome.exe" --kiosk --kiosk-printing https://<frontend>/kiosk
   ```

   > Si el diálogo de impresión sigue apareciendo con `--kiosk-printing`
   > solo, agregar también `--kiosk` — algunas versiones de Chrome lo
   > requieren.
6. **Activar en la app**: entrar como ADMIN → `/settings` → sección
   **Impresión** → encender "Imprimir ticket al cobrar". Es por equipo:
   hay que activarlo en cada máquina que tenga impresora.

## Prueba

1. En Caja, cobrar una orden de prueba → el ticket debe salir solo,
   sin diálogo.
2. En Kiosco, terminar un pedido → mismo comportamiento.
3. Reimpresión: POS ("Imprimir ticket"), Cocina (icono 🖨) o `/orders`.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| No sale nada | La impresora no es la predeterminada, o está apagada/sin papel |
| Sale el diálogo de Windows | Falta el flag `--kiosk-printing` en el acceso directo |
| El ticket sale cortado raro o miniatura | Escala del diálogo/driver distinta de 100 % — con `--kiosk-printing` Chrome usa el `@page` CSS (80 mm) y escala real |
| No corta el papel | "Cortar al final del documento" apagado en el driver |
| No abre el cajón | Habilitarlo en el driver; si no lo expone → requiere ESC/POS (ver abajo) |
| Texto pálido/grisáceo | El print fuerza negro; si aun así sale tenue es densidad del driver ("print density") |

## Pendiente / escalable

- La interfaz **Ethernet** de la impresora (puerto 9100, ESC/POS crudo)
  permitiría imprimir sin driver de Windows, cortar y abrir el cajón por
  comando — pero el browser no abre sockets TCP: requeriría un agente
  local (mismo patrón que el módulo de terminal bancaria). Solo si el
  driver no cubre corte/cajón o se quiere una impresora de cocina remota.
- QZ Tray es la alternativa empaquetada al agente propio si el equipo lo
  amerita.
