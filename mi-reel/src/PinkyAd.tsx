import React, { useEffect, useRef, useState } from "react";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  continueRender,
  delayRender,
  Easing,
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
  | { type: "catalog"; at: number; until: number; image: string };
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
  captionY?: number;          // vertical centre of the caption line
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
const fmt = (w: string) => w.replace(/^2000([.,]?)$/, "$$2,000$1").replace(/^(\d+)\s?%$/, "$1%");
const life = (t: number, at: number, until: number) => interpolate(t, [until - 0.12, until], [1, 0], clamp) * (t >= at ? 1 : 0);
const wipe = (t: number, at: number, d = 0.2) => interpolate(t, [at, at + d], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const SHADOW = "0 3px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.5)";
const txt = (size: number, color = "white"): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: 900, fontSize: size, color, textTransform: "uppercase", letterSpacing: -size * 0.045,
  lineHeight: 1.02, whiteSpace: "nowrap",
});

// ---------- cámara ----------
const Camera: React.FC<{ p: PinkyProps; children: React.ReactNode }> = ({ p, children }) => {
  const { t } = useT();
  const keys = [...(p.punches ?? []), ...(p.cuts ?? []).map((c, i) => [c, i % 2 ? 0.0 : 0.07] as [number, number])].sort((a, b) => a[0] - b[0]);
  let z = 1 + 0.02 * Math.sin(t * 0.35);
  let cur = 0, last = -10;
  for (const [tp, a] of keys) if (t >= tp) { cur = a; last = tp; }
  const prev = keys.filter(([tp]) => tp < last).slice(-1)[0]?.[1] ?? 0;
  z += prev + (cur - prev) * Easing.out(Easing.cubic)(Math.min(1, (t - last) / 0.16));
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
  return <span style={{ ...style, clipPath: `inset(-30% ${(1 - r) * 100}% -30% -5%)`, opacity: Math.min(1, r * 2) }}>{children}</span>;
};

// ---------- subtítulos ----------
const Captions: React.FC<{ p: PinkyProps; y: number }> = ({ p, y }) => {
  const { t, frame } = useT();
  const W = p.words;
  const pages: [number, number][] = [];
  let s0 = 0;
  W.forEach(([, e, w], i) => {
    const nx = W[i + 1];
    if (/[.,:?¿!]$/.test(w) || !nx || nx[0] - e > 0.3 || i - s0 === 2) { pages.push([s0, i + 1]); s0 = i + 1; }
  });
  const idx = pages.findIndex(([a, b], i) => t >= W[a][0] - 0.02 && t < Math.min(W[b - 1][1] + 0.25, i + 1 < pages.length ? W[pages[i + 1][0]][0] - 0.02 : 999));
  if (idx < 0) return null;
  const [a, b] = pages[idx];
  const ws = W.slice(a, b);
  const hl = new Set((p.highlight ?? []).map(bare));
  const em = new Set((p.emph ?? []).map(bare));
  const isEm = ws.some(([, , w]) => em.has(bare(w)));
  const isHl = !isEm && ws.some(([, , w]) => hl.has(bare(w)));
  const bar = wipe(t, W[a][0], 0.22);
  if (isEm) {
    // línea pequeña blanca + palabra fuerte grande amarilla con brillo (debajo), como "PARA / REVENDER"
    const small = ws.filter(([, , w]) => !em.has(bare(w)));
    const big = ws.filter(([, , w]) => em.has(bare(w)));
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
        <path d="M300 400 L360 240 L392 268 L470 105" stroke="#caffc4" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 6px ${NEON}) drop-shadow(0 0 14px ${NEON})` }} />
        <path d="M440 110 L472 100 L478 134" stroke="#caffc4" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0.97 ? 1 : 0}
          style={{ filter: `drop-shadow(0 0 6px ${NEON})` }} />
      </svg>
    </div>
  );
};

// fajo de billetes (dibujo original: billetes verdes con faja de papel)
const Bills: React.FC = () => (
  <svg width="360" height="230" viewBox="0 0 360 230">
    <defs>
      <linearGradient id="bill" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#d9e6c8" /><stop offset="50%" stopColor="#b7cc9c" /><stop offset="100%" stopColor="#93ad78" /></linearGradient>
      <linearGradient id="edge" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#eef3e4" /><stop offset="100%" stopColor="#9db58a" /></linearGradient>
    </defs>
    <g transform="rotate(-14 180 115)">
      {[...Array(9)].map((_, k) => <rect key={k} x={40} y={82 + k * 4} width={280} height={110} rx={4} fill="url(#edge)" stroke="#7d966a" strokeWidth={1} />)}
      <rect x={40} y={74} width={280} height={110} rx={4} fill="url(#bill)" stroke="#5f7a4c" strokeWidth={2} />
      <rect x={52} y={84} width={256} height={90} rx={3} fill="none" stroke="#5f7a4c" strokeWidth={2} opacity={0.7} />
      <ellipse cx={180} cy={129} rx={32} ry={38} fill="#a6bd8b" stroke="#5f7a4c" strokeWidth={2} />
      <text x={180} y={143} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={40} fill="#3f5a2f">$</text>
      <text x={70} y={110} fontFamily={FONT} fontWeight={900} fontSize={22} fill="#3f5a2f">100</text>
      <text x={262} y={168} fontFamily={FONT} fontWeight={900} fontSize={22} fill="#3f5a2f">100</text>
      <rect x={236} y={70} width={44} height={150} fill="#f2e3a6" stroke="#b89a45" strokeWidth={2} />
      <rect x={236} y={128} width={44} height={20} fill="#d9b95a" />
    </g>
  </svg>
);

// ---------- dinero: recuadro de vidrio + billetes + flecha en zigzag ----------
const Money: React.FC<{ o: Extract<Overlay, { type: "money" }>; y: number }> = ({ o, y }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 11);
  const draw = interpolate(t, [o.at + 0.1, o.at + 0.55], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const W = 520, H = 330, left = (1080 - W) / 2, top = y + 70;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ position: "absolute", left, top, width: W, height: H, borderRadius: 34, background: "rgba(255,255,255,0.20)", border: "3px solid rgba(255,255,255,0.6)",
        backdropFilter: "blur(5px)", boxShadow: "0 12px 30px rgba(0,0,0,0.3)", transform: `scale(${0.7 + 0.3 * q})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Bills />
      </div>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M${left + 20} ${top + H + 110} L${left + 70} ${top + H - 40} L${left + 140} ${top + H - 110} L${left + 175} ${top + H - 60} L${left + 290} ${top + 120}`}
          stroke="#caffc4" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw}
          style={{ filter: `drop-shadow(0 0 6px ${NEON}) drop-shadow(0 0 16px ${NEON})` }} />
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

export const PinkyAd: React.FC<PinkyProps> = (p) => {
  const { t } = useT();
  const br = (p.broll ?? []).find((b) => t >= b.at && t < b.until);
  const y = p.captionY ?? 980;
  const stackOn = (p.overlays ?? []).some((o) => o.type === "stack" && t >= o.items[0][0] && t < o.until);
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
          case "stack": return <Stack key={i} o={o} y={y} />;
          case "price": return <Price key={i} o={o} y={y} />;
          case "money": return <Money key={i} o={o} y={y} />;
          case "url": return <Url key={i} o={o} y={y} />;
          default: return null;
        }
      })}
      {!stackOn && <Captions p={p} y={y} />}
      <Flash at={p.flashes ?? []} />
    </AbsoluteFill>
  );
};
