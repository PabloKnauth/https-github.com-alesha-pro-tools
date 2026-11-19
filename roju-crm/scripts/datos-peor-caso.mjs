// Datos de prueba del peor caso (break-ui) y de volumen. Uso SOLO en un servidor local de pruebas:
//   node scripts/datos-peor-caso.mjs http://localhost:8905 peor|volumen
// Inicia sesión como Pablo con la clave de pruebas local; nunca lo ejecutes contra el sitio real.
const B = process.argv[2], modo = process.argv[3];
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(B || "")) { console.error("Solo contra un servidor local."); process.exit(1); }
const ymd = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const iso = (n, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d.toISOString(); };
const r0 = await fetch(B + "/api/crm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "entrar", usuario: "Pablo Knauth", clave: "clave-pablo-123" }) });
const { token } = await r0.json();
const api = async (c) => (await fetch(B + "/api/crm", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(c) })).json();
const crear = async (tabla, valores) => { const r = await api({ accion: "crear", tabla, valores }); if (r.error) throw new Error(tabla + ": " + r.error); return r.fila; };
const S = ["Estrategia", "Identidad", "Redes sociales", "Contenido", "Web", "Pauta"], R = ["Pablo Knauth", "Kevin Juárez"];
const E = ["Nuevo contacto", "Contactado", "Diagnóstico agendado", "Propuesta enviada", "Negociación", "Cliente ganado", "Perdido"];
if (modo === "peor") {
  const notas = "Reunión inicial con la dueña y su hijo. Quieren reposicionar la marca antes de la temporada navideña.\n\nPuntos clave:\n- Presupuesto aprobado solo para el primer trimestre\n- El logotipo actual lo hizo un sobrino y no quieren ofenderlo\n- Piden propuesta con 3 opciones de precio\n\n" + "Seguimiento: llamar después de las 5 pm porque en la mañana atienden el mostrador. ".repeat(12);
  const c = [];
  c.push(await crear("clients", { name: "Ma. Guadalupe Hernández de la Fuente Villaseñor", company: "Comercializadora y Distribuidora de Productos Agroindustriales del Bajío S.A. de C.V.", contact: "Lic. José Francisco Martínez Ruiz (Director Comercial)", email: "contacto.comercial@distribuidoraagroindustrialdelbajio.com.mx", phone: "+52 1 (477) 123 4567 ext. 204", service: "Identidad", responsable: "Kevin Juárez", stage: "Propuesta enviada", next_follow_up: ymd(-12), notes: notas }));
  c.push(await crear("clients", { name: "Jo", service: "Web", responsable: "Pablo Knauth", stage: "Propuesta enviada" }));
  c.push(await crear("clients", { name: "🌮 Tacos El Güero", company: "Taquería", service: "Redes sociales", responsable: "Pablo Knauth", stage: "Propuesta enviada", next_follow_up: ymd(0), next_appointment: iso(0, 9) }));
  c.push(await crear("clients", { name: "Clínica de Especialidades Odontológicas y Ortodoncia Integral Sonrisas Perfectas", service: "Pauta", responsable: "Kevin Juárez", stage: "Negociación", next_appointment: iso(1, 10) }));
  for (let i = 0; i < 12; i++) c.push(await crear("clients", { name: ["Abarrotes Doña Mary", "Ferretería La Tuerca Feliz", "Estética Unisex Glamour & Style", "Gimnasio PowerZone Fitness Center", "Despacho Contable Ramírez y Asociados"][i % 5] + (i > 4 ? " " + (i + 1) : ""), service: S[i % 6], responsable: R[i % 2], stage: "Nuevo contacto", next_follow_up: ymd(i - 6) }));
  const t = [["Rediseñar el logotipo, el manual de identidad completo y las aplicaciones en papelería, uniformes, vehículos de reparto y señalética de las tres sucursales", -40], ["Llamar", 0], ["Enviar propuesta 🚀", 1], ["Revisar comentarios", null]];
  for (const [title, d] of t) await crear("tasks", { title, client_id: c[0].id, encargado: "Kevin Juárez", due_date: d == null ? null : ymd(d), notes: d === -40 ? notas : "" });
  for (let i = 0; i < 25; i++) await crear("tasks", { title: "Publicación semana " + (i + 1), client_id: c[2].id, encargado: R[i % 2], due_date: ymd(i - 5), status: ["Pendiente", "En proceso", "Terminada"][i % 3] });
  const k = await crear("collaborators", { name: "Aleksandra Wiśniewska-Kowalczyk", role: "Directora de fotografía, retoque y postproducción de video para redes", email: "aleksandra.wisniewska.kowalczyk@estudiocreativonorte.com.mx", phone: "+52 55 1234 5678" });
  await crear("collaborators", { name: "Jo", role: "" });
  for (let i = 0; i < 5; i++) await crear("collaborator_appointments", { collaborator_id: k.id, title: i ? "Revisión " + i : "Sesión de fotos de producto para catálogo de temporada otoño-invierno con modelos", starts_at: iso(0, 9 + i), duration_minutes: 60, meet_link: i === 0 ? "https://meet.google.com/abc-defg-hij?authuser=aleksandra.wisniewska.kowalczyk%40estudiocreativonorte.com.mx" : "" });
  await crear("suppliers", { name: "Impresiones Digitales y Gran Formato del Centro de México", contact_person: "Ing. Bartolomé Fitzgerald Montes de Oca", email: "bartolome.fitzgerald@impresionesgranformatocentro.com.mx", phone: "800 123 4567", product_service: "Impresión de lonas, vinilos, viniles microperforados, tarjetas de presentación, volantes, carpetas corporativas, rotulación vehicular, displays, banners roll-up y señalización interior y exterior para sucursales" });
  await crear("suppliers", { name: "X" });
} else {
  const cl = [];
  for (let i = 0; i < 300; i++) cl.push(await crear("clients", { name: "Cliente " + (i + 1), company: "Empresa " + (i + 1), service: S[i % 6], responsable: R[i % 2], stage: E[i % 7], next_follow_up: ymd((i % 30) - 15) }));
  for (let i = 0; i < 600; i++) await crear("tasks", { title: "Tarea " + (i + 1), client_id: cl[i % 300].id, encargado: R[i % 2], due_date: ymd((i % 40) - 20), status: ["Pendiente", "En proceso", "Terminada"][i % 3] });
}
console.log(modo, "sembrado");
