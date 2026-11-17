/* ==========================================================
   DATOS DE MALINALCO MÁGICO — edita este archivo para actualizar la página
   ========================================================== */
window.MM = {
  // Mientras sea true, la página muestra un aviso de "datos de ejemplo".
  // Cámbialo a false cuando las casas, fotos y ubicaciones sean las reales.
  ejemplo: true,

  whatsapp: "527772205239",            // con 52 (México) y sin espacios
  telefono: "777 220 5239",
  facebook: "https://www.facebook.com/MalinalcoCasasVacacionales",
  instagram: "https://www.instagram.com/malinalcomagicocasas",
  // Mapa de Google centrado en Malinalco (no necesita clave)
  mapaGoogle: "https://www.google.com/maps?q=Malinalco,+Estado+de+M%C3%A9xico&z=15&output=embed",

  /* CASAS
     - fotos: rutas a las fotos (ej. "assets/img/casas/jardin-1.jpg"). Vacío = imagen provisional.
     - precio: número en pesos por noche, o null para mostrar "Consultar precio".
     - mapa: posición en el mapa ilustrado (x, y de 0 a 100).
     - maps: enlace de Google Maps a la casa (pega el de "Compartir" en Google Maps).
     - ocupada: rangos [llegada, salida] en AAAA-MM-DD. El día de salida queda libre. */
  casas: [
    {
      id: "casa-a",
      nombre: "Casa Ejemplo A",
      resumen: "Casa de ejemplo. Aquí va una descripción breve: estilo, vista, ambiente y lo que la hace especial.",
      huespedes: 8, recamaras: 3, banos: 2,
      precio: null,
      amenidades: ["Alberca climatizada", "Jardín", "Asador", "Wifi", "Estacionamiento"],
      fotos: [],
      mapa: { x: 68, y: 30 },
      maps: "https://www.google.com/maps/search/?api=1&query=Malinalco",
      ocupada: [["2026-11-20", "2026-11-23"], ["2026-12-24", "2026-12-27"]]
    },
    {
      id: "casa-b",
      nombre: "Casa Ejemplo B",
      resumen: "Casa de ejemplo. Ideal para describir una casa más grande, para familias o grupos de amigos.",
      huespedes: 12, recamaras: 5, banos: 4,
      precio: null,
      amenidades: ["Alberca climatizada", "Jacuzzi", "Asador", "Wifi", "Cocina equipada"],
      fotos: [],
      mapa: { x: 74, y: 62 },
      maps: "https://www.google.com/maps/search/?api=1&query=Malinalco",
      ocupada: [["2026-11-14", "2026-11-19"], ["2026-12-30", "2027-01-03"]]
    },
    {
      id: "casa-c",
      nombre: "Casa Ejemplo C",
      resumen: "Casa de ejemplo. Perfecta para describir una opción íntima, para parejas o escapadas cortas.",
      huespedes: 4, recamaras: 2, banos: 1,
      precio: null,
      amenidades: ["Alberca climatizada", "Terraza", "Wifi", "Pet friendly"],
      fotos: [],
      mapa: { x: 47, y: 70 },
      maps: "https://www.google.com/maps/search/?api=1&query=Malinalco",
      ocupada: [["2026-11-28", "2026-11-30"]]
    }
  ]
};
