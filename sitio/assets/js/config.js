/* ==========================================================
   CONFIGURACIÓN DE TU MARCA — edita solo este archivo
   ========================================================== */
window.MARCA = {
  nombre: "Pablo Knauth",            // TODO: confirma el nombre de tu marca
  instagram: "pablo_knauth_",        // usuario de Instagram sin @
  tiktok: "",                        // opcional, sin @
  youtube: "",                       // opcional, URL completa
  correo: "",                        // opcional, correo de contacto visible
  dominio: "tudominio.com",          // TODO: tu dominio final (aparece en los PDF)

  // Texto de "Sobre mí". Un párrafo por línea.
  sobreMi: [
    "Creo contenido y herramientas con inteligencia artificial para marcas personales.",
    "Aquí comparto lo que uso en mi propio trabajo: prompts, Skills, manuales y procesos, explicados para que los apliques el mismo día y sin perder tu forma de hablar."
  ],

  // Correo para el desbloqueo: en Netlify se guarda solo (Netlify Forms).
  // En otro hosting, pega aquí el endpoint de Formspree, Tally, etc. o déjalo vacío.
  formEndpoint: "",

  // Segundos que el botón "Ya te sigo" tarda en activarse después de abrir Instagram.
  esperaSeguir: 6,

  /* Productos de pago.
     enlace: tu link de Stripe Payment Links, Hotmart, Gumroad o Lemon Squeezy.
     Si "enlace" está vacío, el botón aparece como "Muy pronto".
     TODO: los nombres y precios son una propuesta; cámbialos por los tuyos. */
  productos: [
    {
      id: "pack-pro",
      etiqueta: "Más vendido",
      nombre: "Pack Pro de Prompts",
      precio: "US$19",
      resumen: "Más de 200 prompts ordenados por objetivo, con ejemplos de salida y variantes para Claude y ChatGPT.",
      incluye: [
        "Prompts de posicionamiento, contenido, ventas y atención",
        "Plantillas de voz de marca listas para pegar",
        "Actualizaciones gratis del pack"
      ],
      enlace: "",
      color: "tomato"
    },
    {
      id: "kit-skills",
      etiqueta: "Nuevo",
      nombre: "Kit de Skills para creadores",
      precio: "US$39",
      resumen: "Cinco Skills de Claude listas para instalar: guionista de Reels, editor de captions, ideas de carrusel, respuestas a DMs y planificador semanal.",
      incluye: [
        "Cinco carpetas SKILL.md probadas",
        "Video de instalación en Claude y Claude Code",
        "Guía para adaptarlas a tu voz"
      ],
      enlace: "",
      color: "pink"
    },
    {
      id: "mentoria",
      etiqueta: "Cupos limitados",
      nombre: "Sesión 1:1 · Tu asistente de IA",
      precio: "US$90",
      resumen: "Una videollamada de 60 minutos para construir juntos el asistente de IA de tu marca con tus textos reales.",
      incluye: [
        "Diagnóstico previo de tu contenido",
        "Instrucciones de tu asistente escritas en la llamada",
        "Grabación y resumen por escrito"
      ],
      enlace: "",
      color: "mustard"
    }
  ]
};
