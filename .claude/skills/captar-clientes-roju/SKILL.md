---
name: captar-clientes-roju
description: Sistema de captación de clientes de ROJU Consulting. Busca negocios locales (Malinalco y región) con señales de que necesitan marca, redes, web o sistemas; los califica, propone el servicio de ROJU que les encaja y redacta el primer mensaje. Usar con /captar-clientes-roju, "busca prospectos", "clientes potenciales", "leads para ROJU".
argument-hint: "<zona> <giros> <cantidad>"
---

# Captación de clientes · ROJU Consulting

ROJU (Pablo Knauth y Kevin Juárez, Malinalco, Edo. Méx.) vende a negocios locales: arranque de marca (desde
$2,000), redes sociales (desde $1,900/mes), página web (desde $4,000), contenido suelto (post $250, carrusel o
reel $450), y punto de venta, CRM o automatizaciones cuando hacen falta. Precios en MXN, siempre con "desde".

## 1. Parámetros

Si el usuario no los dio, pregunta UNA vez: zona (por defecto Malinalco), giros y cantidad (por defecto 15).
Giros con mejor encaje: rentas y hoteles, restaurantes y cafés, talleres, gimnasios, inmobiliarias, tiendas,
spas y temazcales, tours, salones de eventos.

## 2. Búsqueda (WebSearch / WebFetch; delega búsquedas repetitivas al agente `rapido`)

Para cada candidato reúne solo datos públicos del negocio: nombre, giro, zona, Instagram/Facebook, sitio web,
ficha de Google Maps (calificación y número de reseñas), teléfono o WhatsApp **publicado por el propio negocio**.
No busques datos personales de dueños ni empleados. Descarta clientes actuales: Moto Roka, Malinalco Mágico.

## 3. Señales de oportunidad (califica 1–5 cada prospecto)

| Señal | Servicio de ROJU |
|---|---|
| Sin sitio web o solo Facebook | Página web |
| Redes abandonadas (>30 días sin publicar) o fotos de baja calidad | Redes sociales / contenido |
| Logo pixelado, identidad inconsistente | Arranque de marca |
| Reservas o pedidos solo por mensaje, sin catálogo | Web con WhatsApp o catálogo |
| Buenas reseñas pero poca presencia digital | Redes + Google Maps |
| Muchos clientes y operación desordenada (reseñas sobre tiempos, pedidos) | Punto de venta / CRM |

Puntaje = qué tan clara es la necesidad × qué tan capaz parece de pagar. Prioriza 4–5.

## 4. Entrega

Tabla ordenada por puntaje: negocio · giro · enlace · señal detectada (concreta, verificable) · servicio
sugerido · puntaje. Debajo, para los 5 mejores, un **mensaje de primer contacto** por WhatsApp o Instagram:
máximo 4 líneas, tuteo cálido, menciona algo específico de su negocio, ofrece el **diagnóstico gratuito**
y no pone precios. Firma "Pablo / Kevin · ROJU Consulting".

## 5. Reglas

- Nada inventado: cada señal debe tener su enlace. Si no se pudo verificar, dilo.
- No enviar mensajes ni cargar datos al CRM sin autorización explícita del usuario.
- Guarda el resultado en `prospectos/AAAA-MM-DD-<zona>.md` para no repetir negocios en la siguiente ronda;
  antes de buscar, revisa esa carpeta y excluye los ya listados.
