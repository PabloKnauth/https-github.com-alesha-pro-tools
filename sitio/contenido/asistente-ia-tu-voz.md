---
titulo: Crea tu asistente de IA con tu voz
subtitulo: Guía paso a paso para tener una IA que escriba como tú, conozca tu negocio y no suene a robot.
tipo: Guía
color: pink
garabato: corona
nivel: Principiante
orden: 2
---

## Qué vas a construir

Un asistente es una conversación de IA que ya trae preparado lo que siempre tienes que explicarle: quién eres, a quién le hablas, cómo escribes y qué vendes. En lugar de empezar de cero cada vez, abres tu asistente y pides directamente "escríbeme el guion del martes".

Lo puedes armar en **Claude** (con Proyectos) o en **ChatGPT** (con GPTs personalizados). El método es el mismo; solo cambia dónde pegas las cosas.

> **Tiempo:** una tarde. **Costo:** los Proyectos de Claude y la creación de GPTs pueden requerir un plan de pago según el momento; revisa las condiciones actuales de cada servicio antes de empezar.

## Paso 1 · Reúne tu material

Abre una carpeta y guarda ahí:

- [ ] 10 textos tuyos que te gusten: copies, correos, guiones o mensajes
- [ ] 3 publicaciones que funcionaron muy bien (y por qué crees que funcionaron)
- [ ] La lista de tus productos o servicios con precios
- [ ] Las 10 preguntas que más te hacen tus clientes, con tus respuestas
- [ ] Palabras o frases que jamás usarías

No hace falta que esté bonito. La IA aprende de ejemplos reales mucho mejor que de descripciones.

## Paso 2 · Escribe tu documento de voz

Usa la **Plantilla de voz de marca** de esta biblioteca. Si no tienes tiempo, pega tus 10 textos en una conversación y usa este prompt:

```prompt
Analiza estos 10 textos que escribí yo: [pega los textos]. Describe mi forma de escribir en un documento de una página: largo de frases, nivel de formalidad, palabras que repito, cómo empiezo y cómo cierro, uso de humor, de emojis y de preguntas. Incluye 5 reglas que debería seguir alguien que quiera escribir como yo.
```

Lee el resultado y corrige lo que no sea cierto. Ese documento es el corazón de tu asistente.

## Paso 3 · Escribe las instrucciones

Las instrucciones son el texto que el asistente lee antes de cada conversación. Copia esta plantilla y rellénala:

```prompt
Eres el asistente de contenido de [tu nombre], [qué haces] para [público].

TU TRABAJO
Ayudarme a crear guiones de Reels, carruseles, copies, correos y respuestas a mensajes que suenen exactamente como yo.

MI AUDIENCIA
[Describe a tu cliente ideal en 3 líneas: situación, frustración y deseo.]

CÓMO ESCRIBO
Sigue el documento "voz-de-marca" que está en tus archivos. Reglas clave:
- [regla 1]
- [regla 2]
- [regla 3]

LO QUE NUNCA HACES
- No inventas datos, testimonios ni resultados. Si necesitas un dato, me lo preguntas.
- No usas estas palabras: [lista].
- No prometes resultados garantizados.

CÓMO TRABAJAS CONMIGO
- Si mi pedido es ambiguo, hazme como máximo 2 preguntas antes de escribir.
- Entrega primero la versión corta. Ofrece la larga solo si la pido.
- Cuando escribas un guion, incluye el texto en pantalla.

MIS PRODUCTOS
[Lista de productos con precio y enlace.]
```

## Paso 4 · Configúralo

**En Claude:** crea un Proyecto nuevo, pega la plantilla del paso 3 en las instrucciones del proyecto y sube tu documento de voz, tus textos de ejemplo y tu lista de productos como archivos del proyecto. Cada conversación que abras dentro del proyecto tendrá todo eso.

**En ChatGPT:** entra a la sección de GPTs, elige crear uno nuevo y usa la pestaña de configuración manual. Pega las instrucciones, sube los mismos archivos como conocimiento y desactiva las funciones que no necesites.

> Los nombres de los menús cambian con frecuencia. Si no encuentras una opción, busca "Projects" en la ayuda de Claude o "Custom GPTs" en la de OpenAI.

## Paso 5 · Ponlo a prueba

Haz estos 5 pedidos y anota qué falla:

1. "Escríbeme un guion de Reel sobre [tema frecuente]."
2. "Responde este DM: [mensaje real que recibiste]."
3. "Dame 10 ideas para la próxima semana."
4. "Convierte este Reel en carrusel: [guion]."
5. "Escribe el anuncio de [producto]."

Cada vez que algo no suene a ti, no lo corrijas solo en la conversación: **agrega una regla a las instrucciones**. Después de 2 o 3 rondas el asistente queda afinado.

## Errores frecuentes

- **Instrucciones larguísimas.** Más de dos páginas confunde. Lo detallado va en los archivos.
- **Describir en lugar de mostrar.** "Escribo cercano" no sirve; tres ejemplos reales sí.
- **Pedirle que invente pruebas.** Testimonios y cifras siempre los aportas tú.
- **No actualizarlo.** Cada vez que lances algo nuevo, actualiza la lista de productos.

## Checklist final

- [ ] Mi asistente tiene instrucciones, documento de voz y ejemplos
- [ ] Probé los 5 pedidos
- [ ] Agregué al menos 3 reglas nuevas después de las pruebas
- [ ] Lo guardé en favoritos para abrirlo cada día
