INSTALACIÓN IMPRESORA TÉRMICA RONGTA 80mm (ACE H1)
Store Platform — POS / Kiosco
================================================

1. INSTALAR EL DRIVER
---------------------
- Descarga el driver de Rongta para la ACE H1 (rongtatech.com → Download → Driver) o usa el que venga con la impresora.
- Conecta la impresora por USB y enciéndela.
- Verifica que aparezca en: Panel de control → Dispositivos e impresoras.

2. CONFIGURAR WINDOWS
---------------------
a) Configuración → Bluetooth y dispositivos → Impresoras y escáneres:
   - Desactiva "Permitir que Windows administre mi impresora predeterminada".
   - Clic en la RONGTA → "Establecer como predeterminada".

b) Clic derecho en la RONGTA → Preferencias de impresión → Opciones avanzadas:
   - Paper Size: "RP80: 297 mm"
     IMPORTANTE: NO usar "RP80: roll" — con "roll" el ticket sale
     reducido (~la mitad del ancho del papel).
   - Paper Cut: Full cut at Page End
   - Paper Feed After Page: 3 mm
   - Rotate print: Non-Rotate
   - Paper save: On (corta el papel justo al terminar el contenido)

3. PRIMERA IMPRESIÓN EN CHROME
----------------------------
Esta primera impresión "guarda" los ajustes que usará la impresión automática:
- Imprime cualquier ticket desde el POS (botón Imprimir).
- En el diálogo de Chrome:
    Paper size: "RP80: 297 mm"
    Márgenes: Ninguno (None)
    Escala: Predeterminada (Default)
- Imprime una prueba: el ticket debe salir a todo el ancho (~70mm de texto).

4. IMPRESIÓN AUTOMÁTICA AL COBRAR (sin diálogo)
----------------------------------------------
a) En la app: Configuración → Impresión → activa "Impresión automática".
   Es por equipo — actívalo en cada terminal que imprima.

b) Chrome en modo impresión silenciosa:
   1. Clic derecho en el acceso directo de Chrome → Propiedades.
   2. En "Destino", al FINAL (después de las comillas, con un espacio)
      agrega:  --kiosk-printing
      Queda así:
      "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
   3. Aceptar (si pide admin: Continuar).
   4. Cierra Chrome COMPLETAMENTE y ábrelo solo desde ese acceso.
      Tip: ancla ese acceso a la barra de tareas para la caja.

Listo: al cobrar una orden el ticket sale impreso solo, sin diálogo.

5. SOLUCIÓN DE PROBLEMAS
------------------------
- El ticket sale angosto / letra chiquita:
    El papel quedó en "RP80: roll". Cambia a "RP80: 297 mm" en
    Preferencias de impresión Y en el diálogo de Chrome.
- Al cobrar no imprime nada:
    Revisa que el switch de impresión automática esté activo en
    Configuración y que Chrome se abrió con el acceso --kiosk-printing.
- Imprime en otra impresora:
    La impresión silenciosa siempre va a la PREDETERMINADA de Windows.
- Sale el diálogo de impresión cada vez:
    Chrome se abrió sin la bandera (otro acceso, otro icono).
- Autotest de la impresora (verifica el hardware):
    Apagada → mantén FEED → enciende sin soltar → suelta cuando imprima.
    Debe imprimir a todo el ancho del papel.
- Papel de 58mm en impresora de 80mm o viceversa:
    Cambia el ancho del papel en la utilidad/propiedades del driver.

6. PARA DESARROLLADORES — dónde vive el ticket
---------------------------------------------
- Estructura del ticket: components/molecules/OrderTicket.tsx
- Tamaño de papel / letra / reglas de impresión: app/globals.css
  (busca @page, @media print y .print-copy — el diseño es HTML+CSS,
  el navegador lo convierte a lo que imprime el driver; no hay PDF).
