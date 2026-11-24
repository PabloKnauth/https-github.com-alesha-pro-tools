# Tarjeta de lealtad Moto Roka (Cloudflare Pages)

Vive dentro del sitio de Moto Roka: páginas en `motoroka/lealtad/`, API en `functions/lealtad/api/` (Pages Functions),
código compartido aquí. Reglas: **4 sellos = el 5.º Servicio Express gratis** y **regalo de cumpleaños** (vale 30 días
desde el cumpleaños, una vez al año).

- Personalización: el cliente elige tema (Noche, Azul Roka, Acero, Hielo: solo colores de la marca) e icono de sello
  (moto, casco, llave, llanta, aceite, velocímetro) desde su tarjeta; el pase de Wallet se actualiza.
- Iconos: `motoroka/lealtad/a/iconos.js` es la fuente única. Si se cambian, regenerar:
  `node lealtad-api/generar-mascaras.cjs && node lealtad-api/generar-franjas.mjs` (franjas PNG estáticas en `motoroka/lealtad/franjas/`).
- `/lealtad/` alta (nombre, WhatsApp, cumpleaños opcional) → `/lealtad/tarjeta.html#<id>`.
- `/lealtad/panel.html` panel del taller (clave): sellar, canjear, quitar sello, entregar regalo, registrar cumpleaños, promociones.
- `cloudflare/cumple-cron/worker.js`: Worker con disparador diario que llama `/lealtad/api/cumple` para felicitar.

## Configuración en Cloudflare (Workers & Pages → proyecto de Moto Roka → Settings)
- **Bindings → KV namespace:** nombre de variable `LEALTAD`.
- **Variables y secretos:** `PANEL_CLAVE`, `LEALTAD_SECRETO` (32+ caracteres), `CRON_CLAVE` (20+), `SITIO_URL`,
  `REGALO_CUMPLE` (opcional; por defecto «20% de descuento en accesorios»), y cuando existan: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT_PEM` + `APPLE_PASS_KEY_PEM`
  (recomendado; o `APPLE_PASS_CERT_P12` en base64 + `APPLE_PASS_CERT_PASS`), `APPLE_WWDR_PEM`, `GOOGLE_ISSUER_ID`, `GOOGLE_SA_JSON`.
- Avisos push de Apple: certificado del Pass Type ID subido con `wrangler mtls-certificate upload` y enlazado como `APNS_CERT`
  (pendiente de verificar con la cuenta real).
- Ubicación del taller: 18.9496043, -99.4935796 (se puede cambiar con `TALLER_LAT`/`TALLER_LNG`).

`forge.min.js`: node-forge 1.3.1 (licencia en `LICENSE-forge.txt`), con `window` cambiado a `globalThis` para Workers.
