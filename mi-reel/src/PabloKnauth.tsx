import React from "react";
import "@fontsource/permanent-marker";
import "@fontsource/caveat/700.css";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import head from "./pablo_head.json";

// Marca personal Pablo Knauth — collage retro: recorte B/N con borde de papel, ondas naranja/rosa/amarillo,
// garabatos a mano, recortes de papel con cinta y letra de marcador.
const C = {
  orange: "#f0532d",
  red: "#e8442a",
  pink: "#f49ac1",
  yellow: "#f7c12e",
  cream: "#f3e9d4",
  ink: "#1a1a1a",
};
const MARKER = "'Permanent Marker', cursive";
const HAND = "Caveat, cursive";

const WORDS: [number, number, string][] = [
  [0.0, 0.32, "¿Usas"], [0.32, 0.88, "inteligencia"], [0.88, 1.3, "artificial"], [1.3, 1.64, "y"], [1.64, 1.74, "lo"],
  [1.74, 1.82, "que"], [1.82, 1.94, "te"], [1.94, 2.16, "escribe"], [2.16, 2.52, "suena"], [2.52, 2.7, "como"],
  [2.7, 3.1, "robot?"], [3.34, 3.46, "Soy"], [3.46, 3.78, "Pablo"], [3.78, 3.94, "y"], [3.94, 4.02, "me"],
  [4.02, 4.26, "dedico"], [4.26, 4.34, "a"], [4.34, 4.46, "que"], [4.46, 4.56, "la"], [4.56, 4.68, "IA"],
  [4.68, 4.9, "trabaje"], [4.9, 5.04, "para"], [5.04, 5.18, "tu"], [5.18, 5.38, "marca"], [5.38, 5.9, "personal"],
  [5.9, 6.12, "sin"], [6.12, 6.68, "quitarle"], [6.68, 6.8, "la"], [6.8, 7.2, "voz."], [7.4, 7.52, "Aquí"],
  [7.52, 7.66, "vas"], [7.66, 7.74, "a"], [7.74, 7.82, "ver"], [7.82, 8.36, "prompts,"], [8.38, 8.6, "skills"],
  [8.6, 8.9, "y"], [8.9, 9.02, "guías"], [9.02, 9.2, "para"], [9.2, 9.48, "Claude"], [9.48, 9.58, "que"],
  [9.58, 9.68, "yo"], [9.68, 10.36, "personalmente"], [10.36, 10.8, "uso."], [11.1, 11.2, "Y"], [11.2, 11.28, "de"],
  [11.28, 11.48, "paso"], [11.48, 11.72, "para"], [11.72, 11.9, "tener"], [11.9, 12.04, "el"], [12.04, 12.2, "cuerpo"],
  [12.2, 12.4, "de"], [12.4, 12.8, "Logan."], [13.04, 13.2, "¿Sí?"], [13.28, 13.38, "En"], [13.38, 13.7, "serio."],
  [13.96, 14.14, "Armé"], [14.14, 14.22, "una"], [14.22, 14.76, "biblioteca"], [14.76, 15.0, "con"], [15.0, 15.32, "todo"],
  [15.32, 15.66, "eso"], [15.66, 16.06, "y"], [16.06, 16.3, "es"], [16.3, 17.24, "gratis."], [17.42, 17.8, "Sígueme"],
  [17.8, 17.88, "y"], [17.88, 18.2, "escríbeme"], [18.2, 18.72, "«BIBLIOTECA»"], [18.72, 18.86, "por"], [18.86, 18.94, "un"],
  [18.94, 19.22, "mensaje"], [19.22, 19.46, "y"], [19.46, 19.56, "te"], [19.56, 20.04, "comparto"], [20.04, 20.12, "el"],
  [20.12, 20.5, "acceso."], [20.6, 20.84, "Así"], [20.84, 21.08, "que"], [21.08, 21.6, "dime."],
];
const PAGES: [number, number][] = (() => {
  const pages: [number, number][] = [];
  let start = 0;
  WORDS.forEach(([, end, w], i) => {
    const next = WORDS[i + 1];
    const pause = next ? next[0] - end > 0.25 : true;
    if (/[.,:?…]$/.test(w) || pause || i - start === 2) {
      pages.push([start, i + 1]);
      start = i + 1;
    }
  });
  return pages;
})();

// ---------- tiempo, resortes y "boil" de animación a mano (12 fps) ----------
const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps, boil: Math.floor(frame / 2.5) };
};
const springAt = (frame: number, fps: number, at: number, damping = 10) =>
  spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 140, mass: 0.7 } });
const draw = (t: number, at: number, dur = 0.45) =>
  interpolate(t, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
const jitter = (boil: number, seed: number, amp: number) => Math.sin(boil * 12.9898 + seed * 78.233) * amp;

// semilla de forma determinista para bordes rasgados
const rand = (s: number) => {
  const x = Math.sin(s * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const tornPolygon = (seed: number, depth = 2.2, n = 18) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${rand(seed + i) * depth}%`);
  for (let i = 0; i <= 6; i++) pts.push(`${100 - rand(seed + 40 + i) * depth}% ${(i / 6) * 100}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * 100}% ${100 - rand(seed + 80 + i) * depth}%`);
  for (let i = 6; i >= 0; i--) pts.push(`${rand(seed + 120 + i) * depth}% ${(i / 6) * 100}%`);
  return `polygon(${pts.join(",")})`;
};

// ---------- filtros SVG compartidos ----------
const Filters: React.FC = () => {
  const { boil } = useT();
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={boil % 3} />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.55 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
};

// ---------- fondo: ondas que fluyen ----------
const WAVE_COLORS = [C.orange, C.pink, C.yellow, C.red, C.pink, C.yellow, C.orange];
const Waves: React.FC = () => {
  const { t } = useT();
  const W = 1080, H = 1920, n = WAVE_COLORS.length, bandW = W / (n - 2);
  const path = (k: number) => {
    const pts: string[] = [];
    const base = (k - 1) * bandW;
    for (let y = -40; y <= H + 40; y += 40) {
      const x = base + Math.sin(y / 260 + t * 0.6 + k * 0.9) * 70 + Math.sin(y / 120 - t * 0.35 + k) * 18;
      pts.push(`${x.toFixed(1)},${y}`);
    }
    return `M-200,-40 L${pts.join(" L")} L-200,${H + 40} Z`;
  };
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <rect width={W} height={H} fill={WAVE_COLORS[n - 1]} />
      {WAVE_COLORS.map((c, k) => (
        <path key={k} d={path(n - 1 - k)} fill={WAVE_COLORS[n - 1 - k]} />
      ))}
      <rect width={W} height={H} fill="#fff" filter="url(#paper)" opacity={0.55} style={{ mixBlendMode: "multiply" }} />
    </svg>
  );
};

// ---------- garabatos (trazos que se dibujan) ----------
const Doodle: React.FC<{
  d: string | string[];
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vb: string;
  color?: string;
  stroke?: number;
  dur?: number;
  rot?: number;
  outAt?: number;
}> = ({ d, at, x, y, w, h, vb, color = C.yellow, stroke = 7, dur = 0.45, rot = 0, outAt = 99 }) => {
  const { t, boil } = useT();
  if (t < at || t > outAt + 0.25) return null;
  const p = draw(t, at, dur);
  const fade = interpolate(t, [outAt, outAt + 0.25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      width={w}
      height={h}
      viewBox={vb}
      style={{
        position: "absolute",
        left: x,
        top: y,
        overflow: "visible",
        opacity: fade,
        transform: `rotate(${rot + jitter(boil, x, 1.5)}deg)`,
        filter: "url(#rough) drop-shadow(0 3px 0 rgba(0,0,0,0.25))",
      }}
    >
      {paths.map((pd, i) => (
        <path
          key={i}
          d={pd}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - Math.min(1, Math.max(0, p * paths.length - i))}
        />
      ))}
    </svg>
  );
};

const STAR = "M50 8 L61 38 L94 38 L67 58 L78 90 L50 70 L22 90 L33 58 L6 38 L39 38 Z";
const CROWN = ["M10 80 L18 25 L40 55 L55 10 L70 55 L92 25 L98 80 Z", "M50 95 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0"];
const ARROW = ["M10 20 C 60 0, 120 10, 170 70", "M150 40 L172 72 L136 78"];
const UNDERLINE = "M5 20 C 80 5, 160 30, 300 12";
const SCRIBBLE = "M10 30 L380 10 M20 60 L370 40 M15 90 L385 70 M10 120 L380 100";
const BICEP = [
  "M20 150 C 20 90, 40 60, 70 55 C 85 20, 120 15, 135 40 C 150 60, 135 80, 115 78 C 125 100, 150 110, 170 100",
  "M20 150 L 175 150 C 185 120, 180 105, 170 100",
  "M75 95 C 85 105, 100 105, 110 95",
];
const ROBOT = [
  "M30 40 H130 V130 H30 Z",
  "M55 75 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0",
  "M105 75 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0",
  "M55 108 H105 M65 100 V116 M80 100 V116 M95 100 V116",
  "M80 40 V18 M80 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0",
  "M30 85 H14 M130 85 H146",
];
const BOOKS = [
  "M20 140 H170 V160 H20 Z",
  "M30 115 H160 V140 H30 Z",
  "M40 60 L70 55 L80 115 L50 120 Z",
  "M85 50 H115 V115 H85 Z",
  "M120 65 H150 V115 H120 Z",
];
const SPARK = "M20 2 V38 M2 20 H38 M7 7 L33 33 M33 7 L7 33";

// ---------- papel: recortes, cinta, notas ----------
const Tape: React.FC<{ x: number; y: number; rot: number; w?: number }> = ({ x, y, rot, w = 120 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: 38,
      background: "rgba(245, 236, 210, 0.82)",
      transform: `rotate(${rot}deg)`,
      clipPath: "polygon(0 8%, 6% 0, 12% 10%, 18% 0, 82% 0, 88% 10%, 94% 0, 100% 8%, 100% 92%, 94% 100%, 88% 90%, 82% 100%, 18% 100%, 12% 90%, 6% 100%, 0 92%)",
      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
    }}
  />
);

const Scrap: React.FC<{
  at: number;
  outAt: number;
  x: number;
  y: number;
  rot: number;
  bg: string;
  seed: number;
  children: React.ReactNode;
  tape?: boolean;
  pad?: string;
}> = ({ at, outAt, x, y, rot, bg, seed, children, tape = true, pad = "22px 34px" }) => {
  const { t, frame, fps, boil } = useT();
  if (t < at || t > outAt + 0.3) return null;
  const p = springAt(frame, fps, at, 9);
  const out = interpolate(t, [outAt, outAt + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = rot + jitter(boil, seed, 0.8) + (1 - p) * -18 + out * 12;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateY(${out * 80}px) scale(${1.15 * (0.4 + 0.6 * p) * (1 - out * 0.3)}) rotate(${r}deg)`,
        transformOrigin: "left top",
        opacity: Math.min(1, p * 2) * (1 - out),
        filter: "drop-shadow(4px 8px 0 rgba(0,0,0,0.28))",
      }}
    >
      <div style={{ background: bg, padding: pad, clipPath: tornPolygon(seed), position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, filter: "url(#paper)", background: "#fff", opacity: 0.35, mixBlendMode: "multiply" }} />
        <div style={{ position: "relative" }}>{children}</div>
      </div>
      {tape && <Tape x={-30} y={-14} rot={-24} />}
    </div>
  );
};

const Sticker: React.FC<{ at: number; outAt: number; x: number; y: number; rot?: number; size?: number; children: React.ReactNode }> = ({
  at, outAt, x, y, rot = 0, size = 220, children,
}) => {
  const { t, frame, fps, boil } = useT();
  if (t < at || t > outAt + 0.3) return null;
  const p = springAt(frame, fps, at, 8);
  const out = interpolate(t, [outAt, outAt + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "48% 52% 45% 55%",
        background: C.cream,
        boxShadow: "6px 10px 0 rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${p * (1 - out)}) rotate(${rot + jitter(boil, x, 2) + (1 - p) * 30}deg)`,
      }}
    >
      {children}
    </div>
  );
};

const InlineDoodle: React.FC<{ d: string[]; vb: string; w: number; h: number; at: number; color?: string; stroke?: number }> = ({
  d, vb, w, h, at, color = C.ink, stroke = 7,
}) => {
  const { t } = useT();
  const p = draw(t, at, 0.6);
  return (
    <svg width={w} height={h} viewBox={vb} style={{ overflow: "visible", filter: "url(#rough)" }}>
      {d.map((pd, i) => (
        <path key={i} d={pd} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, Math.max(0, p * d.length - i))} />
      ))}
    </svg>
  );
};

// ---------- widgets específicos ----------
const RobotNote: React.FC = () => {
  const { t } = useT();
  const text = "Estimado usuario: como modelo de lenguaje, me complace informarle que…";
  const n = Math.floor(interpolate(t, [1.94, 2.65], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const cross = draw(t, 2.7, 0.35);
  return (
    <Scrap at={1.85} outAt={3.3} x={70} y={1330} rot={-4} bg="#fbfaf6" seed={11}>
      <div style={{ width: 560, fontFamily: "'Courier New', monospace", fontSize: 38, color: "#333", lineHeight: 1.3 }}>
        {text.slice(0, n)}
        <span style={{ opacity: t % 0.5 < 0.25 ? 1 : 0 }}>▌</span>
      </div>
      <svg width="620" height="140" viewBox="0 0 400 130" style={{ position: "absolute", left: -10, top: 0, overflow: "visible" }}>
        <path d={SCRIBBLE} fill="none" stroke={C.red} strokeWidth={9} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - cross} style={{ filter: "url(#rough)" }} />
      </svg>
    </Scrap>
  );
};

const Stamp: React.FC<{ at: number; outAt: number }> = ({ at, outAt }) => {
  const { t, frame, fps } = useT();
  if (t < at || t > outAt + 0.3) return null;
  const p = spring({ frame: frame - at * fps, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  const out = interpolate(t, [outAt, outAt + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 500,
        top: 1370,
        transform: `rotate(-14deg) scale(${interpolate(p, [0, 1], [2.6, 1])})`,
        opacity: Math.min(1, p * 3) * out,
        border: `10px solid ${C.red}`,
        borderRadius: 20,
        padding: "6px 30px",
        color: C.red,
        fontFamily: MARKER,
        fontSize: 110,
        letterSpacing: 4,
        background: "rgba(243, 233, 212, 0.92)",
        boxShadow: "6px 10px 0 rgba(0,0,0,0.3)",
        maskImage: "radial-gradient(circle at 30% 40%, #000 65%, rgba(0,0,0,0.75) 100%)",
      }}
    >
      GRATIS
    </div>
  );
};

const DmBubble: React.FC = () => {
  const { t } = useT();
  const word = "BIBLIOTECA";
  const n = Math.floor(interpolate(t, [18.0, 18.7], [0, word.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Scrap at={17.85} outAt={20.55} x={90} y={1290} rot={3} bg={C.cream} seed={77} pad="26px 36px">
      <div style={{ fontFamily: HAND, fontSize: 40, color: C.ink, fontWeight: 700 }}>escríbeme por mensaje:</div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <div style={{ background: C.orange, color: "white", fontFamily: MARKER, fontSize: 58, padding: "12px 30px", borderRadius: "34px 34px 6px 34px", minWidth: 380, textAlign: "center" }}>
          {word.slice(0, n) || " "}
        </div>
      </div>
      <div style={{ fontFamily: HAND, fontSize: 38, color: C.ink, fontWeight: 700, marginTop: 10, opacity: t >= 19.56 ? 1 : 0 }}>
        → y te comparto el acceso ✶
      </div>
    </Scrap>
  );
};

const Signature: React.FC<{ at: number }> = ({ at }) => {
  const { t, boil } = useT();
  if (t < at) return null;
  const p = draw(t, at, 0.7);
  return (
    <div
      style={{
        position: "absolute",
        top: 1410,
        width: "100%",
        textAlign: "center",
        fontFamily: MARKER,
        fontSize: 120,
        color: C.ink,
        transform: `rotate(${-6 + jitter(boil, 5, 0.6)}deg)`,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        textShadow: `4px 4px 0 ${C.yellow}`,
      }}
    >
      Pablo Knauth
    </div>
  );
};

// ---------- cámara ----------
const PUNCHES: [number, number][] = [[2.7, 0.06], [3.46, 0.07], [9.2, 0.06], [13.04, 0.1], [16.3, 0.08], [21.08, 0.08]];
const RESETS = [0, 3.333, 7.4, 11.1, 13.96, 17.42];
const zoomAt = (t: number) => {
  const r0 = RESETS.reduce((a, r) => (t >= r ? r : a), 0);
  let z = 1 + 0.03 * Math.min(1, (t - r0) / 3.5);
  for (const [tp, a] of PUNCHES) if (tp >= r0 && t >= tp) z += a * Easing.out(Easing.cubic)(Math.min(1, (t - tp) / 0.18));
  return z;
};

// ---------- texto gigante detrás de Pablo ----------
const BehindTitle: React.FC = () => {
  const { t, boil } = useT();
  const p = draw(t, 3.46, 0.5);
  const out = interpolate(t, [4.85, 5.1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (t < 3.46 || t > 5.15) return null;
  return (
    <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", opacity: out }}>
      {["PABLO", "KNAUTH"].map((w, i) => (
        <div
          key={w}
          style={{
            fontFamily: MARKER,
            fontSize: 205,
            lineHeight: 0.92,
            color: i === 0 ? C.cream : C.ink,
            WebkitTextStroke: i === 0 ? `6px ${C.ink}` : undefined,
            transform: `rotate(${-5 + i * 3 + jitter(boil, i, 0.5)}deg) translateX(${(1 - p) * (i ? 300 : -300)}px)`,
            opacity: p,
          }}
        >
          {w}
        </div>
      ))}
    </div>
  );
};

// corona que sigue la cabeza (posición medida del recorte)
const HEAD = head as { top: number[]; cx: number[] };
const Crown: React.FC = () => {
  const { frame, t, boil } = useT();
  if (t < 5.0 || t > 7.15) return null;
  const i = Math.min(frame, HEAD.top.length - 1);
  const z = zoomAt(t);
  const cx = 540 + (HEAD.cx[i] - 540) * z;
  const top = 1920 * 0.42 + (HEAD.top[i] - 1920 * 0.42) * z;
  const p = draw(t, 5.0, 0.5);
  return (
    <svg width="240" height="210" viewBox="0 0 110 100" style={{ position: "absolute", left: cx - 120, top: top - 200, overflow: "visible", transform: `rotate(${-8 + jitter(boil, 9, 2)}deg)`, filter: "url(#rough) drop-shadow(0 3px 0 rgba(0,0,0,0.35))" }}>
      {CROWN.map((d, k) => (
        <path key={k} d={d} fill="none" stroke={C.yellow} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, p * 2 - k)} />
      ))}
    </svg>
  );
};

// ---------- subtítulos en tira de papel ----------
const Captions: React.FC = () => {
  const { t, frame, fps, boil } = useT();
  const pageIdx = PAGES.findIndex(([a, b], i) => {
    const start = WORDS[a][0];
    const nextStart = i + 1 < PAGES.length ? WORDS[PAGES[i + 1][0]][0] : 99;
    return t >= start && t < Math.min(WORDS[b - 1][1] + 0.3, nextStart);
  });
  if (pageIdx < 0) return null;
  const [a, b] = PAGES[pageIdx];
  const pin = springAt(frame, fps, WORDS[a][0], 12);
  return (
    <div style={{ position: "absolute", bottom: 150, width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: C.cream,
          clipPath: tornPolygon(pageIdx * 7 + 3, 3),
          padding: "14px 40px 18px",
          transform: `rotate(${(pageIdx % 2 ? 1.5 : -1.5) + jitter(boil, pageIdx, 0.4)}deg) scale(${0.85 + 0.15 * pin})`,
          opacity: Math.min(1, pin * 2),
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 900,
          filter: "drop-shadow(4px 6px 0 rgba(0,0,0,0.3))",
        }}
      >
        {WORDS.slice(a, b).map(([s, , w], k) => {
          const active = t >= s && (a + k + 1 >= b || t < WORDS[a + k + 1][0]);
          return (
            <span key={k} style={{ position: "relative", fontFamily: MARKER, fontSize: 70, color: C.ink, opacity: t >= s ? 1 : 0.35, textTransform: "uppercase" }}>
              {active && (
                <span style={{ position: "absolute", left: -8, right: -8, top: "38%", height: "52%", background: C.yellow, borderRadius: 8, transform: "rotate(-2deg)", zIndex: -1 }} />
              )}
              <span style={{ position: "relative" }}>{w}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const PabloKnauth: React.FC<{ cutout?: string }> = ({ cutout = "pablo_cutout.webm" }) => {
  const { t } = useT();
  const z = zoomAt(t);
  return (
    <AbsoluteFill style={{ background: C.orange }}>
      <Filters />
      <AbsoluteFill style={{ transform: `scale(${1 + (z - 1) * 0.35})` }}>
        <Waves />
        <Doodle d={STAR} at={0.2} x={70} y={260} w={110} h={110} vb="0 0 100 100" rot={-12} />
        <Doodle d={STAR} at={0.5} x={880} y={420} w={130} h={130} vb="0 0 100 100" rot={10} />
        <Doodle d={SPARK} at={0.8} x={900} y={150} w={60} h={60} vb="0 0 40 40" stroke={5} />
        <Doodle d={SPARK} at={1.1} x={110} y={880} w={50} h={50} vb="0 0 40 40" stroke={5} />
      </AbsoluteFill>

      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 42%" }}>
        <BehindTitle />
        <OffthreadVideo src={staticFile(cutout)} transparent muted />
      </AbsoluteFill>

      {/* 0–3.3 s: IA que suena a robot */}
      <RobotNote />
      <Sticker at={2.7} outAt={3.3} x={810} y={1300} rot={8} size={230}>
        <InlineDoodle d={ROBOT} vb="0 0 160 140" w={170} h={150} at={2.7} />
      </Sticker>

      {/* 3.3–7.2 s: Pablo + IA con tu voz */}
      <Crown />
      <Scrap at={4.56} outAt={7.2} x={50} y={1360} rot={-6} bg={C.yellow} seed={21}>
        <div style={{ fontFamily: MARKER, fontSize: 62, color: C.ink }}>la IA trabaja</div>
        <div style={{ fontFamily: HAND, fontSize: 46, fontWeight: 700, color: C.ink }}>para tu marca personal</div>
      </Scrap>
      <Scrap at={6.12} outAt={7.2} x={660} y={1300} rot={7} bg={C.cream} seed={23}>
        <div style={{ fontFamily: HAND, fontSize: 52, fontWeight: 700, color: C.ink }}>tu voz, intacta ✓</div>
      </Scrap>
      <Doodle d={UNDERLINE} at={6.4} outAt={7.2} x={680} y={1420} w={320} h={40} vb="0 0 300 30" color={C.red} stroke={8} />

      {/* 7.4–10.8 s: prompts, skills y guías para Claude */}
      <Scrap at={7.82} outAt={10.8} x={70} y={130} rot={-7} bg={C.pink} seed={31}>
        <div style={{ fontFamily: MARKER, fontSize: 64, color: C.ink }}>PROMPTS</div>
      </Scrap>
      <Scrap at={8.38} outAt={10.8} x={600} y={110} rot={6} bg={C.yellow} seed={33}>
        <div style={{ fontFamily: MARKER, fontSize: 64, color: C.ink }}>SKILLS</div>
      </Scrap>
      <Scrap at={8.9} outAt={10.8} x={330} y={300} rot={-2} bg={C.cream} seed={35}>
        <div style={{ fontFamily: MARKER, fontSize: 64, color: C.ink }}>GUÍAS</div>
      </Scrap>
      <Doodle d={ARROW} at={9.2} outAt={10.8} x={380} y={1330} w={190} h={100} vb="0 0 180 90" color={C.ink} stroke={7} rot={160} />
      <Scrap at={9.2} outAt={10.8} x={580} y={1350} rot={-4} bg={C.cream} seed={37} tape={false}>
        <div style={{ fontFamily: HAND, fontSize: 54, fontWeight: 700, color: C.ink }}>
          para <span style={{ fontFamily: MARKER, color: C.orange }}>Claude</span>
        </div>
        <div style={{ fontFamily: HAND, fontSize: 36, fontWeight: 700, color: C.ink, opacity: 0.8 }}>(los que yo uso)</div>
      </Scrap>

      {/* 11.1–13.7 s: cuerpo de Logan */}
      <Sticker at={12.2} outAt={13.75} x={70} y={1330} rot={-10} size={250}>
        <InlineDoodle d={BICEP} vb="0 0 190 170" w={190} h={170} at={12.2} />
      </Sticker>
      <Scrap at={13.04} outAt={13.75} x={520} y={1380} rot={5} bg={C.yellow} seed={41} tape={false}>
        <div style={{ fontFamily: MARKER, fontSize: 70, color: C.ink }}>¿sí? en serio.</div>
      </Scrap>
      <Doodle d={STAR} at={12.45} outAt={13.75} x={350} y={1290} w={80} h={80} vb="0 0 100 100" />

      {/* 13.96–17.3 s: biblioteca gratis */}
      <Sticker at={14.22} outAt={17.3} x={80} y={1320} rot={-6} size={260}>
        <InlineDoodle d={BOOKS} vb="0 0 190 170" w={190} h={170} at={14.22} />
      </Sticker>
      <Scrap at={14.3} outAt={17.3} x={130} y={140} rot={-3} bg={C.cream} seed={51}>
        <div style={{ fontFamily: HAND, fontSize: 46, fontWeight: 700, color: C.ink }}>una biblioteca con</div>
        <div style={{ fontFamily: MARKER, fontSize: 60, color: C.ink }}>prompts · skills · guías</div>
      </Scrap>
      <Stamp at={16.3} outAt={17.3} />

      {/* 17.4–21.97 s: CTA y firma */}
      <Scrap at={17.42} outAt={20.55} x={620} y={160} rot={6} bg={C.yellow} seed={61}>
        <div style={{ fontFamily: MARKER, fontSize: 70, color: C.ink }}>¡SÍGUEME!</div>
      </Scrap>
      <DmBubble />
      <Signature at={20.6} />
      <Doodle d={STAR} at={20.95} x={900} y={1330} w={90} h={90} vb="0 0 100 100" />
      <Doodle d={SPARK} at={21.1} x={90} y={1380} w={60} h={60} vb="0 0 40 40" stroke={5} />

      <Captions />
    </AbsoluteFill>
  );
};
