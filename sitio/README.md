# Sitio de marca personal · Biblioteca de IA

Web estática con biblioteca de recursos gratis (se desbloquean siguiendo en Instagram), tienda y
"Sobre mí". Los recursos se escriben en Markdown y se generan como página web y como PDF con el
mismo estilo visual.

## Estructura

```
sitio/
├── index.html              ← generado (no editar; edita scripts/plantilla-index.html)
├── assets/
│   ├── js/config.js        ← TU MARCA: nombre, Instagram, dominio, productos, textos
│   ├── js/app.js           ← biblioteca, filtros, desbloqueo, tienda
│   ├── js/recursos.js      ← generado: índice de recursos
│   ├── css/                ← base (colores y tipografía), site, doc (recursos y PDF), fuentes
│   ├── fonts/              ← tipografías alojadas en el sitio
│   └── img/                ← retrato, banner, favicon
├── contenido/*.md          ← TUS RECURSOS (edita aquí)
├── recursos/*.html         ← generado: versión web de cada recurso
├── recursos/pdf/*.pdf      ← generado: versión PDF
└── scripts/                ← build.py, pdf.js, plantilla-index.html, sprite.svg
```

## Editar y regenerar

1. Cambia tus datos en `assets/js/config.js` (busca los `TODO`).
2. Edita o agrega recursos en `contenido/`. Cabecera de cada archivo:
   ```yaml
   ---
   titulo: Nombre del recurso
   subtitulo: Una frase que explique qué consigue la persona
   tipo: Prompts | Guía | Tutorial | Manual | Plantilla   (o uno nuevo)
   color: tomato | pink | mustard | moss
   garabato: estrella | corona | rayo | espiral
   nivel: Principiante | Intermedio | Todos
   orden: 7
   ---
   ```
   Bloques especiales: ` ```prompt ` (tarjeta con botón Copiar), ` ```codigo ` (código),
   `> texto` (nota amarilla), `- [ ] tarea` (checklist), `______` (línea para rellenar).
3. Regenera todo:
   ```bash
   cd sitio
   pip install markdown pyyaml
   npm install -g playwright && npx playwright install chromium   # solo la primera vez, en tu computadora
   python3 scripts/build.py
   ```

## El reto (calendario)

El calendario de la sección **El reto** se llena con `assets/js/reto.js`. Agrega una línea por día:

```js
{ fecha: "2026-11-05", tipo: "entreno", que: "Pierna + core", minutos: 60, nota: "Arranqué con todo" },
{ fecha: "2026-11-11", tipo: "descanso", nota: "Recuperación" },
```

- Los días con registro se marcan con un zarpazo (entreno) o en verde (descanso).
- Los días pasados sin registro aparecen punteados; el día de hoy, con borde amarillo.
- La racha, el avance y el número de día se calculan solos con la fecha del visitante.
- Cambia `inicio` o `dias` si ajustas la duración del reto.

No hace falta regenerar nada: guarda el archivo y vuelve a publicar. Si conectas Netlify a GitHub
(base directory `sitio`), cada cambio subido se publica solo.

## Cobrar con Mercado Pago

**Opción rápida, sin programar:** en tu cuenta de Mercado Pago entra a cobrar → **Link de pago**,
crea un link por producto (nombre, precio, descripción) y pega cada link en `enlace` dentro de
`config.js`. El botón **Comprar** abre el pago de Mercado Pago. Acepta tarjeta, saldo, SPEI y
efectivo, y el comprador no necesita cuenta.

La entrega del PDF no es automática con un link: cuando recibas el aviso de venta, envía el archivo
al correo del comprador. Escribe en la descripción del link: "Recibirás el PDF en tu correo en menos
de 24 h".

**Opción automática (más adelante):** Checkout Pro de Mercado Pago con una función de Netlify que
crea el pago, recibe la notificación (webhook), verifica que el pago esté aprobado y envía el enlace
de descarga por correo. Requiere tus credenciales de producción guardadas como variables de entorno
en Netlify, **nunca** en el código, porque el repositorio es público.

## Productos de pago

Viven **fuera** de `sitio/`, en `../productos-pago/`, para que nunca se publiquen gratis en la web.

- Escribe el contenido en `productos-pago/contenido/*.md` (mismo formato que los recursos).
- Genera los PDF con `python3 scripts/build.py --pago`. Salen en `productos-pago/pdf/` y llevan
  la nota "Licencia de uso personal · No redistribuir".
- Empaqueta los kits con `python3 scripts/empaquetar.py` (salen en `productos-pago/entregables/`).
- Al recibir un pago de Mercado Pago, envía al comprador el PDF o el ZIP de su producto.
- El plan del catálogo y las fuentes de cada recurso están en `productos-pago/PLAN-CATALOGO.md`.

## Publicar gratis en Netlify (dirección actual)

El sitio está configurado para **https://pabloknauth.netlify.app** (gratis, con HTTPS).

1. app.netlify.com → *Sign up with GitHub* → *Add new site* → *Import an existing project* → GitHub.
2. Repositorio `https-github.com-alesha-pro-tools`, rama `sitio-marca-personal`,
   base directory `sitio`, build command vacío, publish directory `sitio`.
3. *Site configuration → Change site name* → `pabloknauth`. Si cambia, elige otro y cambia
   `dominio` en `config.js`, regenera con `python3 scripts/build.py` y sube los cambios.
4. *Site configuration → Forms* → activa *form detection* para guardar los correos.

## Publicar con tu propio dominio (Netlify)

1. **Compra el dominio** en Cloudflare Registrar, Namecheap o Porkbun. Un `.com` suele costar
   entre US$10 y US$15 al año; confirma el precio de renovación, no solo el del primer año.
2. **Sube el sitio:** en app.netlify.com → *Add new site* → *Deploy manually* → arrastra la carpeta
   `sitio/` completa. Netlify te da una dirección `algo.netlify.app` para probarlo.
3. **Conecta el dominio:** en el sitio → *Domain management* → *Add a domain*. Netlify te muestra
   los registros DNS exactos (o te ofrece usar sus servidores de nombres). Cópialos en el panel
   donde compraste el dominio. El HTTPS se activa solo, a veces tarda unas horas.
4. Cambia `dominio` en `config.js`, regenera y vuelve a subir la carpeta.

Alternativas igual de válidas: Cloudflare Pages o Vercel (en ese caso pon un endpoint de
Formspree o Tally en `formEndpoint` para recibir los correos).

## Cómo funciona el desbloqueo

- La persona toca **Seguir**, se abre tu Instagram y, tras unos segundos, se activa
  **Ya te sigo · desbloquear**. El desbloqueo queda guardado en su navegador.
- **Instagram no permite comprobar desde una web si alguien te sigue.** Funciona por confianza,
  igual que en la mayoría de sitios con "sígueme para desbloquear". Si necesitas comprobarlo de
  verdad, usa una automatización de DMs (por ejemplo ManyChat: "comenta PROMPTS y te envío el
  enlace"), que sí exige seguirte.
- El correo es opcional. En Netlify se guarda en *Forms* → `desbloqueo` (el plan gratuito tiene un
  límite mensual de envíos). Exporta esa lista a tu herramienta de email marketing.

## Tienda

Cada producto en `config.js` tiene un `enlace`. Pega ahí tu Payment Link de Stripe, o tu enlace de
Hotmart, Gumroad o Lemon Squeezy. Si el enlace está vacío, el botón muestra **Muy pronto**.
Los productos, precios y textos incluidos son una propuesta: cámbialos antes de publicar.
