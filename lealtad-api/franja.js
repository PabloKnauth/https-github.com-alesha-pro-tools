// Franja de sellos en PNG (para Apple Wallet strip@2x y la imagen principal de Google Wallet).
// Se dibuja en el servidor: fondo del tema, 4 sellos con el icono elegido y la casilla del servicio gratis.
import { MASCARAS, LADO } from "./mascaras.js";
import { TEMAS, rgb } from "./temas.js";

const inflar = async (b64) => {
  const s = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
};
const cache = {};
const mascara = async (id) => (cache[id] ??= await inflar(MASCARAS[id] || MASCARAS.moto));

const TABLA = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = TABLA[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function bloque(tipo, datos) {
  const out = new Uint8Array(12 + datos.length), v = new DataView(out.buffer);
  v.setUint32(0, datos.length); out.set(new TextEncoder().encode(tipo), 4); out.set(datos, 8);
  v.setUint32(8 + datos.length, crc(out.subarray(4, 8 + datos.length)));
  return out;
}
async function png(ancho, alto, rgbBuf) {
  const filas = new Uint8Array(alto * (1 + ancho * 3));
  for (let y = 0; y < alto; y++) filas.set(rgbBuf.subarray(y * ancho * 3, (y + 1) * ancho * 3), y * (1 + ancho * 3) + 1);
  const comp = new Uint8Array(await new Response(new Blob([filas]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer);
  v.setUint32(0, ancho); v.setUint32(4, alto); ihdr[8] = 8; ihdr[9] = 2;
  const partes = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), bloque("IHDR", ihdr), bloque("IDAT", comp), bloque("IEND", new Uint8Array())];
  const out = new Uint8Array(partes.reduce((s, p) => s + p.length, 0)); let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

// sellos: 0..meta; listo: tiene el servicio gratis disponible.
export async function franja({ ancho = 750, alto = 288, tema = "noche", sello = "moto", sellos = 0, meta = 4 }) {
  const T = TEMAS[tema] || TEMAS.noche, buf = new Uint8Array(ancho * alto * 3);
  const [f1, f2] = [rgb(T.fondo2), rgb(T.fondo)];
  for (let y = 0; y < alto; y++) { // degradado vertical del tema: una fila y se replica
    const k = y / (alto - 1), o = y * ancho * 3;
    for (let i = 0; i < 3; i++) buf[o + i] = Math.round(f1[i] + (f2[i] - f1[i]) * k);
    let n = 3; while (n < ancho * 3) { buf.copyWithin(o + n, o, o + Math.min(n, ancho * 3 - n)); n *= 2; }
  }
  const mezclar = (x, y, col, a) => {
    if (a <= 0 || x < 0 || y < 0 || x >= ancho || y >= alto) return;
    const i = (y * ancho + x) * 3;
    for (let k = 0; k < 3; k++) buf[i + k] = Math.round(buf[i + k] + (col[k] - buf[i + k]) * a);
  };
  const casillas = meta + 1, margen = ancho * 0.035, paso = (ancho - 2 * margen) / casillas, r = Math.min(paso * 0.4, alto * 0.3), cy = alto / 2;
  const mIcono = await mascara(sello), mRegalo = await mascara("regalo"), lado = Math.round(r * 1.12);
  for (let i = 0; i < casillas; i++) {
    const cx = margen + paso * (i + 0.5), esRegalo = i === meta, lleno = esRegalo ? sellos >= meta : i < sellos;
    const relleno = rgb(esRegalo ? T.regalo : lleno ? T.sello : T.vacio);
    for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) {
      for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (lleno) mezclar(x, y, relleno, Math.min(1, Math.max(0, r - d + 0.5)));
        else { // anillo: punteado para la casilla de regalo
          const grosor = Math.max(2, r * 0.06), en = Math.min(1, Math.max(0, grosor / 2 - Math.abs(d - r + grosor / 2) + 0.5));
          const punteo = esRegalo ? (Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * 28) % 2 === 0 ? 1 : 0) : 1;
          mezclar(x, y, relleno, en * punteo * (esRegalo ? 0.85 : T.vacioAlfa * 2.2));
          if (!esRegalo && d < r) mezclar(x, y, relleno, T.vacioAlfa * 0.25);
        }
      }
    }
    const m = esRegalo ? mRegalo : mIcono;
    const colIcono = rgb(lleno ? (esRegalo ? T.iconoRegalo : T.iconoSello) : esRegalo ? T.regalo : T.vacio);
    const alfaIcono = lleno ? 1 : esRegalo ? 0.9 : T.vacioAlfa * 1.6;
    const x0 = Math.round(cx - lado / 2), y0 = Math.round(cy - lado / 2), esc = LADO / lado;
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) { // muestreo bilineal de la máscara
      const sx = (x + 0.5) * esc - 0.5, sy = (y + 0.5) * esc - 0.5, ix = Math.max(0, Math.floor(sx)), iy = Math.max(0, Math.floor(sy));
      const fx = sx - ix, fy = sy - iy, ix2 = Math.min(LADO - 1, ix + 1), iy2 = Math.min(LADO - 1, iy + 1);
      const v = (m[iy * LADO + ix] * (1 - fx) + m[iy * LADO + ix2] * fx) * (1 - fy) + (m[iy2 * LADO + ix] * (1 - fx) + m[iy2 * LADO + ix2] * fx) * fy;
      mezclar(x0 + x, y0 + y, colIcono, (v / 255) * alfaIcono);
    }
  }
  return png(ancho, alto, buf);
}
