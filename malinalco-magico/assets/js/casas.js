/* ==========================================================
   DATOS DE MALINALCO MÁGICO — edita este archivo para actualizar la página
   Fuente: publicaciones de Facebook de cada casa (noviembre 2026). Las fotos van de la más atractiva a la menos.
   ========================================================== */
window.MM = {
  // true = ya se registran las fechas ocupadas en "ocupada" y la página muestra
  // "Disponible / Ocupada". false = muestra "Consulta disponibilidad".
  calendarioAlDia: false,

  whatsapp: "527772205239",            // con 52 (México) y sin espacios
  telefono: "777 220 5239",
  facebook: "https://www.facebook.com/MalinalcoCasasVacacionales",
  instagram: "https://www.instagram.com/malinalcomagicocasas",
  mapaGoogle: "https://www.google.com/maps?q=Malinalco,+Estado+de+M%C3%A9xico&z=15&output=embed",
  nota: "Las cotizaciones dependen del número de personas y las fechas.",

  /* CASAS
     - personas: [mínimo, máximo] · recamaras · banos (null si no se publicó) · camas (texto)
     - reglas: lista de reglas de la casa (se muestran en la ficha)
     - destino: "Malinalco" o "Acapulco"
     - centro: { min: minutos al centro, texto } para el mapa de distancias (null si no se sabe)
     - angulo: dirección ilustrativa del pin en el mapa (0-360). No es la ubicación real.
     - maps: enlace de Google Maps a la casa (vacío = botón "Pedir ubicación")
     - ocupada: rangos [llegada, salida] en AAAA-MM-DD; el día de salida queda libre. */
  casas: [
    {
      "id": "puente-de-dios",
      "nombre": "Casa Puente de Dios",
      "destino": "Malinalco",
      "etiqueta": "Nueva · Familiar 5 ★",
      "resumen": "Casa familiar nueva con jardín, lago y apancles. Alberca climatizada todo el año, palapa y chica de servicio incluida.",
      "personas": [
        10,
        12
      ],
      "recamaras": 4,
      "banos": 4,
      "camas": null,
      "amenidades": [
        "Alberca climatizada todo el año",
        "Palapa",
        "Jardín con lago y apancles",
        "Asador",
        "Cocina equipada",
        "Chica de servicio incluida"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "puente-de-dios-01",
        "puente-de-dios-02",
        "puente-de-dios-03",
        "puente-de-dios-04",
        "puente-de-dios-05",
        "puente-de-dios-06",
        "puente-de-dios-07",
        "puente-de-dios-08",
        "puente-de-dios-09",
        "puente-de-dios-10",
        "puente-de-dios-11",
        "puente-de-dios-12",
        "puente-de-dios-13",
        "puente-de-dios-14"
      ]
    },
    {
      "id": "paso-de-agua",
      "nombre": "Casa Paso de Agua",
      "destino": "Malinalco",
      "etiqueta": "Vista panorámica",
      "resumen": "Casa familiar y de relajación con vista panorámica a los cerros, alberca climatizada, terraza y huertas frutales.",
      "personas": [
        4,
        7
      ],
      "recamaras": 2,
      "banos": 2.5,
      "camas": "Matrimonial, queen y sofá cama individual",
      "amenidades": [
        "Alberca climatizada",
        "Vista panorámica",
        "Terraza",
        "Asador",
        "Huertas frutales",
        "Zona cálida"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [
        "Música moderada"
      ],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "paso-de-agua-01",
        "paso-de-agua-02",
        "paso-de-agua-03",
        "paso-de-agua-04",
        "paso-de-agua-05",
        "paso-de-agua-06",
        "paso-de-agua-07",
        "paso-de-agua-08",
        "paso-de-agua-09",
        "paso-de-agua-10",
        "paso-de-agua-11",
        "paso-de-agua-12",
        "paso-de-agua-13",
        "paso-de-agua-14"
      ]
    },
    {
      "id": "quinta-amate",
      "nombre": "Quinta Amate",
      "destino": "Malinalco",
      "etiqueta": "Junto al río",
      "resumen": "Casa familiar en medio de la naturaleza, junto al río, para desconectarte de la ciudad y relajarte por completo.",
      "personas": [
        4,
        6
      ],
      "recamaras": 2,
      "banos": 2,
      "camas": "3 camas",
      "amenidades": [
        "Alberca-jacuzzi climatizado 30–32 °C",
        "Asador",
        "Rodeada de naturaleza",
        "Junto al río"
      ],
      "centro": {
        "min": 20,
        "texto": "A 20 minutos del centro"
      },
      "angulo": 150,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "quinta-amate-01",
        "quinta-amate-02",
        "quinta-amate-03",
        "quinta-amate-04",
        "quinta-amate-05",
        "quinta-amate-06",
        "quinta-amate-07",
        "quinta-amate-08",
        "quinta-amate-09",
        "quinta-amate-10",
        "quinta-amate-11",
        "quinta-amate-12",
        "quinta-amate-13",
        "quinta-amate-14"
      ]
    },
    {
      "id": "casa-colibri",
      "nombre": "Casa Colibrí",
      "destino": "Malinalco",
      "etiqueta": "Grupos grandes",
      "resumen": "Para grupos grandes: 6 habitaciones con baño completo, jardines con árboles frutales, juegos infantiles y terraza panorámica.",
      "personas": [
        15,
        21
      ],
      "recamaras": 6,
      "banos": 6,
      "camas": "15 camas",
      "amenidades": [
        "Alberca con cubierta térmica 26–28 °C (5 m de diámetro)",
        "Terraza panorámica",
        "Juegos infantiles",
        "Jardines con árboles frutales",
        "Asador",
        "Estacionamiento"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-colibri-01",
        "casa-colibri-02",
        "casa-colibri-03",
        "casa-colibri-04",
        "casa-colibri-05",
        "casa-colibri-06",
        "casa-colibri-07",
        "casa-colibri-08",
        "casa-colibri-09",
        "casa-colibri-10",
        "casa-colibri-11",
        "casa-colibri-12",
        "casa-colibri-13",
        "casa-colibri-14"
      ]
    },
    {
      "id": "casa-bachi",
      "nombre": "Casa Bachi",
      "destino": "Malinalco",
      "etiqueta": "Familiar",
      "resumen": "Casa familiar en zona cálida con vistas panorámicas, jardín amplio y alberca climatizada. Pensada para descansar.",
      "personas": [
        7,
        10
      ],
      "recamaras": 3,
      "banos": 3,
      "camas": null,
      "amenidades": [
        "Alberca climatizada",
        "Vistas panorámicas",
        "Jardín",
        "Asador",
        "Zona cálida"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [
        "No se permiten fiestas"
      ],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-bachi-01",
        "casa-bachi-02",
        "casa-bachi-03",
        "casa-bachi-04",
        "casa-bachi-05",
        "casa-bachi-06",
        "casa-bachi-07",
        "casa-bachi-08",
        "casa-bachi-09",
        "casa-bachi-10"
      ]
    },
    {
      "id": "los-angeles",
      "nombre": "Casa Los Ángeles",
      "destino": "Malinalco",
      "etiqueta": "Nueva",
      "resumen": "Casa nueva con vista a los cerros de Malinalco, jardín y alberca, a 8 minutos del centro.",
      "personas": [
        8,
        12
      ],
      "recamaras": 3,
      "banos": null,
      "camas": "6 camas matrimoniales",
      "amenidades": [
        "Alberca 26–27 °C",
        "Jardín",
        "Asador",
        "Estacionamiento"
      ],
      "centro": {
        "min": 8,
        "texto": "A 8 minutos del centro"
      },
      "angulo": 35,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "los-angeles-01",
        "los-angeles-02",
        "los-angeles-03",
        "los-angeles-04",
        "los-angeles-05",
        "los-angeles-06",
        "los-angeles-07",
        "los-angeles-08",
        "los-angeles-09",
        "los-angeles-10",
        "los-angeles-11",
        "los-angeles-12",
        "los-angeles-13",
        "los-angeles-14"
      ]
    },
    {
      "id": "casa-cielo",
      "nombre": "Casa Cielo",
      "destino": "Malinalco",
      "etiqueta": "Rústico tradicional",
      "resumen": "Rústico tradicional de Malinalco a 5 cuadras del centro: llegas caminando en 8 minutos. Incluye ayudante doméstico.",
      "personas": [
        10,
        12
      ],
      "recamaras": 5,
      "banos": 5,
      "camas": null,
      "amenidades": [
        "Alberca",
        "Jardín",
        "Asador",
        "Cocina",
        "Sala-comedor",
        "Estacionamiento para 10 autos",
        "Ayudante doméstico"
      ],
      "centro": {
        "min": 4,
        "texto": "A 5 cuadras del centro (8 min caminando)"
      },
      "angulo": 12,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-cielo-01",
        "casa-cielo-02",
        "casa-cielo-03",
        "casa-cielo-04",
        "casa-cielo-05",
        "casa-cielo-06",
        "casa-cielo-07",
        "casa-cielo-08",
        "casa-cielo-09",
        "casa-cielo-10",
        "casa-cielo-11",
        "casa-cielo-12",
        "casa-cielo-13",
        "casa-cielo-14"
      ]
    },
    {
      "id": "casa-centro",
      "nombre": "Casa Centro",
      "destino": "Malinalco",
      "etiqueta": "A 1 cuadra del centro",
      "resumen": "Casa familiar a una cuadra del centro, con alberca, jardín, terraza con vista a los cerros y mesa de billar.",
      "personas": [
        5,
        10
      ],
      "recamaras": 2,
      "banos": 3,
      "camas": "4 matrimoniales y 1 sofá cama matrimonial",
      "amenidades": [
        "Alberca",
        "Mesa de billar",
        "Terraza",
        "Jardín",
        "Asador",
        "Wifi"
      ],
      "centro": {
        "min": 2,
        "texto": "A 1 cuadra del centro"
      },
      "angulo": 215,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-centro-01",
        "casa-centro-02",
        "casa-centro-03",
        "casa-centro-04",
        "casa-centro-05",
        "casa-centro-06",
        "casa-centro-07",
        "casa-centro-08",
        "casa-centro-09",
        "casa-centro-10",
        "casa-centro-11",
        "casa-centro-12"
      ]
    },
    {
      "id": "los-morales",
      "nombre": "Casa Los Morales",
      "destino": "Malinalco",
      "etiqueta": "Grupos grandes",
      "resumen": "La casa para grupos grandes: alberca climatizada, sauna, cancha de fútbol y voleibol, billar, bar y fogatero.",
      "personas": [
        15,
        25
      ],
      "recamaras": 5,
      "banos": 5,
      "camas": "13 camas",
      "amenidades": [
        "Alberca climatizada",
        "Sauna",
        "Cancha de fútbol y voleibol",
        "Billar",
        "Bar",
        "Fogatero",
        "Asador y parrillas"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "los-morales-01",
        "los-morales-02",
        "los-morales-03",
        "los-morales-04",
        "los-morales-05",
        "los-morales-06",
        "los-morales-07",
        "los-morales-08",
        "los-morales-09",
        "los-morales-10",
        "los-morales-11",
        "los-morales-12",
        "los-morales-13",
        "los-morales-14"
      ]
    },
    {
      "id": "casa-blanca",
      "nombre": "Casa Blanca",
      "destino": "Malinalco",
      "etiqueta": null,
      "resumen": "Casa luminosa con alberca, terraza techada y jardín, ideal para familias o grupos medianos.",
      "personas": [
        6,
        10
      ],
      "recamaras": 3,
      "banos": 3,
      "camas": null,
      "amenidades": [
        "Alberca",
        "Terraza",
        "Asador",
        "Estacionamiento para 2 autos"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-blanca-01",
        "casa-blanca-02",
        "casa-blanca-03",
        "casa-blanca-04",
        "casa-blanca-05",
        "casa-blanca-06",
        "casa-blanca-07",
        "casa-blanca-08",
        "casa-blanca-09",
        "casa-blanca-10",
        "casa-blanca-11",
        "casa-blanca-12",
        "casa-blanca-13",
        "casa-blanca-14"
      ]
    },
    {
      "id": "casa-rosa",
      "nombre": "Casa Rosa",
      "destino": "Malinalco",
      "etiqueta": "Zona centro",
      "resumen": "Casa en el centro de Malinalco con jardín y jacuzzi climatizado entre bugambilias. Para parejas o familias pequeñas.",
      "personas": [
        2,
        6
      ],
      "recamaras": 2,
      "banos": 1,
      "camas": "King, matrimonial y sofá cama",
      "amenidades": [
        "Jacuzzi climatizado",
        "Jardín",
        "En el centro"
      ],
      "centro": {
        "min": 0,
        "texto": "En el centro"
      },
      "angulo": 300,
      "corto": "Rosa",
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-rosa-01",
        "casa-rosa-02",
        "casa-rosa-03",
        "casa-rosa-04",
        "casa-rosa-05",
        "casa-rosa-06",
        "casa-rosa-07",
        "casa-rosa-08",
        "casa-rosa-09"
      ]
    },
    {
      "id": "depa-mali-2",
      "nombre": "Depa Céntrico Mali 2",
      "destino": "Malinalco",
      "etiqueta": "Zona centro",
      "corto": "Depa Mali 2",
      "resumen": "Departamento en el centro de Malinalco, con terraza y estacionamiento. Para recorrer el pueblo a pie.",
      "personas": [
        6,
        6
      ],
      "recamaras": 2,
      "banos": null,
      "camas": "2 matrimoniales y 1 sofá cama",
      "amenidades": [
        "Terraza",
        "Estacionamiento",
        "En el centro"
      ],
      "centro": {
        "min": 0,
        "texto": "En el centro"
      },
      "angulo": 120,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "depa-mali-2-01",
        "depa-mali-2-02",
        "depa-mali-2-03",
        "depa-mali-2-04",
        "depa-mali-2-05",
        "depa-mali-2-06",
        "depa-mali-2-07",
        "depa-mali-2-08",
        "depa-mali-2-09",
        "depa-mali-2-10"
      ]
    },
    {
      "id": "casa-arcadia",
      "nombre": "Casa Arcadia",
      "destino": "Acapulco",
      "etiqueta": "Acapulco",
      "resumen": "Casa familiar en zona exclusiva de Acapulco, con vista a la bahía, a 10 minutos de la Costera.",
      "personas": [
        10,
        12
      ],
      "recamaras": 4,
      "banos": null,
      "camas": "6 camas",
      "amenidades": [
        "Alberca con jacuzzi",
        "Vista a la bahía",
        "Asador",
        "Estacionamiento",
        "Zona exclusiva"
      ],
      "centro": null,
      "angulo": 0,
      "reglas": [],
      "maps": "",
      "ocupada": [],
      "fotos": [
        "casa-arcadia-01",
        "casa-arcadia-02",
        "casa-arcadia-03",
        "casa-arcadia-04",
        "casa-arcadia-05",
        "casa-arcadia-06",
        "casa-arcadia-07",
        "casa-arcadia-08",
        "casa-arcadia-09",
        "casa-arcadia-10",
        "casa-arcadia-11"
      ]
    }
  ]
};
