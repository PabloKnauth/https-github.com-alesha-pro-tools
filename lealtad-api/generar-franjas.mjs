// Genera las franjas de sellos estáticas (Apple strip@2x 750×288 y Google 1032×336) en motoroka/lealtad/franjas/.
// Uso: node lealtad-api/generar-mascaras.cjs && node lealtad-api/generar-franjas.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { franja } from "./franja.js";
import { TEMAS, SELLOS } from "./temas.js";
import { SELLOS_META } from "./nucleo.js";
const dir = new URL("../motoroka/lealtad/franjas/", import.meta.url);
mkdirSync(dir, { recursive: true });
let n = 0, bytes = 0;
for (const tema of Object.keys(TEMAS)) for (const sello of SELLOS) for (let s = 0; s <= SELLOS_META; s++) {
  for (const [pre, ancho, alto] of [["a", 750, 288], ["g", 1032, 336]]) {
    const png = await franja({ ancho, alto, tema, sello, sellos: s, meta: SELLOS_META });
    writeFileSync(new URL(`${pre}-${tema}-${sello}-${s}.png`, dir), png); n++; bytes += png.length;
  }
}
console.log(n, "franjas,", Math.round(bytes / 1024), "KB");
// Reduce el peso (paleta de 96 colores, sin tramado): ~1.6 MB en total en vez de ~5 MB.
import { execFileSync } from "node:child_process";
execFileSync("python3", ["-c", `import glob\nfrom PIL import Image\nfor f in glob.glob('${new URL(".", dir).pathname}franjas/*.png'):\n    Image.open(f).convert('RGB').quantize(colors=96,method=Image.MEDIANCUT,dither=Image.Dither.NONE).save(f,optimize=True)`]);
