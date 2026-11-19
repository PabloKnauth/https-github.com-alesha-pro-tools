// /api/archivos — PDF adjuntos a tareas (Netlify Blobs). Solo con sesión de Pablo o Kevin.
//   POST: cuerpo = el PDF tal cual; encabezados x-tabla (tasks | collaborator_tasks), x-tarea (id), x-nombre.
//   GET  ?id=…: devuelve el PDF.
import { ErrorDatos, json, usuarioDelToken, guardarPdf, leerPdf, LIMITE_PDF, txt } from "../lib/nucleo.mjs";

export default async (req) => {
  const usuario = usuarioDelToken(req);
  if (!usuario) return json({ error: "Tu sesión terminó. Vuelve a entrar." }, 401);
  try {
    if (req.method === "POST") {
      const largo = Number(req.headers.get("content-length") || 0);
      if (largo > LIMITE_PDF) return json({ error: "El PDF pesa más de 5 MB" }, 413);
      const bytes = await req.arrayBuffer();
      const fila = await guardarPdf(
        {
          owner_table: txt(req.headers.get("x-tabla"), 40),
          owner_id: txt(req.headers.get("x-tarea"), 60),
          name: decodeURIComponent(req.headers.get("x-nombre") || "documento.pdf"),
          bytes,
        },
        usuario,
      );
      return json({ fila });
    }
    if (req.method === "GET") {
      const r = await leerPdf(txt(new URL(req.url).searchParams.get("id"), 60));
      if (!r) return json({ error: "El documento ya no existe" }, 404);
      return new Response(r.datos, {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(r.fila.name)}`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    return json({ error: "Método no permitido" }, 405);
  } catch (e) {
    if (e instanceof ErrorDatos) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: "No se pudo procesar el archivo" }, 500);
  }
};

export const config = { path: "/api/archivos" };
