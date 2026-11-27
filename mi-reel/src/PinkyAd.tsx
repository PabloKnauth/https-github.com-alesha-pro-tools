import React, { useEffect, useRef, useState } from "react";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { geoOrthographic, geoPath, GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-50m.json";

// Vestidos Pinky — plantilla guiada por datos (ver CLAUDE.md, sección Vestidos Pinky).
// Cada widget está medido sobre los anuncios de referencia del cliente (ad_1, ad_2, ad_4):
// subtítulos blancos a la altura del pecho, barras amarillas que se barren, listas apiladas en barras del
// mismo ancho, palabra fuerte en amarillo con brillo, píldora gris translúcida con precio verde neón y
// flecha, recuadro de vidrio con fajo de billetes y flecha en zigzag, URL tecleándose en barra amarilla,
// globo satelital que se acerca a México con la bandera, catálogo de la tienda en página curva y PiP circular.
export const Y = "#f7e01f";
const YG = "#ffe81a";
const NEON = "#3dff3d";
const FONT = "Montserrat, sans-serif";

export type Word = [number, number, string, number?];
export type Overlay =
  | { type: "stack"; items: [number, string][]; until: number }
  | { type: "price"; at: number; until: number; value: string }
  | { type: "money"; at: number; until: number }
  | { type: "url"; at: number; until: number; text: string }
  | { type: "globe"; at: number; until: number }
  | { type: "catalog"; at: number; until: number; image: string }
  | { type: "icon"; at: number; until: number; src: string; x?: number; y?: number }
  | { type: "count"; at: number; until: number; n: number; total: number; image: string; label: string }
  | { type: "countgrid"; at: number; until: number; images: string[] };
export type PipTrack = [number, number, number, number][]; // [t, cx, cy, faceW] in clip pixels (720x1280)
export type Broll = { src: string; at: number; until: number; from?: number; pip?: PipTrack };
export type PinkyProps = {
  clip: string;
  duration: number;
  words: Word[];
  cuts?: number[];            // jump cuts: zoom change
  flashes?: number[];         // scene changes / big transitions: white dip
  punches?: [number, number][];
  highlight?: string[];       // a page with one of these words goes on a yellow bar
  emph?: string[];            // these words go big, yellow, glowing
  overlays?: Overlay[];
  broll?: Broll[];
  captionY?: number;          // preferred vertical centre of the caption line (chest)
  faces?: [number, number, number, number][]; // [t, cx, cy, w] face box of the presenter in clip pixels (720x1280)
};

export const calcPinky: CalculateMetadataFunction<PinkyProps> = ({ props }) => ({
  durationInFrames: Math.ceil(props.duration * 30),
});

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};
const sp = (frame: number, fps: number, at: number, damping = 12) =>
  spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 170, mass: 0.6 } });
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const bare = (w: string) => w.toLowerCase().replace(/[^\wáéíóúñü%$]/g, "");
const fmt = (w: string) => w.replace(/^2000([.,]?)$/, "$$2,000$1").replace(/^1000([.,]?)$/, "$$1,000$1").replace(/^(\d+)\s?%$/, "$1%");
const life = (t: number, at: number, until: number) => interpolate(t, [until - 0.12, until], [1, 0], clamp) * (t >= at ? 1 : 0);
const wipe = (t: number, at: number, d = 0.2) => interpolate(t, [at, at + d], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const SHADOW = "0 3px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.5)";
const txt = (size: number, color = "white"): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: 900, fontSize: size, color, textTransform: "uppercase", letterSpacing: -size * 0.045,
  lineHeight: 1.02, whiteSpace: "nowrap",
});

// ---------- cámara ----------
const zoomAt = (p: PinkyProps, t: number) => {
  const keys = [...(p.punches ?? []), ...(p.cuts ?? []).map((c, i) => [c, i % 2 ? 0.0 : 0.07] as [number, number])].sort((a, b) => a[0] - b[0]);
  let z = 1 + 0.02 * Math.sin(t * 0.35);
  let cur = 0, last = -10;
  for (const [tp, a] of keys) if (t >= tp) { cur = a; last = tp; }
  const prev = keys.filter(([tp]) => tp < last).slice(-1)[0]?.[1] ?? 0;
  z += prev + (cur - prev) * Easing.out(Easing.cubic)(Math.min(1, (t - last) / 0.16));
  return z;
};
const Camera: React.FC<{ p: PinkyProps; children: React.ReactNode }> = ({ p, children }) => {
  const { t } = useT();
  const z = zoomAt(p, t);
  return <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 40%" }}>{children}</AbsoluteFill>;
};

// destello blanco suave en los cambios de escena (como el "dip to white" de las referencias)
const Flash: React.FC<{ at: number[] }> = ({ at }) => {
  const { t } = useT();
  let o = 0;
  for (const c of at) {
    const d = t - c;
    if (d > -0.08 && d < 0.3) o = Math.max(o, d < 0 ? 0.65 * (1 + d / 0.08) : 0.65 * (1 - d / 0.3));
  }
  return o > 0 ? <AbsoluteFill style={{ background: "white", opacity: o }} /> : null;
};

// palabra que se revela de izquierda a derecha
const Reveal: React.FC<{ t: number; at: number; style: React.CSSProperties; children: React.ReactNode }> = ({ t, at, style, children }) => {
  const r = wipe(t, at, 0.12);
  if (r <= 0) return <span style={{ ...style, opacity: 0 }}>{children}</span>;
  // recorte solo mientras se revela, con margen para la última letra y la sombra
  return <span style={{ ...style, paddingRight: 8, marginRight: -8, clipPath: r < 1 ? `inset(-40% ${(1 - r) * 108 - 8}% -40% -10%)` : undefined, opacity: Math.min(1, r * 2) }}>{children}</span>;
};

// ---------- subtítulos ----------
const pageCache = new WeakMap<Word[], [number, number][]>();
const pagesOf = (W: Word[]) => {
  if (pageCache.has(W)) return pageCache.get(W)!;
  const pages: [number, number][] = [];
  let s0 = 0;
  W.forEach(([, e, w], i) => {
    const nx = W[i + 1];
    if (/[.,:?¿!]$/.test(w) || !nx || nx[0] - e > 0.3 || i - s0 === 2) { pages.push([s0, i + 1]); s0 = i + 1; }
  });
  pageCache.set(W, pages);
  return pages;
};
// página de subtítulos activa en t -> [primera palabra, última+1, inicio, fin]
const pageAt = (W: Word[], t: number): [number, number, number, number] | null => {
  const pages = pagesOf(W);
  for (let i = 0; i < pages.length; i++) {
    const [a, b] = pages[i];
    const t0 = W[a][0] - 0.02, t1 = Math.min(W[b - 1][1] + 0.25, i + 1 < pages.length ? W[pages[i + 1][0]][0] - 0.02 : 999);
    if (t >= t0 && t < t1) return [a, b, t0, t1];
  }
  return null;
};
const isEmPage = (p: PinkyProps, a: number, b: number) => {
  const em = new Set((p.emph ?? []).map(bare));
  return p.words.slice(a, b).some(([, , w]) => em.has(bare(w)));
};

const Captions: React.FC<{ p: PinkyProps; y: number }> = ({ p, y }) => {
  const { t, frame } = useT();
  const W = p.words;
  const pg = pageAt(W, t);
  if (!pg) return null;
  const [a, b] = pg;
  const ws = W.slice(a, b);
  const hl = new Set((p.highlight ?? []).map(bare));
  const em = new Set((p.emph ?? []).map(bare));
  const isEm = ws.some(([, , w]) => em.has(bare(w)));
  const isHl = !isEm && ws.some(([, , w]) => hl.has(bare(w)));
  const bar = wipe(t, W[a][0], 0.22);
  if (isEm) {
    // línea pequeña blanca + palabra fuerte grande amarilla con brillo (debajo), como "PARA / REVENDER"
    // orden de las referencias: palabras antes (arriba, chicas) / palabra fuerte (grande) / palabras después (abajo, chicas)
    const iBig = ws.findIndex(([, , w]) => em.has(bare(w)));
    const iLast = ws.length - 1 - [...ws].reverse().findIndex(([, , w]) => em.has(bare(w)));
    const small = ws.slice(0, iBig);
    const big = ws.slice(iBig, iLast + 1);
    const after = ws.slice(iLast + 1);
    return (
      <div style={{ position: "absolute", top: y - 60, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 14, minHeight: 50 }}>
          {small.map(([s, , w], k) => <Reveal key={k} t={t} at={s} style={{ ...txt(50), textShadow: SHADOW }}>{fmt(w)}</Reveal>)}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: -4 }}>
          {big.map(([s, , w], k) => {
            const q = sp(frame, 30, s, 10);
            return <Reveal key={k} t={t} at={s} style={{ ...txt(big.length > 1 ? 118 : 150, YG), display: "inline-block", transform: `scale(${0.85 + 0.15 * q})`,
              textShadow: "0 0 14px rgba(255,232,26,0.95), 0 0 34px rgba(255,214,0,0.6), 0 4px 8px rgba(0,0,0,0.5)" }}>{fmt(w)}</Reveal>;
          })}
        </div>
        {after.length > 0 && (
          <div style={{ display: "flex", gap: 14, marginTop: -6 }}>
            {after.map(([s, , w], k) => <Reveal key={k} t={t} at={s} style={{ ...txt(50), textShadow: SHADOW }}>{fmt(w)}</Reveal>)}
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", top: y - 38, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", padding: isHl ? "4px 22px 2px" : 0 }}>
        {isHl && <div style={{ position: "absolute", inset: 0, background: Y, clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)`, opacity: Math.min(1, bar * 1.6) }} />}
        <div style={{ position: "relative", display: "flex", gap: 16 }}>
          {ws.map(([s, , w], k) => <Reveal key={k} t={t} at={s} style={{ ...txt(62), textShadow: SHADOW }}>{fmt(w)}</Reveal>)}
        </div>
      </div>
    </div>
  );
};

// ---------- lista apilada en barras amarillas del mismo ancho (ocupa el lugar del subtítulo) ----------
const Stack: React.FC<{ o: Extract<Overlay, { type: "stack" }>; y: number }> = ({ o, y }) => {
  const { t } = useT();
  const alive = life(t, o.items[0][0], o.until);
  if (alive <= 0) return null;
  const longest = Math.max(...o.items.map(([, l]) => l.length));
  const fs = longest > 16 ? 54 : 62;
  const w = Math.min(980, Math.max(440, longest * fs * 0.72 + 70));
  return (
    <div style={{ position: "absolute", top: y - 44, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: alive }}>
      {o.items.map(([at, label], k) => {
        const r = wipe(t, at, 0.22);
        if (r <= 0) return <div key={k} style={{ height: fs + 18 }} />;
        return (
          <div key={k} style={{ position: "relative", width: w, height: fs + 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: Y, clipPath: `inset(0 ${(1 - r) * 100}% 0 0)`, opacity: Math.min(1, r * 1.5) }} />
            <Reveal t={t} at={at + 0.04} style={{ ...txt(fs), position: "relative", textShadow: SHADOW }}>{label}</Reveal>
          </div>
        );
      })}
    </div>
  );
};

// ---------- precio: píldora gris translúcida + número verde neón + flecha que sube ----------
const Price: React.FC<{ o: Extract<Overlay, { type: "price" }>; y: number }> = ({ o, y }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 11);
  const draw = interpolate(t, [o.at + 0.05, o.at + 0.45], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7);
  const W = 590, H = 150, top = y + 52;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: H, opacity: a }}>
      <div style={{ position: "absolute", left: (1080 - W) / 2, width: W, height: H, borderRadius: H / 2, background: "rgba(228,228,228,0.80)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)", transform: `scale(${0.7 + 0.3 * q})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ ...txt(112, "#d8ffd2"), letterSpacing: -3, textShadow: `0 0 6px ${NEON}, 0 0 18px ${NEON}, 0 0 36px rgba(61,255,61,${0.7 * flick})` }}>{o.value}</span>
      </div>
      <svg width="1080" height="420" viewBox="0 0 1080 420" style={{ position: "absolute", left: 0, top: 40, overflow: "visible" }}>
        <path d="M372 270 L404 170 L428 190 L478 70" stroke="#caffc4" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 6px ${NEON}) drop-shadow(0 0 14px ${NEON})` }} />
        <path d="M452 78 L480 66 L488 96" stroke="#caffc4" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0.97 ? 1 : 0}
          style={{ filter: `drop-shadow(0 0 6px ${NEON})` }} />
      </svg>
    </div>
  );
};

// ---------- dinero: recuadro de vidrio + fajo de billetes (imagen del cliente) + flecha en zigzag ----------
const Money: React.FC<{ o: Extract<Overlay, { type: "money" }>; y: number }> = ({ o, y }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 11);
  const draw = interpolate(t, [o.at + 0.15, o.at + 0.65], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const head = spring({ frame: frame - (o.at + 0.6) * fps, fps, config: { damping: 9, stiffness: 220, mass: 0.5 } });
  // recuadro de vidrio con los billetes a la izquierda; flecha de crecimiento a la derecha, sin encimarse
  const W = 470, H = 330, left = 110, top = y + 150;   // debajo de la palabra grande del subtítulo
  const x0 = left + W + 40, yb = top + H - 10, yt = top + 30;
  const pts: [number, number][] = [[x0, yb], [x0 + 80, yb - 105], [x0 + 140, yb - 60], [x0 + 300, yt + 18]];
  const [ex, ey] = pts[3], [px, py] = pts[2];
  const ang = Math.atan2(ey - py, ex - px), L = 58, Wd = 30;
  const tip = [ex + Math.cos(ang) * 26, ey + Math.sin(ang) * 26];
  const b1 = [tip[0] - Math.cos(ang) * L + Math.sin(ang) * Wd, tip[1] - Math.sin(ang) * L - Math.cos(ang) * Wd];
  const b2 = [tip[0] - Math.cos(ang) * L - Math.sin(ang) * Wd, tip[1] - Math.sin(ang) * L + Math.cos(ang) * Wd];
  const glow = `drop-shadow(0 0 6px ${NEON}) drop-shadow(0 0 16px ${NEON})`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ position: "absolute", left, top, width: W, height: H, borderRadius: 34, background: "rgba(255,255,255,0.20)", border: "3px solid rgba(255,255,255,0.6)",
        backdropFilter: "blur(5px)", boxShadow: "0 12px 30px rgba(0,0,0,0.3)", transform: `scale(${0.7 + 0.3 * q})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img src={staticFile("pinky/icons/money_bills.png")} style={{ width: 400, height: 400, objectFit: "contain", transform: `rotate(${-4 + 3 * Math.sin(t * 2)}deg)` }} />
      </div>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M${pts.map((p) => p.join(" ")).join(" L")}`} stroke="#caffc4" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: glow }} />
        {draw > 0.95 && <polygon points={`${tip[0]},${tip[1]} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]}`} fill="#caffc4" strokeLinejoin="round"
          style={{ filter: glow, transformOrigin: `${ex}px ${ey}px`, transform: `scale(${head})` }} />}
      </svg>
    </div>
  );
};

// ---------- URL que se teclea dentro de una barra amarilla ----------
const Url: React.FC<{ o: Extract<Overlay, { type: "url" }>; y: number }> = ({ o, y }) => {
  const { t } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const full = `https://${o.text}/`;
  const bar = wipe(t, o.at, 0.2);
  const n = Math.floor(interpolate(t, [o.at + 0.15, o.at + 1.2], [0, full.length], clamp));
  return (
    <div style={{ position: "absolute", top: y + 50, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ position: "relative", width: 880, height: 78, display: "flex", alignItems: "center", paddingLeft: 26 }}>
        <div style={{ position: "absolute", inset: 0, background: Y, clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)` }} />
        <span style={{ position: "relative", fontFamily: FONT, fontWeight: 800, fontSize: 44, letterSpacing: -1.5, color: "white", textShadow: SHADOW, whiteSpace: "nowrap" }}>
          {full.slice(0, n)}
        </span>
      </div>
    </div>
  );
};

// ---------- globo satelital que se acerca a México (textura Natural Earth II, bandera recortada a México) ----------
const LAND = feature(world as never, (world as { objects: { countries: unknown } }).objects.countries as never) as unknown as { features: { id: string }[] };
const MEX = LAND.features.find((f) => f.id === "484")! as unknown as GeoPermissibleObjects;
const TEX = { lon0: -170, lon1: -20, lat0: 90, lat1: -15 };
let texData: ImageData | null = null;
const useTexture = (src: string) => {
  const [ready, setReady] = useState(!!texData);
  const [handle] = useState(() => (texData ? null : delayRender("earth texture")));
  useEffect(() => {
    if (texData) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const g = c.getContext("2d")!; g.drawImage(img, 0, 0); texData = g.getImageData(0, 0, img.width, img.height);
      setReady(true); if (handle !== null) continueRender(handle);
    };
    img.src = src;
  }, [src, handle]);
  return ready;
};
const GW = 540, GH = 960;
const Globe: React.FC<{ o: Extract<Overlay, { type: "globe" }> }> = ({ o }) => {
  const { t } = useT();
  const ready = useTexture(staticFile("pinky/earth.jpg"));
  const ref = useRef<HTMLCanvasElement>(null);
  const a = life(t, o.at, o.until);
  const q = interpolate(t, [o.at, o.until], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const lon0 = -97 - 5 * q, lat0 = 36 - 12.5 * q, R = 430 + 560 * q * q;
  useEffect(() => {
    if (!ready || !ref.current || a <= 0 || !texData) return;
    const g = ref.current.getContext("2d")!;
    const out = g.createImageData(GW, GH);
    const d = out.data, src = texData.data, TW = texData.width, TH = texData.height;
    const p0 = (lat0 * Math.PI) / 180, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
    for (let y = 0; y < GH; y++) {
      const py = -(y - GH * 0.46) / R;
      for (let x = 0; x < GW; x++) {
        const px = (x - GW / 2) / R, rho = Math.sqrt(px * px + py * py), i = (y * GW + x) * 4;
        if (rho >= 1) { d[i] = 2; d[i + 1] = 4; d[i + 2] = 8; d[i + 3] = 255; continue; }
        const c = Math.asin(rho), sc = Math.sin(c), cc = Math.cos(c);
        const lat = rho === 0 ? lat0 : (Math.asin(cc * sp0 + (py * sc * cp0) / rho) * 180) / Math.PI;
        const lon = lon0 + (Math.atan2(px * sc, rho * cp0 * cc - py * sp0 * sc) * 180) / Math.PI;
        const u = Math.min(TW - 1, Math.max(0, Math.round(((lon - TEX.lon0) / (TEX.lon1 - TEX.lon0)) * TW)));
        const v = Math.min(TH - 1, Math.max(0, Math.round(((TEX.lat0 - lat) / (TEX.lat0 - TEX.lat1)) * TH)));
        const j = (v * TW + u) * 4, shade = 0.55 + 0.45 * cc; // limb darkening
        d[i] = src[j] * shade; d[i + 1] = src[j + 1] * shade; d[i + 2] = src[j + 2] * shade; d[i + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
  });
  if (a <= 0) return null;
  const proj = geoOrthographic().translate([GW / 2, GH * 0.46]).scale(R).rotate([-lon0, -lat0]).clipAngle(90);
  const path = geoPath(proj);
  const mx = path(MEX) ?? "";
  const b = path.bounds(MEX);
  const flag = interpolate(q, [0.35, 0.7], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: interpolate(t, [o.at, o.at + 0.15], [0, 1], clamp) * a, background: "black" }}>
      <canvas ref={ref} width={GW} height={GH} style={{ width: 1080, height: 1920, position: "absolute" }} />
      <svg width={1080} height={1920} viewBox={`0 0 ${GW} ${GH}`} style={{ position: "absolute" }}>
        <defs>
          <clipPath id="mx"><path d={mx} /></clipPath>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g clipPath="url(#mx)" opacity={flag}>
          <image href={staticFile("pinky/mx.svg")} x={b[0][0]} y={b[0][1] - (b[1][1] - b[0][1]) * 0.05} width={b[1][0] - b[0][0]} height={(b[1][1] - b[0][1]) * 1.1} preserveAspectRatio="none" />
        </g>
        <path d={mx} fill="none" stroke="#ffb627" strokeWidth={1.6} opacity={flag} filter="url(#glow)" />
      </svg>
      {/* trama de puntos y viñeta oscura de las referencias */}
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.28) 1.1px, transparent 1.6px)", backgroundSize: "7px 7px" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 55% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------- catálogo: página de la tienda en superficie curva que se desplaza ----------
const catImgs: Record<string, HTMLImageElement> = {};
const Catalog: React.FC<{ o: Extract<Overlay, { type: "catalog" }> }> = ({ o }) => {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(!!catImgs[o.image]);
  const [handle] = useState(() => (catImgs[o.image] ? null : delayRender("catalog image")));
  useEffect(() => {
    if (catImgs[o.image]) return;
    const img = new Image();
    img.onload = () => { catImgs[o.image] = img; setReady(true); if (handle !== null) continueRender(handle); };
    img.src = staticFile(o.image);
  }, [o.image, handle]);
  const a = life(t, o.at, o.until);
  const scroll = interpolate(t, [o.at, o.until], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  useEffect(() => {
    const img = catImgs[o.image];
    if (!ready || !img || !ref.current || a <= 0) return;
    const g = ref.current.getContext("2d")!;
    g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, 1080, 1920);
    const s = 1080 / img.width * 1.08;               // page a bit wider than the screen
    const pageH = 1920 / s;                           // source rows visible
    const y0 = 40 + scroll * Math.max(0, img.height - pageH - 80);
    const Rc = 1080 * 0.62;
    for (let x = 0; x < 1080; x += 2) {
      const xn = (x - 540) / Rc;
      const th = Math.asin(Math.max(-0.999, Math.min(0.999, xn)));
      const u = (th * Rc + 540) / 1080;               // arc length -> page column
      const sx = (u * 1080 * 1.08 - 43) / s;
      const bulge = 1.0 + 0.16 * Math.cos(th * 1.6);  // centre column taller: top/bottom edges curve
      const h = 1920 * bulge;
      g.drawImage(img, Math.max(0, Math.min(img.width - 1, sx)), y0, 1 / s * 2.2, pageH, x, (1920 - h) / 2 + 60, 2.2, h);
    }
    const sh = g.createLinearGradient(0, 0, 1080, 0);
    sh.addColorStop(0, "rgba(0,0,0,0.45)"); sh.addColorStop(0.18, "rgba(0,0,0,0)"); sh.addColorStop(0.82, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.45)");
    g.fillStyle = sh; g.fillRect(0, 0, 1080, 1920);
  });
  if (a <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: interpolate(t, [o.at, o.at + 0.15], [0, 1], clamp) * a, background: "#0b0b0b" }}>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};

// ---------- presentador en círculo, encuadre que sigue la cara ----------
const PIP_D = 430, PIP_X = 760, PIP_Y = 480;
const Pip: React.FC<{ clip: string; b: Broll }> = ({ clip, b }) => {
  const { t, frame, fps } = useT();
  const tr = b.pip!;
  const k = Math.max(0, tr.findIndex(([tt]) => tt > t) - 1);
  const [t0, x0, y0, w0] = tr[k], [t1, x1, y1, w1] = tr[Math.min(tr.length - 1, k + 1)];
  const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  const cx = x0 + (x1 - x0) * f, cy = y0 + (y1 - y0) * f, fw = w0 + (w1 - w0) * f;
  // escala: cara ~50 % del círculo, sin dejar huecos y con la cara siempre centrada
  const s = Math.max(PIP_D * 0.5 / fw, PIP_D / 720, (PIP_D / 2) / Math.max(1, Math.min(cx, 720 - cx)));
  const left = PIP_D / 2 - cx * s, top = PIP_D * 0.46 - cy * s;
  const q = sp(frame, fps, b.at, 12);
  return (
    <div style={{ position: "absolute", left: PIP_X - PIP_D / 2, top: PIP_Y - PIP_D / 2, width: PIP_D, height: PIP_D, borderRadius: "50%", overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)", transform: `scale(${q})`, background: "#222" }}>
      <OffthreadVideo src={staticFile(clip)} muted style={{ position: "absolute", width: 720 * s, height: 1280 * s, left, top }} />
    </div>
  );
};

// ---------- conteo de prendas: número grande "N/12" + la prenda equivalente de la tienda ----------
const Count: React.FC<{ o: Extract<Overlay, { type: "count" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  if (t < o.at || t >= o.until) return null;
  const q = spring({ frame: frame - o.at * fps, fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
  const out = interpolate(t, [o.until - 0.15, o.until], [1, 0], clamp);
  const bar = wipe(t, o.at + 0.12, 0.2);
  return (
    <>
      <div style={{ position: "absolute", left: 60, top: 190, display: "flex", alignItems: "baseline", opacity: out, transform: `scale(${0.6 + 0.4 * q})`, transformOrigin: "left top" }}>
        <span style={{ ...txt(220, YG), letterSpacing: -10, textShadow: "0 0 18px rgba(255,232,26,0.95), 0 0 44px rgba(255,214,0,0.6), 0 6px 10px rgba(0,0,0,0.5)" }}>{o.n}</span>
        <span style={{ ...txt(76), marginLeft: 6, textShadow: SHADOW }}>/{o.total}</span>
      </div>
      <div style={{ position: "absolute", left: 66, top: 420, opacity: out * Math.min(1, q * 1.5) }}>
        <span style={{ ...txt(44), textShadow: SHADOW }}>PRENDAS</span>
      </div>
      <div style={{ position: "absolute", right: 56, top: 170, width: 410, opacity: out, transform: `translateX(${(1 - q) * 160}px) scale(${0.8 + 0.2 * q})`, transformOrigin: "right top" }}>
        <div style={{ width: 410, height: 540, borderRadius: 26, overflow: "hidden", background: "#eee", border: "5px solid white", boxShadow: "0 16px 36px rgba(0,0,0,0.45)" }}>
          <Img src={staticFile(o.image)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }} />
        </div>
        <div style={{ position: "relative", marginTop: 12, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: Y, clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)` }} />
          <span style={{ ...txt(44), position: "relative", textShadow: SHADOW, opacity: bar }}>{o.label}</span>
        </div>
      </div>
    </>
  );
};
const CountGrid: React.FC<{ o: Extract<Overlay, { type: "countgrid" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  if (t < o.at || t >= o.until) return null;
  const out = interpolate(t, [o.until - 0.15, o.until], [1, 0], clamp);
  const cw = 196, ch = 250, gap = 12, cols = 4, x0 = (1080 - (cols * cw + (cols - 1) * gap)) / 2, y0 = 100;   // termina antes del subtítulo
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      {o.images.map((im, i) => {
        const q = spring({ frame: frame - (o.at + i * 0.06) * fps, fps, config: { damping: 11, stiffness: 220, mass: 0.5 } });
        if (q <= 0.001) return null;
        return (
          <div key={i} style={{ position: "absolute", left: x0 + (i % cols) * (cw + gap), top: y0 + Math.floor(i / cols) * (ch + gap), width: cw, height: ch, borderRadius: 18, overflow: "hidden",
            border: "4px solid white", boxShadow: "0 10px 24px rgba(0,0,0,0.45)", background: "#eee", transform: `scale(${q}) rotate(${(i % 2 ? 2 : -2) * (1 - q)}deg)` }}>
            <Img src={staticFile(im)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }} />
          </div>
        );
      })}
    </div>
  );
};

// ---------- colocación según la cara: el subtítulo (y su widget) nunca tapa la cara ----------
type Box = { top: number; bottom: number; left: number; right: number; cx: number; cy: number; w: number };
const presenterVisible = (p: PinkyProps, t: number) =>
  !(p.broll ?? []).some((b) => t >= b.at && t < b.until) &&
  !(p.overlays ?? []).some((o) => (o.type === "globe" || o.type === "catalog") && t >= o.at && t < o.until);
// zona protegida de la cara (del pelo a la barbilla) en coordenadas de salida, unida sobre [t0, t1]
const faceZone = (p: PinkyProps, t0: number, t1: number): Box | null => {
  let box: Box | null = null;
  for (const [ft, cx, cy, w] of p.faces ?? []) {
    if (ft < t0 - 0.2 || ft > t1 + 0.2 || !presenterVisible(p, ft)) continue;
    const z = zoomAt(p, ft), X = (x: number) => 540 + (x * 1.5 - 540) * z, Yo = (y: number) => 768 + (y * 1.5 - 768) * z;
    const b = { top: Yo(cy - 0.85 * w), bottom: Yo(cy + 0.75 * w), left: X(cx - 0.75 * w), right: X(cx + 0.75 * w), cx: X(cx), cy: Yo(cy), w: w * 1.5 * z };
    box = box ? { top: Math.min(box.top, b.top), bottom: Math.max(box.bottom, b.bottom), left: Math.min(box.left, b.left), right: Math.max(box.right, b.right), cx: (box.cx + b.cx) / 2, cy: (box.cy + b.cy) / 2, w: Math.max(box.w, b.w) } : b;
  }
  return box;
};
// y del bloque [y+up, y+down]: en el pecho si no toca la cara; si la toca, arriba de la cabeza (o debajo de la barbilla)
const placeY = (p: PinkyProps, t0: number, t1: number, up: number, down: number) => {
  const pref = p.captionY ?? 1000;
  const zones: { top: number; bottom: number }[] = [];
  const f = faceZone(p, t0, t1);
  if (f) zones.push(f);
  // el círculo del presentador sobre B-roll también es obstáculo
  if ((p.broll ?? []).some((b) => b.pip && b.at < t1 && b.until > t0)) zones.push({ top: PIP_Y - PIP_D / 2 - 20, bottom: PIP_Y + PIP_D / 2 + 20 });
  if (!zones.length) return pref;
  const overlap = (y: number) => zones.reduce((acc, z) => acc + Math.max(0, Math.min(y + down, z.bottom) - Math.max(y + up, z.top)), 0);
  const top = Math.min(...zones.map((z) => z.top)), bottom = Math.max(...zones.map((z) => z.bottom));
  const clampY = (y: number) => Math.min(1720 - down, Math.max(150 - up, y));
  const cands = [pref, ...zones.map((z) => z.top - 30 - down), ...zones.map((z) => z.bottom + 30 - up), top - 30 - down, bottom + 30 - up].map(clampY);
  let best = cands[0];
  for (const c of cands) if (overlap(c) < overlap(best) - 1) best = c;
  return best;
};
const blockOf = (o: Overlay): [number, number] => {
  switch (o.type) {
    case "price": return [-80, 330];
    case "money": return [-80, 500];
    case "url": return [-80, 140];
    case "stack": return [-50, o.items.length * 88 - 30];
    default: return [-80, 60];
  }
};
const widgetSpan = (o: Overlay): [number, number] => o.type === "stack" ? [o.items[0][0], o.until] : [(o as { at: number }).at, (o as { until: number }).until];

// ---------- íconos tipo sticker junto a la cabeza ----------
const STICKER = "drop-shadow(5px 0 0 white) drop-shadow(-5px 0 0 white) drop-shadow(0 5px 0 white) drop-shadow(0 -5px 0 white) drop-shadow(0 14px 18px rgba(0,0,0,0.45))";
const Icon: React.FC<{ o: Extract<Overlay, { type: "icon" }>; p: PinkyProps; k: number; avoid: [number, number] }> = ({ o, p, k, avoid }) => {
  const { t, frame, fps } = useT();
  if (t < o.at || t >= o.until) return null;
  const q = spring({ frame: frame - o.at * fps, fps, config: { damping: 9, stiffness: 190, mass: 0.7 } });
  const out = interpolate(t, [o.until - 0.14, o.until], [1, 0], clamp);
  const f = faceZone(p, o.at, o.until);
  const S = 270;
  let x: number, y: number;
  if (o.x !== undefined && o.y !== undefined) { x = o.x; y = o.y; }
  else if (f) {
    const leftRoom = f.left, rightRoom = 1080 - f.right;
    const right = rightRoom >= leftRoom ? true : false;
    x = right ? Math.min(1080 - S - 30, f.right + 10) : Math.max(30, f.left - S - 10);
    y = Math.max(140, f.cy - S * 0.55);
  } else { x = k % 2 ? 90 : 1080 - S - 90; y = 300; }
  // que no choque con el bloque del subtítulo
  if (y + S > avoid[0] && y < avoid[1]) y = avoid[0] - S - 20 > 120 ? avoid[0] - S - 20 : avoid[1] + 20;
  const rot = (k % 2 ? 8 : -8) + 3 * Math.sin(t * 3 + k);
  const isPhoto = o.src.endsWith(".png");
  return (
    <Img src={staticFile(o.src)} style={{ position: "absolute", left: x, top: y + 6 * Math.sin(t * 4 + k), width: S, height: S, objectFit: "contain",
      transform: `scale(${q * out}) rotate(${rot}deg)`, filter: isPhoto ? "drop-shadow(0 14px 18px rgba(0,0,0,0.45))" : STICKER }} />
  );
};

export const PinkyAd: React.FC<PinkyProps> = (p) => {
  const { t } = useT();
  const br = (p.broll ?? []).find((b) => t >= b.at && t < b.until);
  const stackOn = (p.overlays ?? []).some((o) => o.type === "stack" && t >= o.items[0][0] && t < o.until);
  const widgets = (p.overlays ?? []).filter((o) => ["price", "money", "url", "stack"].includes(o.type));
  const wy = widgets.map((o) => { const [u, d] = blockOf(o); const [a, b] = widgetSpan(o); return placeY(p, a, b, u, d); });
  const activeW = widgets.findIndex((o) => { const [a, b] = widgetSpan(o); return t >= a && t < b; });
  const pg = pageAt(p.words, t);
  const em = pg ? isEmPage(p, pg[0], pg[1]) : false;
  const y = activeW >= 0 ? wy[activeW] : pg ? placeY(p, pg[2], pg[3], em ? -80 : -50, em ? 140 : 60) : p.captionY ?? 1000;
  const avoid: [number, number] = activeW >= 0 ? [wy[activeW] + blockOf(widgets[activeW])[0], wy[activeW] + blockOf(widgets[activeW])[1]] : [y - 80, y + (em ? 140 : 60)];
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Camera p={p}>
        <OffthreadVideo src={staticFile(p.clip)} style={{ width: "100%", height: "100%" }} />
        {(p.broll ?? []).map((b, i) => (t >= b.at && t < b.until ? (
          <AbsoluteFill key={i}>
            <OffthreadVideo src={staticFile(b.src)} startFrom={Math.round((b.from ?? 0) * 30)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        ) : null))}
      </Camera>
      {br?.pip && <Pip clip={p.clip} b={br} />}
      {(p.overlays ?? []).map((o, i) => o.type === "globe" ? <Globe key={i} o={o} /> : o.type === "catalog" ? <Catalog key={i} o={o} /> : null)}
      {/* degradado negro inferior, como en las referencias */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.96) 90%)" }} />
      {(p.overlays ?? []).map((o, i) => {
        switch (o.type) {
          case "stack": return <Stack key={i} o={o} y={wy[widgets.indexOf(o)]} />;
          case "price": return <Price key={i} o={o} y={wy[widgets.indexOf(o)]} />;
          case "money": return <Money key={i} o={o} y={wy[widgets.indexOf(o)]} />;
          case "url": return <Url key={i} o={o} y={wy[widgets.indexOf(o)]} />;
          case "icon": return <Icon key={i} o={o} p={p} k={i} avoid={avoid} />;
          case "count": return <Count key={i} o={o} />;
          case "countgrid": return <CountGrid key={i} o={o} />;
          default: return null;
        }
      })}
      {!stackOn && <Captions p={p} y={y} />}
      <Flash at={p.flashes ?? []} />
    </AbsoluteFill>
  );
};
