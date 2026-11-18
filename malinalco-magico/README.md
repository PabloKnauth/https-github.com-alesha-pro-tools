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

## Evaluaciones y ranking
- Los huéspedes califican desde la página (botón **Escribir evaluación**): general de 1 a 5, cinco categorías y comentario.
- Llegan a Netlify → **Forms → evaluacion** (activa *form detection* en Netlify). Nada se publica solo.
- Para publicar una, cópiala en `assets/js/evaluaciones.js` (formato al inicio del archivo) o pásamela.
- El ranking de la portada se arma solo con las evaluaciones publicadas. «Favorita de nuestros huéspedes» aparece con promedio ≥ 4.8 y al menos 5 evaluaciones.
- Nunca publicar reseñas inventadas: además de engañar al cliente, la Profeco puede sancionarlo.

## Recámaras divididas
En `casas.js`, cada casa acepta `habitaciones: [{ nombre: "Recámara 1", camas: "1 king y 1 individual", foto: 8 }]`
(`foto` es el número de foto en la lista, desde 0). Sin ese dato se muestra el resumen de personas, recámaras, camas y baños.

## Panel de administración

- Acceso: doble clic en el «©» del pie de página, o directamente `/admin`.
  El panel no está enlazado ni indexado, pero lo que lo protege es la contraseña, que se valida en el servidor.
- **Configuración obligatoria en Netlify:** Project configuration → Environment variables:
  - `ADMIN_PASSWORD`: contraseña del panel (mínimo 8 caracteres; mejor 12 o más).
  - `MM_TOKEN_SECRET` (opcional): cadena larga aleatoria para firmar las sesiones.
  Después de crearlas, vuelve a desplegar (Deploys → Trigger deploy).
- Los datos se guardan en Netlify Blobs (almacén `malinalco-magico`): reservas, cambios de casas,
  evaluaciones, atractivos, lugares recomendados y ajustes. Descarga un respaldo desde *Ajustes*.
- Secciones: Resumen (ocupación, ingresos, saldo, llegadas/salidas, casas incompletas), Reservas
  (con calendario y aviso de choques), Casas, Evaluaciones, Áreas de oportunidad, Atractivos,
  Recomendados y Ajustes.

### Evaluaciones

- Toda evaluación llega como «pendiente» y solo se publica cuando el administrador la aprueba.
- Las de **3 ★ o más** se muestran completas en la página.
- El texto de las de **1–2 ★** nunca se envía a la página pública; se gestiona en *Áreas de oportunidad*.
- El promedio y el número de evaluaciones públicos incluyen **todas** las publicadas (también las de 1–2 ★).
  Mostrar un promedio calculado solo con las buenas sería engañoso para el consumidor.
- Las fotos no se editan desde el panel: se procesan con `scripts/mejorar_fotos.py`.
