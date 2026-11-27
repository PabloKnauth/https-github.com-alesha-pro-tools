import React from "react";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
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

// Vestidos Pinky — plantilla de anuncios guiada por datos (ver CLAUDE.md, sección Vestidos Pinky).
// Estilo de las referencias: subtítulos en mayúsculas con barras amarillas, listas apiladas, precio en
// píldora verde neón, globo a México, catálogo en pantalla curva, PiP circular sobre B-roll, URL tecleada.
export const Y = "#f6dc3c";
const NEON = "#39ff6a";
const PINK = "#d4127b";
const FONT = "Montserrat, sans-serif";

export type Word = [number, number, string, number?];
export type Overlay =
  | { type: "stack"; items: [number, string][]; until: number; y?: number }
  | { type: "price"; at: number; until: number; value: string; label?: string; y?: number }
  | { type: "badge"; at: number; until: number; top: string; big: string; small?: string; y?: number }
  | { type: "globe"; at: number; until: number; caption?: string }
  | { type: "catalog"; at: number; until: number; image: string; caption?: string }
  | { type: "money"; at: number; until: number; label: string; y?: number }
  | { type: "url"; at: number; until: number; text: string; y?: number }
  | { type: "steps"; until: number; items: [number, string][]; y?: number }
  | { type: "big"; at: number; until: number; text: string; color?: string; y?: number; size?: number }
  | { type: "stamp"; at: number; until: number; text: string; y?: number }
  | { type: "emoji"; at: number; until: number; text: string; x?: number; y?: number };
export type Broll = { src: string; at: number; until: number; from?: number; pip?: boolean };
export type PinkyProps = {
  clip: string;
  duration: number;
  words: Word[];
  cuts?: number[];            // jump cuts / scene cuts: flash + zoom change
  punches?: [number, number][]; // [time, zoom amount]
  highlight?: string[];       // words that put their caption page on a yellow bar
  emph?: string[];            // words shown big in yellow with glow
  overlays?: Overlay[];
  broll?: Broll[];
  captionY?: number;
};

export const calcPinky: CalculateMetadataFunction<PinkyProps> = ({ props }) => ({
  durationInFrames: Math.ceil(props.duration * 30),
});

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};
const sp = (frame: number, fps: number, at: number, damping = 11) =>
  spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 160, mass: 0.6 } });
const clamp01 = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const bare = (w: string) => w.toLowerCase().replace(/[^\wáéíóúñü%$]/g, "");
const fmt = (w: string) => w.replace(/^2000([.,]?)$/, "$$2,000$1").replace(/^(\d+)\s?%$/, "$1%");

// ---------- cámara: acercamientos que cambian en cada golpe ----------
const Camera: React.FC<{ p: PinkyProps; children: React.ReactNode }> = ({ p, children }) => {
  const { t } = useT();
  const keys = [...(p.punches ?? []), ...(p.cuts ?? []).map((c, i) => [c, i % 2 ? 0.0 : 0.08] as [number, number])].sort((a, b) => a[0] - b[0]);
  let z = 1 + 0.025 * Math.sin(t * 0.35);
  let cur = 0, last = -10;
  for (const [tp, a] of keys) if (t >= tp) { cur = a; last = tp; }
  const prev = keys.filter(([tp]) => tp < last).slice(-1)[0]?.[1] ?? 0;
  z += prev + (cur - prev) * Easing.out(Easing.cubic)(Math.min(1, (t - last) / 0.16));
  return <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 40%" }}>{children}</AbsoluteFill>;
};

const Flash: React.FC<{ cuts: number[] }> = ({ cuts }) => {
  const { t } = useT();
  const d = Math.min(...cuts.map((c) => (t >= c ? t - c : 99)));
  const o = d < 0.12 ? 0.55 * (1 - d / 0.12) : 0;
  return o > 0 ? <AbsoluteFill style={{ background: "white", opacity: o }} /> : null;
};

// ---------- subtítulos ----------
const Captions: React.FC<{ p: PinkyProps; y: number }> = ({ p, y }) => {
  const { t, frame, fps } = useT();
  const W = p.words;
  const pages: [number, number][] = [];
  let s0 = 0;
  W.forEach(([, e, w], i) => {
    const nx = W[i + 1];
    if (/[.,:?¿!]$/.test(w) || !nx || nx[0] - e > 0.3 || i - s0 === 2) { pages.push([s0, i + 1]); s0 = i + 1; }
  });
  const idx = pages.findIndex(([a, b], i) => t >= W[a][0] && t < Math.min(W[b - 1][1] + 0.25, i + 1 < pages.length ? W[pages[i + 1][0]][0] : 999));
  if (idx < 0) return null;
  const [a, b] = pages[idx];
  const ws = W.slice(a, b);
  const hl = new Set((p.highlight ?? []).map(bare));
  const em = new Set((p.emph ?? []).map(bare));
  const isEm = ws.some(([, , w]) => em.has(bare(w)));
  const isHl = !isEm && ws.some(([, , w]) => hl.has(bare(w)));
  const pin = sp(frame, fps, W[a][0], 13);
  const bar = interpolate(t, [W[a][0], W[a][0] + 0.18], [0, 1], { ...clamp01, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${0.9 + 0.1 * pin})` }}>
      <div style={{ position: "relative", padding: isHl ? "6px 26px" : 0, maxWidth: 940 }}>
        {isHl && <div style={{ position: "absolute", inset: 0, background: Y, transformOrigin: "left center", transform: `scaleX(${bar})`, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }} />}
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 20px" }}>
          {ws.map(([s, , w], k) => {
            const on = t >= s;
            const e = em.has(bare(w));
            return (
              <span key={k} style={{
                fontFamily: FONT, fontWeight: 900, textTransform: "uppercase", letterSpacing: -1,
                fontSize: isEm ? (e ? 120 : 78) : 74, lineHeight: 1.05,
                color: e ? Y : "white", opacity: on ? 1 : 0,
                transform: `translateY(${on ? 0 : 12}px)`,
                textShadow: e ? `0 0 28px rgba(246,220,60,0.75), 0 5px 0 rgba(0,0,0,0.8)` : isHl ? "0 3px 0 rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.5)" : "0 4px 0 rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.7)",
              }}>{fmt(w)}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------- overlays ----------
const life = (t: number, at: number, until: number) => interpolate(t, [until - 0.15, until], [1, 0], clamp01) * (t >= at ? 1 : 0);

const Stack: React.FC<{ o: Extract<Overlay, { type: "stack" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const alive = life(t, o.items[0][0], o.until);
  if (alive <= 0) return null;
  return (
    <div style={{ position: "absolute", top: o.y ?? 560, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: alive }}>
      {o.items.map(([at, label], k) => {
        if (t < at) return null;
        const q = sp(frame, fps, at, 12);
        return (
          <div key={k} style={{ position: "relative", padding: "6px 34px", transform: `translateX(${(1 - q) * -60}px)` }}>
            <div style={{ position: "absolute", inset: 0, background: Y, transformOrigin: "left", transform: `scaleX(${q})`, boxShadow: "0 8px 18px rgba(0,0,0,0.35)" }} />
            <span style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: 78, color: "white", textTransform: "uppercase", textShadow: "0 3px 0 rgba(0,0,0,0.8)" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

const Price: React.FC<{ o: Extract<Overlay, { type: "price" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 9);
  const draw = interpolate(t, [o.at + 0.15, o.at + 0.6], [0, 1], clamp01);
  const glow = 0.6 + 0.4 * Math.sin(t * 7);
  return (
    <div style={{ position: "absolute", top: o.y ?? 1060, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ position: "relative", transform: `scale(${0.6 + 0.4 * q})` }}>
        {o.label && <div style={{ textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 44, color: "white", textShadow: "0 3px 0 rgba(0,0,0,0.8)", marginBottom: 8 }}>{o.label}</div>}
        <div style={{ padding: "10px 56px", borderRadius: 999, background: "rgba(10,40,16,0.75)", border: `5px solid ${NEON}`, boxShadow: `0 0 ${24 + glow * 26}px ${NEON}, inset 0 0 20px rgba(57,255,106,0.4)` }}>
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 120, color: NEON, textShadow: `0 0 ${18 * glow}px ${NEON}` }}>{o.value}</span>
        </div>
        <svg width="220" height="200" viewBox="0 0 220 200" style={{ position: "absolute", left: -150, top: 60, overflow: "visible" }}>
          <path d="M20 190 C 60 150, 90 120, 150 60" stroke={NEON} strokeWidth="12" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 10px ${NEON})` }} />
          <path d="M120 50 L158 52 L152 90" stroke={NEON} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0.95 ? 1 : 0} />
        </svg>
      </div>
    </div>
  );
};

const Badge: React.FC<{ o: Extract<Overlay, { type: "badge" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 9);
  const pulse = 1 + 0.03 * Math.sin(t * 8);
  return (
    <div style={{ position: "absolute", top: o.y ?? 150, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ background: "#0b0b0b", border: `6px solid ${Y}`, borderRadius: 28, padding: "18px 46px", textAlign: "center", transform: `scale(${(0.5 + 0.5 * q) * pulse}) rotate(${(1 - q) * -12}deg)`, boxShadow: `0 0 40px rgba(246,220,60,0.45), 0 18px 40px rgba(0,0,0,0.5)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 52, color: "white", letterSpacing: 4 }}>{o.top}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color: Y, lineHeight: 1, textShadow: "0 0 26px rgba(246,220,60,0.6)" }}>{o.big}</div>
        {o.small && <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: "white" }}>{o.small}</div>}
      </div>
    </div>
  );
};

// globo: acercamiento de la Tierra hasta México (forma rellena con los colores de la bandera, sin escudo)
const LAND = feature(world as never, (world as { objects: { countries: unknown } }).objects.countries as never) as unknown as { features: { id: string }[] };
const MEX = LAND.features.find((f) => f.id === "484")!;
const Globe: React.FC<{ o: Extract<Overlay, { type: "globe" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = interpolate(t, [o.at, o.until - 0.2], [0, 1], { ...clamp01, easing: Easing.inOut(Easing.cubic) });
  const enter = sp(frame, fps, o.at, 14);
  const S = 900;
  const proj = geoOrthographic().translate([S / 2, S / 2]).scale(330 + 1500 * q * q).rotate([20 + (102 - 20) * q, -10 - 14 * q, 0]).clipAngle(90);
  const path = geoPath(proj);
  const mexD = path(MEX as unknown as GeoPermissibleObjects) ?? "";
  const b = path.bounds(MEX as unknown as GeoPermissibleObjects);
  const bw = b[1][0] - b[0][0];
  return (
    <AbsoluteFill style={{ background: "#05070f", opacity: a, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ transform: `scale(${0.7 + 0.3 * enter})`, borderRadius: 60, overflow: "hidden" }}>
        <defs>
          <radialGradient id="sea" cx="40%" cy="35%"><stop offset="0%" stopColor="#1f6fb0" /><stop offset="100%" stopColor="#0a2a52" /></radialGradient>
          <clipPath id="mx"><path d={mexD} /></clipPath>
        </defs>
        <path d={path({ type: "Sphere" } as GeoPermissibleObjects) ?? ""} fill="url(#sea)" />
        {LAND.features.map((f) => <path key={f.id} d={path(f as unknown as GeoPermissibleObjects) ?? ""} fill="#2f7d3a" stroke="#1f5a28" strokeWidth={0.6} />)}
        <g clipPath="url(#mx)" opacity={interpolate(q, [0.45, 0.8], [0, 1], clamp01)}>
          <rect x={b[0][0]} y={b[0][1]} width={bw / 3} height={b[1][1] - b[0][1]} fill="#006847" />
          <rect x={b[0][0] + bw / 3} y={b[0][1]} width={bw / 3} height={b[1][1] - b[0][1]} fill="#ffffff" />
          <rect x={b[0][0] + (2 * bw) / 3} y={b[0][1]} width={bw / 3} height={b[1][1] - b[0][1]} fill="#ce1126" />
        </g>
        <path d={mexD} fill="none" stroke="white" strokeWidth={3} opacity={interpolate(q, [0.5, 0.85], [0, 1], clamp01)} />
      </svg>
      {o.caption && (
        <div style={{ position: "absolute", top: 1440, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ background: Y, padding: "6px 30px", fontFamily: FONT, fontWeight: 900, fontSize: 70, color: "white", textShadow: "0 3px 0 rgba(0,0,0,0.85)", opacity: interpolate(q, [0.5, 0.8], [0, 1], clamp01) }}>{o.caption}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Catalog: React.FC<{ o: Extract<Overlay, { type: "catalog" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const enter = sp(frame, fps, o.at, 13);
  const scroll = interpolate(t, [o.at + 0.4, o.until], [0, 1], { ...clamp01, easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, #ff5fae, ${PINK} 55%, #5a0632)`, opacity: a, perspective: 1600, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 860, height: 1480, borderRadius: 54, overflow: "hidden", background: "white", border: "14px solid #111",
        transform: `translateY(${(1 - enter) * 300}px) rotateX(10deg) rotateY(${-14 + 8 * Math.sin(t * 0.8)}deg)`, boxShadow: "0 60px 120px rgba(0,0,0,0.5)" }}>
        <Img src={staticFile(o.image)} style={{ width: "100%", transform: `translateY(${-scroll * 5000}px)` }} />
      </div>
      {o.caption && <div style={{ position: "absolute", top: 120, fontFamily: FONT, fontWeight: 900, fontSize: 64, color: "white", textShadow: "0 4px 0 rgba(0,0,0,0.5)" }}>{o.caption}</div>}
    </AbsoluteFill>
  );
};

const Money: React.FC<{ o: Extract<Overlay, { type: "money" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 10);
  const draw = interpolate(t, [o.at + 0.2, o.at + 0.7], [0, 1], clamp01);
  return (
    <div style={{ position: "absolute", top: o.y ?? 1180, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ position: "relative", padding: "26px 40px", borderRadius: 30, background: "rgba(255,255,255,0.16)", border: "2px solid rgba(255,255,255,0.4)", backdropFilter: "blur(10px)", transform: `scale(${0.6 + 0.4 * q})` }}>
        <svg width="360" height="180" viewBox="0 0 360 180">
          {[0, 1, 2].map((k) => (
            <g key={k} transform={`translate(${20 + k * 18} ${50 - k * 16}) rotate(${-6 + k * 4})`}>
              <rect width="240" height="110" rx="10" fill="#4caf50" stroke="#1b5e20" strokeWidth="4" />
              <circle cx="120" cy="55" r="30" fill="#81c784" stroke="#1b5e20" strokeWidth="3" />
              <text x="120" y="68" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize="36" fill="#1b5e20">$</text>
            </g>
          ))}
          <path d="M240 160 L 290 100 L 315 120 L 350 40" stroke={NEON} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 10px ${NEON})` }} />
          <path d="M322 38 L352 36 L350 66" stroke={NEON} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0.95 ? 1 : 0} />
        </svg>
        <div style={{ textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 54, color: NEON, textShadow: `0 0 16px ${NEON}, 0 3px 0 rgba(0,0,0,0.6)` }}>{o.label}</div>
      </div>
    </div>
  );
};

const Url: React.FC<{ o: Extract<Overlay, { type: "url" }> }> = ({ o }) => {
  const { t } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const bar = interpolate(t, [o.at, o.at + 0.2], [0, 1], clamp01);
  const n = Math.floor(interpolate(t, [o.at + 0.15, o.at + 1.2], [0, o.text.length], clamp01));
  return (
    <div style={{ position: "absolute", top: o.y ?? 1250, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ position: "relative", padding: "10px 30px", minWidth: 820 }}>
        <div style={{ position: "absolute", inset: 0, background: Y, transformOrigin: "left", transform: `scaleX(${bar})`, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }} />
        <span style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: 52, color: "white", textShadow: "0 3px 0 rgba(0,0,0,0.85)" }}>
          {o.text.slice(0, n)}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span>
        </span>
      </div>
    </div>
  );
};

const Steps: React.FC<{ o: Extract<Overlay, { type: "steps" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.items[0][0], o.until);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", top: o.y ?? 180, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 14, opacity: a }}>
      {o.items.map(([at, label], k) => {
        const on = t >= at;
        const q = on ? sp(frame, fps, at, 11) : 0;
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 22px", borderRadius: 22, background: on ? "rgba(11,11,11,0.78)" : "rgba(11,11,11,0.35)", border: `3px solid ${on ? Y : "rgba(255,255,255,0.2)"}`, transform: `scale(${on ? 0.92 + 0.08 * q : 0.92})` }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: on ? Y : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: 36, color: "#111" }}>{on && q > 0.6 ? "✓" : k + 1}</div>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 48, color: "white", textTransform: "uppercase" }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

const Big: React.FC<{ o: Extract<Overlay, { type: "big" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 8);
  const c = o.color ?? Y;
  return (
    <div style={{ position: "absolute", top: o.y ?? 300, left: 0, right: 0, textAlign: "center", opacity: a, transform: `scale(${0.5 + 0.5 * q})` }}>
      <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: o.size ?? 150, color: c, textTransform: "uppercase", lineHeight: 1, whiteSpace: "pre-line", textShadow: `0 0 34px ${c}99, 0 6px 0 rgba(0,0,0,0.8)` }}>{o.text}</span>
    </div>
  );
};

const Stamp: React.FC<{ o: Extract<Overlay, { type: "stamp" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = spring({ frame: frame - o.at * fps, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", top: o.y ?? 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a * Math.min(1, q * 3) }}>
      <div style={{ border: `12px solid #ff2d55`, borderRadius: 24, padding: "4px 40px", transform: `rotate(-10deg) scale(${interpolate(q, [0, 1], [2.6, 1])})`, background: "rgba(0,0,0,0.35)",
        fontFamily: FONT, fontWeight: 900, fontSize: 130, color: "#ff2d55", letterSpacing: 4 }}>{o.text}</div>
    </div>
  );
};

const Emoji: React.FC<{ o: Extract<Overlay, { type: "emoji" }> }> = ({ o }) => {
  const { t, frame, fps } = useT();
  const a = life(t, o.at, o.until);
  if (a <= 0) return null;
  const q = sp(frame, fps, o.at, 7);
  return <div style={{ position: "absolute", left: o.x ?? 760, top: o.y ?? 260, fontSize: 170, opacity: a, transform: `scale(${q}) rotate(${Math.sin(t * 9) * 8}deg)` }}>{o.text}</div>;
};

const Pip: React.FC<{ clip: string; t0: number }> = ({ clip, t0 }) => {
  const { frame, fps } = useT();
  const q = sp(frame, fps, t0, 12);
  return (
    <div style={{ position: "absolute", right: 60, top: 230, width: 330, height: 330, borderRadius: "50%", overflow: "hidden", border: "8px solid white", boxShadow: "0 18px 40px rgba(0,0,0,0.5)", transform: `scale(${q})` }}>
      {/* cara del presentador centrada en el círculo (en los clips la cara está ~44 % de la altura) */}
      <OffthreadVideo src={staticFile(clip)} muted style={{ width: 446, height: 792, marginLeft: -58, marginTop: -160, objectFit: "cover" }} />
    </div>
  );
};

export const PinkyAd: React.FC<PinkyProps> = (p) => {
  const { t } = useT();
  const br = (p.broll ?? []).find((b) => t >= b.at && t < b.until);
  const fullOverlay = (p.overlays ?? []).some((o) => (o.type === "globe" || o.type === "catalog") && t >= o.at && t < o.until);
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Camera p={p}>
        <OffthreadVideo src={staticFile(p.clip)} style={{ width: "100%", height: "100%" }} />
        {(p.broll ?? []).map((b, i) => (t >= b.at && t < b.until ? (
          <AbsoluteFill key={i}>
            <OffthreadVideo src={staticFile(b.src)} startFrom={Math.round(((b.from ?? 0) + 0) * 30)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        ) : null))}
      </Camera>
      {br?.pip && <Pip clip={p.clip} t0={br.at} />}
      {/* degradado negro inferior, como en las referencias */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 62%, rgba(0,0,0,0.85) 100%)" }} />
      {(p.overlays ?? []).map((o, i) => {
        switch (o.type) {
          case "stack": return <Stack key={i} o={o} />;
          case "price": return <Price key={i} o={o} />;
          case "badge": return <Badge key={i} o={o} />;
          case "globe": return <Globe key={i} o={o} />;
          case "catalog": return <Catalog key={i} o={o} />;
          case "money": return <Money key={i} o={o} />;
          case "url": return <Url key={i} o={o} />;
          case "steps": return <Steps key={i} o={o} />;
          case "big": return <Big key={i} o={o} />;
          case "stamp": return <Stamp key={i} o={o} />;
          case "emoji": return <Emoji key={i} o={o} />;
        }
      })}
      {!fullOverlay && <Captions p={p} y={p.captionY ?? 980} />}
      <Flash cuts={p.cuts ?? []} />
    </AbsoluteFill>
  );
};
