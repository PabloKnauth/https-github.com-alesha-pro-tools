// GET /api/publico — datos que la página pública puede ver (sin datos personales ni reseñas de 1–2 ★).
import { leerTodo, datosPublicos, json } from "../lib/comun.mjs";

export default async () => {
  try {
    return json(datosPublicos(await leerTodo()), 200, { "cache-control": "public, max-age=60" });
  } catch (e) {
    return json({ error: "No se pudieron leer los datos" }, 500);
  }
};
export const config = { path: "/api/publico" };
