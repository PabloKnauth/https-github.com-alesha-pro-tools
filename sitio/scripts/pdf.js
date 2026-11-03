// Genera los PDF de cada recurso con Chromium (Playwright).
// Uso: node scripts/pdf.js <carpeta-sitio> <slug> [<slug>…]
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const [raiz, ...slugs] = process.argv.slice(2);
  const opciones = {};
  const local = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
  if (fs.existsSync(local)) opciones.executablePath = local;
  const navegador = await chromium.launch(opciones);
  const pagina = await navegador.newPage();
  await pagina.emulateMedia({ media: "print", colorScheme: "light" });
  const paginas = {};
  for (const slug of slugs) {
    const url = "file://" + path.join(raiz, "recursos", slug + ".html") + "?imprimir=1";
    await pagina.goto(url, { waitUntil: "load" });
    await pagina.evaluate(() => document.fonts.ready);
    const destino = path.join(raiz, "recursos", "pdf", slug + ".pdf");
    await pagina.pdf({ path: destino, format: "A4", printBackground: true, preferCSSPageSize: true });
    const bytes = fs.readFileSync(destino, "latin1");
    paginas[slug] = (bytes.match(/\/Type\s*\/Page[^s]/g) || []).length;
  }
  await navegador.close();
  console.log(JSON.stringify(paginas));
})().catch((e) => { console.error(e); process.exit(1); });
