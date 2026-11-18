# Malinalco Mágico · sitio web

Sitio estático (sin compilación). Se publica tal cual en Netlify, Vercel o cualquier hosting.

## Qué editar
Todo el contenido vive en `assets/js/casas.js`:

- **Casas:** nombre, descripción, capacidad, precio (`null` = "Consultar precio"), amenidades,
  fotos (`assets/img/casas/...jpg`), enlace de Google Maps y posición en el mapa ilustrado.
- **Disponibilidad:** cada casa tiene `ocupada: [["llegada", "salida"], ...]` en AAAA-MM-DD.
  El día de salida queda libre para el siguiente huésped. La página calcula sola si está
  disponible hoy o en las fechas que busca el cliente.
- **Contacto:** WhatsApp, teléfono, Facebook e Instagram.
- `calendarioAlDia: false` muestra "Consulta disponibilidad" en todas las casas. Cuando empiecen a
  registrar fechas en `ocupada`, cámbialo a `true` y la página dirá "Disponible" u "Ocupada".
- `centro` y `angulo` colocan la casa en el mapa de distancias. Solo se publican distancias reales;
  la dirección alrededor del anillo es ilustrativa.
- Fotos: `assets/img/casas/<id>-01.jpg`, `-02.jpg`... (la 01 es la portada).

## Reservas
El botón **Reservar** abre WhatsApp (777 220 5239) con un mensaje que ya incluye la casa, las
fechas y el número de huéspedes. Si buscan fechas ocupadas, el botón se desactiva.

## Logo
`logo/` contiene el logotipo en SVG (vectorial, texto convertido a trazos) y PNG:
horizontal y vertical en tres fondos (color, blanco sobre terracota, blanco sobre selva),
el símbolo solo y la imagen de perfil para redes.

Paleta: terracota `#B4502B`, terracota oscuro `#8C3A1C`, cantera `#F5EEE4`, selva `#1D3F35`, oro `#C29A4A`.
Tipografías: Cormorant Garamond (títulos) y Jost (textos), ambas gratuitas de Google Fonts.

## Fotos
- Van en `assets/img/casas/` en WebP: tamaño grande (1600 px), `med/` (900 px, portadas) y `min/` (400 px, miniaturas).
- Están ordenadas de la más atractiva a la menos: la `-01` es la portada.
- `scripts/mejorar_fotos.py` es el proceso que se aplicó: limpieza de compresión, superresolución ×2 (FSRCNN),
  luz en 16 bits, balance de blancos leve, viveza y enfoque solo en bordes. No agrega ni quita contenido.
  Requiere `opencv-contrib-python-headless<5` y el modelo `FSRCNN_x2.pb`.
- Las fotos originales que se recibieron miden 720 × 960 px (descargadas de Facebook). Con las originales
  del celular la calidad mejoraría mucho más.
