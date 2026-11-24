# Tarjeta de lealtad Moto Roka

Regla: **5 sellos = el 6.º Servicio Express gratis**. Un sello por servicio.

- `/` alta (nombre + WhatsApp) → `/tarjeta.html#<id>` tarjeta web con QR y botones de Wallet.
- `/panel` panel del taller (clave): escanear el QR del cliente con la cámara del teléfono abre su ficha;
  también busca por código `MR-XXXXXX` o WhatsApp. +1 sello, canjear, quitar sello, enviar enlace por WhatsApp,
  enviar promoción a todos.
- Avisos: al sellar/canjear, el pase se actualiza en Apple Wallet (push APNs) y Google Wallet (mensaje).
  Las promociones llegan a todos los pases. En iPhone, al pasar cerca del taller la tarjeta aparece en la pantalla bloqueada.

## Variables de entorno (Netlify → Site configuration → Environment variables)

| Variable | Qué es |
|---|---|
| `PANEL_CLAVE` | Clave del panel (larga). |
| `LEALTAD_SECRETO` | 32+ caracteres aleatorios para firmar la sesión. |
| `SITIO_URL` | URL pública, p. ej. `https://lealtad.motorokafixshop.com`. |
| `TALLER_LAT`, `TALLER_LNG` | Coordenadas exactas del taller (aviso por cercanía en iPhone). |
| `APPLE_PASS_TYPE_ID` | p. ej. `pass.com.motoroka.lealtad` (Apple Developer → Identifiers → Pass Type IDs). |
| `APPLE_TEAM_ID` | Team ID de la cuenta Apple Developer. |
| `APPLE_PASS_CERT_P12` | Certificado del Pass Type ID exportado como .p12, en base64 (`base64 -i cert.p12`). |
| `APPLE_PASS_CERT_PASS` | Contraseña del .p12. |
| `APPLE_WWDR_PEM` | Certificado intermedio Apple WWDR G4 en PEM. |
| `GOOGLE_ISSUER_ID` | Issuer ID de Google Wallet (pay.google.com/business/console). |
| `GOOGLE_SA_JSON` | JSON de la cuenta de servicio de Google Cloud con acceso al emisor. |

Sin las variables de Apple o Google el botón correspondiente no aparece; la tarjeta web funciona igual.

## Límites a saber
- Apple: el aviso por cercanía se muestra en la pantalla bloqueada (no es una notificación con sonido) y solo si iOS lo considera relevante.
- Google Wallet: las notificaciones de promoción están limitadas por Google (pocas por pase al día). Las tarjetas nuevas de Google
  quedan en modo prueba hasta que Google aprueba el emisor para producción.
- Datos en Netlify Blobs (store `lealtad`).
