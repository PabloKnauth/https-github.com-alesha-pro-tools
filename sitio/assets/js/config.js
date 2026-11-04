/* ==========================================================
   CONFIGURACIÓN DE TU MARCA — edita solo este archivo
   ========================================================== */
window.MARCA = {
  nombre: "Pablo Knauth",            // TODO: confirma el nombre de tu marca
  instagram: "pablo_knauth_",        // usuario de Instagram sin @
  kick: "pablo-knauth",              // canal de Kick (kick.com/pablo-knauth)
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

  // Moneda de los precios de la tienda (Mercado Pago México cobra en pesos).
  moneda: "MXN",

  /* Productos de pago.
     enlace: tu link de pago de Mercado Pago (o Stripe, Hotmart, Gumroad, Lemon Squeezy).
     Si "enlace" está vacío, el botón aparece como "Muy pronto".
     TODO: los nombres y precios (en pesos) son una propuesta; cámbialos por los tuyos. */
  productos: [
    {
      id: "pack-pro",
      etiqueta: "Más vendido",
      nombre: "Pack Pro de Prompts",
      precio: "$349",
      resumen: "Más de 200 prompts ordenados por objetivo, con ejemplos de salida y variantes para Claude y ChatGPT.",
      incluye: [
        "Prompts de posicionamiento, contenido, ventas y atención",
        "Plantillas de voz de marca listas para pegar",
        "Actualizaciones gratis del pack"
      ],
      enlace: "https://mpago.li/1rvkkRG",
      color: "tomato"
    },
    {
      id: "de-lo-que-sabes-a-producto",
      etiqueta: "Manual Pro",
      nombre: "De lo que sabes a un producto que vende",
      precio: "$499",
      resumen: "Convierte tu experiencia en una guía, plantilla o curso que la gente termina y aplica. Método de 9 pasos y plan de 14 días.",
      incluye: [
        "Mapa de acciones y diagnóstico de brechas",
        "Actividades de práctica con escenarios reales",
        "Estructura de página de venta y prueba con 3 personas",
        "Hoja de trabajo y 6 prompts"
      ],
      enlace: "https://mpago.li/1AykywQ",
      color: "moss"
    },
    {
      id: "sistema-visual-de-marca",
      etiqueta: "Kit Pro",
      nombre: "Sistema visual de marca",
      precio: "$699",
      resumen: "Paleta, tipografía, retículas e imagen para que te reconozcan antes de leer tu nombre. Con mi propia marca como ejemplo resuelto.",
      incluye: [
        "Manual con hojas de trabajo y plan de 7 días",
        "5 plantillas de retícula para Canva o Figma",
        "Prompts para auditar tus diseños con IA"
      ],
      enlace: "https://mpago.li/2NhDvzB",
      color: "tomato"
    },
    {
      id: "kit-skills",
      etiqueta: "Nuevo",
      nombre: "Kit de Skills para creadores",
      precio: "$699",
      resumen: "Cinco Skills de Claude listas para instalar: guionista de Reels, editor de captions, ideas de carrusel, respuestas a DMs y planificador semanal.",
      incluye: [
        "Cinco carpetas SKILL.md probadas",
        "Video de instalación en Claude y Claude Code",
        "Guía para adaptarlas a tu voz"
      ],
      enlace: "https://mpago.li/1scrjw4",
      color: "pink"
    },
    {
      id: "mentoria",
      etiqueta: "Cupos limitados",
      nombre: "Sesión 1:1 · Tu asistente de IA",
      precio: "$1,690",
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
