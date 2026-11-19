// POST /api/crm — base de datos compartida del CRM de ROJU Consulting.
// Solo Pablo Knauth y Kevin Juárez, cada uno con su contraseña (variables de entorno en Netlify):
//   CRM_CLAVE_PABLO, CRM_CLAVE_KEVIN (mínimo 10 caracteres) y, opcional, CRM_TOKEN_SECRET.
// Datos en Netlify Blobs (almacén "roju-crm"): un JSON por tabla, con escritura condicional
// para que dos personas guardando al mismo tiempo no se borren cambios.
import {
  ESQUEMA, ErrorDatos, json, leer, eliminarConCascada, usuarioDelToken, txt, RESPONSABLES, USUARIOS,
  clave, lista, limitar, iguales, crearToken, crearFila, actualizarFila,
} from "../lib/nucleo.mjs";

export default async (req, context) => {
  // GET /api/crm: diagnóstico sin datos sensibles (no muestra contraseñas, solo si están listas).
  if (req.method === "GET") {
    const estado = (u) => { const n = clave(u).length; return n === 0 ? "falta" : n < 10 ? "muy corta (mínimo 10 caracteres)" : "lista"; };
    // Nombres (nunca valores) de las variables parecidas, con caracteres ocultos visibles, para detectar errores al escribirlas.
    const parecidas = Object.keys(process.env).filter((k) => /clave|crm|pablo|kevin/i.test(k)).map((k) => JSON.stringify(k).slice(1, -1));
    const crudo = (u) => process.env[USUARIOS[u]];
    const detalle = (u) => (crudo(u) === undefined ? "no existe con ese nombre exacto" : crudo(u).trim() === "" ? "existe pero está vacía o solo tiene espacios" : estado(u));
    return json({ servidor: "activo", CRM_CLAVE_PABLO: detalle("Pablo Knauth"), CRM_CLAVE_KEVIN: detalle("Kevin Juárez"), ASISTENTE_IA: process.env.ANTHROPIC_API_KEY ? "lista" : "falta ANTHROPIC_API_KEY", variables_parecidas: parecidas });
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ error: "Datos inválidos" }, 400); }

  if (d.accion === "entrar") {
    if (RESPONSABLES.includes(d.usuario) && !lista(d.usuario))
      return json({ error: `La contraseña de ${d.usuario} no está lista en Netlify: ${USUARIOS[d.usuario]} debe tener 10 caracteres o más. Corrígela y vuelve a desplegar.` }, 503);
    if (!(await limitar(context?.ip))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
    if (!RESPONSABLES.includes(d.usuario) || !iguales(String(d.clave ?? "").trim(), clave(d.usuario))) {
      await new Promise((ok) => setTimeout(ok, 600));
      return json({ error: "Contraseña incorrecta para " + (RESPONSABLES.includes(d.usuario) ? d.usuario : "ese usuario") + ". Cada uno tiene su propia contraseña." }, 401);
    }
    return json(crearToken(d.usuario));
  }

  const usuario = usuarioDelToken(req);
  if (!usuario) return json({ error: "Tu sesión terminó. Vuelve a entrar." }, 401);
  const tabla = d.tabla;
  if (!ESQUEMA[tabla]) return json({ error: "Tabla desconocida" }, 400);

  try {
    if (d.accion === "listar") return json({ filas: (await leer(tabla)).filas });
    if (d.accion === "crear") return json({ fila: await crearFila(tabla, d.valores, usuario) });
    if (d.accion === "actualizar") return json({ fila: await actualizarFila(tabla, txt(d.id, 60), d.valores, usuario) });
    if (d.accion === "eliminar") {
      await eliminarConCascada(tabla, txt(d.id, 60));
      return json({ ok: true });
    }
    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    if (e instanceof ErrorDatos) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: e.message || "Error del servidor" }, 500);
  }
};

export const config = { path: "/api/crm" };
