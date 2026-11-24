// Genera lealtad-api/mascaras.js: máscaras alfa (96×96) de los iconos de motoroka/lealtad/a/iconos.js.
// Uso: node lealtad-api/generar-mascaras.cjs
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), zlib = require("zlib");
const RAIZ = path.join(__dirname, ".."), L = 96;
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent("<html><body></body></html>");
  await p.addScriptTag({ path: path.join(RAIZ, "motoroka/lealtad/a/iconos.js") });
  const datos = await p.evaluate(async (L) => {
    const out = {};
    for (const [id, ic] of Object.entries(window.MR_ICONOS)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${L}" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`;
      const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
      const c = document.createElement("canvas"); c.width = c.height = L; const x = c.getContext("2d"); x.drawImage(img, 0, 0, L, L);
      const d = x.getImageData(0, 0, L, L).data, a = []; for (let i = 3; i < d.length; i += 4) a.push(d[i]); out[id] = a;
    }
    return out;
  }, L);
  await b.close();
  let js = `// Generado por generar-mascaras.cjs desde motoroka/lealtad/a/iconos.js. No editar a mano.\nexport const LADO = ${L};\nexport const MASCARAS = {\n`;
  for (const [id, a] of Object.entries(datos)) js += `  ${id}: "${zlib.deflateSync(Buffer.from(a), { level: 9 }).toString("base64")}",\n`;
  fs.writeFileSync(path.join(__dirname, "mascaras.js"), js + "};\n");
  console.log("máscaras:", Object.keys(datos).join(", "), fs.statSync(path.join(__dirname, "mascaras.js")).size, "bytes");
})();
