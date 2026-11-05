import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile } from "remotion";
import { Float, FONT, Icon, Kicker, springAt, useT } from "./MotoRokaServicio";
import { Big, CalendarPath, CHAR, Cta, GREEN, OR, OR_SOFT, WarehousePath } from "./BodegaRenta";
import runner from "./runner_track.json";

// "¿Tu negocio te está quedando chico?" — estilo BodegaRenta + gag: se va corriendo al fondo de la nave y regresa.
// Widgets cómicos solo en la carrera, el regreso y el final (él diminuto a lo lejos).
const RED = "#ff3b3b";
const END = 43.36;
const RUN = runner as { valid: boolean[]; cx: number[]; top: number[]; bot: number[] };
const at = (frame: number) => {
  const i = Math.min(frame, RUN.cx.length - 1);
  return { ok: RUN.valid[i], cx: RUN.cx[i], top: RUN.top[i], bot: RUN.bot[i] };
};

const WORDS: [number, number, string][] = [
  [0.0, 0.68, "¿Tu"], [0.68, 0.98, "negocio"], [0.98, 1.1, "te"], [1.1, 1.2, "está"], [1.2, 1.44, "quedando"], [1.44, 2.0, "chico?"],
  [17.08, 17.5, "¡Ah,"], [17.54, 17.7, "la"], [17.7, 17.88, "verdad,"], [17.92, 18.18, "está"], [18.18, 18.8, "grande!"],
  [19.74, 20.34, "Cuando"], [20.34, 20.94, "empieces"], [20.94, 21.02, "a"], [21.02, 21.18, "poner"], [21.18, 21.48, "cajas"],
  [21.48, 21.62, "donde"], [21.62, 22.2, "trabajas,"], [22.36, 22.8, "mercancía en"], [22.8, 23.2, "pasillos"], [23.26, 23.52, "o"],
  [23.52, 24.02, "inventarios"], [24.02, 24.2, "donde"], [24.2, 24.58, "encuentras"], [24.58, 25.2, "espacio,"], [25.54, 25.68, "el"],
  [25.68, 25.98, "problema"], [25.98, 26.28, "ya"], [26.28, 26.38, "no"], [26.38, 26.46, "es"], [26.46, 26.7, "solamente"],
  [26.7, 26.92, "el"], [26.92, 27.2, "desorden."], [27.2, 28.18, "Tu"], [28.18, 28.46, "operación"], [28.46, 28.56, "te"],
  [28.56, 28.7, "está"], [28.7, 28.96, "diciendo"], [28.96, 29.24, "que"], [29.24, 29.66, "necesitas"], [29.66, 30.3, "crecer,"],
  [30.72, 31.4, "y"], [31.4, 31.74, "quizás"], [31.74, 32.08, "no"], [32.08, 32.4, "necesitas"], [32.4, 32.64, "cambiar"],
  [32.64, 32.8, "tu"], [32.8, 33.08, "negocio"], [33.08, 33.7, "completo,"], [33.9, 34.16, "simplemente"], [34.16, 35.06, "necesitas"],
  [35.06, 35.28, "darle"], [35.28, 35.62, "un"], [35.62, 35.88, "lugar"], [35.88, 36.02, "a"], [36.02, 36.14, "todo"],
  [36.14, 36.3, "lo"], [36.3, 36.42, "que"], [36.42, 36.52, "ya"], [36.52, 37.1, "construiste."], [37.56, 37.9, "Esta"],
  [37.9, 38.2, "bodega"], [38.2, 38.34, "está"], [38.34, 38.46, "en"], [38.46, 39.0, "renta,"], [39.28, 39.38, "si"],
  [39.38, 39.48, "tu"], [39.48, 39.8, "negocio"], [39.8, 40.0, "pide"], [40.0, 40.16, "más"], [40.16, 40.8, "espacio,"],
  [41.02, 41.62, "contáctanos"], [41.62, 41.92, "y"], [41.92, 42.0, "te"], [42.0, 42.22, "daremos"], [42.22, 42.9, "información."],
];
const PAGES: [number, number][] = (() => {
  const pages: [number, number][] = [];
  let start = 0;
  WORDS.forEach(([, end, w], i) => {
    const next = WORDS[i + 1];
    const pause = next ? next[0] - end > 0.25 : true;
    if (/[.,:?…]$/.test(w) || pause || i - start === 3) {
      pages.push([start, i + 1]);
      start = i + 1;
    }
  });
  return pages;
})();

// ---------- cámara: zoom "detective" hacia el corredor diminuto, Ken Burns en las tomas vacías ----------
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, frame } = useT();
  let z: number, ox = 540, oy = 1056;
  if (t < 20.667) {
    z = interpolate(t, [0, 3, 9, 13.85, 14.15, 15.8, 16.4, 20.6], [1, 1.03, 1.05, 1.05, 1.4, 1.42, 1.0, 1.04], {
      easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp",
    });
    const r = at(frame);
    if (t > 9 && t < 16.6 && r.ok) { ox = r.cx; oy = (r.top + r.bot) / 2; }  // acercarse a donde está él
  } else if (t < 37.533) {
    z = 1 + 0.08 * Easing.inOut(Easing.quad)((t - 20.667) / (37.533 - 20.667));
  } else {
    z = 1 + 0.04 * Math.min(1, (t - 37.533) / 5.8);
  }
  return <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</AbsoluteFill>;
};

// ---------- gag: mira que lo sigue (va dentro de la cámara para moverse con el zoom) ----------
const Tracker: React.FC<{ from: number; to: number; label: string }> = ({ from, to, label }) => {
  const { t, frame, fps } = useT();
  if (t < from || t > to) return null;
  const r = at(frame);
  if (!r.ok) return null;
  const p = springAt(frame, fps, from, 10);
  const h = Math.max(70, r.bot - r.top), w = Math.max(50, h * 0.55), pad = 22;
  const x0 = r.cx - w / 2 - pad, y0 = r.top - pad, W = w + 2 * pad, H = h + 2 * pad;
  const blink = 0.6 + 0.4 * Math.sin(t * 10);
  const L = Math.min(28, W / 3);
  const corner = (x: number, y: number, dx: number, dy: number) => `M${x + dx * L},${y} L${x},${y} L${x},${y + dy * L}`;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
        {[corner(x0, y0, 1, 1), corner(x0 + W, y0, -1, 1), corner(x0, y0 + H, 1, -1), corner(x0 + W, y0 + H, -1, -1)].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={OR} strokeWidth={6} strokeLinecap="round" opacity={blink} />
        ))}
      </svg>
      <div style={{
        position: "absolute", left: r.cx, top: y0 - 74, transform: `translateX(-50%) scale(${p})`,
        background: OR, color: "white", fontFamily: FONT, fontWeight: 900, fontSize: 34, padding: "6px 18px",
        borderRadius: 14, whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
      }}>{label}</div>
    </>
  );
};

const Magnifier: React.FC = () => {
  const { t, frame, fps } = useT();
  if (t < 14.0 || t > 15.95) return null;
  const r = at(frame);
  if (!r.ok) return null;
  const p = springAt(frame, fps, 14.0, 9);
  const cy = (r.top + r.bot) / 2, R = Math.max(80, (r.bot - r.top) * 1.1);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g transform={`translate(${r.cx} ${cy}) scale(${p})`}>
        <circle r={R} fill="none" stroke="white" strokeWidth={10} />
        <circle r={R} fill="none" stroke={OR} strokeWidth={4} />
        <path d={`M${R * 0.7},${R * 0.7} L${R * 1.6},${R * 1.6}`} stroke="white" strokeWidth={16} strokeLinecap="round" />
        <path d={`M${R * 0.7},${R * 0.7} L${R * 1.6},${R * 1.6}`} stroke={OR} strokeWidth={8} strokeLinecap="round" />
      </g>
    </svg>
  );
};

const SweatDrops: React.FC = () => {
  const { t, frame } = useT();
  if (t < 17.6 || t > 20.6) return null;
  const r = at(frame);
  if (!r.ok) return null;
  const h = r.bot - r.top, headY = r.top + h * 0.06, side = h * 0.14;
  const drop = (x: number, y: number, s: number) => `M${x},${y} C ${x - 12 * s},${y + 20 * s} ${x - 10 * s},${y + 36 * s} ${x},${y + 36 * s} C ${x + 10 * s},${y + 36 * s} ${x + 12 * s},${y + 20 * s} ${x},${y} Z`;
  const s = Math.max(0.8, h / 600);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {[-1, 1].map((sd, k) => {
        const fall = ((t * 1.6 + k * 0.5) % 1) * 60 * s;
        return <path key={sd} d={drop(r.cx + sd * side, headY + fall, s * 1.4)} fill="#d9f1ff" stroke="#1a1a1a" strokeWidth={3} opacity={1 - ((t * 1.6 + k * 0.5) % 1) * 0.6} />;
      })}
      {[0, 1, 2].map((k) => {
        const q = ((t * 1.2 + k / 3) % 1);
        return <circle key={k} cx={r.cx + 40 * s + q * 90 * s} cy={headY + h * 0.12 - q * 40 * s} r={(10 + q * 18) * s} fill="white" opacity={0.75 * (1 - q)} />;
      })}
    </svg>
  );
};

// ---------- widgets ----------
const CapacityHook: React.FC = () => {
  const { t } = useT();
  const fill = interpolate(t, [0.7, 1.8], [0.2, 1.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const over = fill > 1;
  const shake = over ? Math.sin(t * 60) * 3 : 0;
  return (
    <div style={{ ...CHAR, padding: "28px 34px", width: 720, transform: `translateX(${shake}px)` }}>
      <Kicker color={over ? RED : OR}>{over ? "¡SIN ESPACIO!" : "CAPACIDAD DE TU NEGOCIO"}</Kicker>
      <div style={{ marginTop: 18, height: 54, borderRadius: 27, background: "rgba(255,255,255,0.14)", position: "relative", overflow: "visible" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 54, borderRadius: 27, width: `${Math.min(fill, 1) * 100}%`, background: over ? RED : OR, boxShadow: `0 0 20px ${over ? RED : OR}` }} />
        {over && <div style={{ position: "absolute", left: "98%", top: 6, height: 42, borderRadius: 21, width: `${(fill - 1) * 100}%`, background: RED, opacity: 0.85 }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 30, fontWeight: 800, opacity: 0.85 }}>
        <span>📦 📦 📦</span><span style={{ color: over ? RED : "white" }}>{over ? "LLENO" : "…"}</span>
      </div>
    </div>
  );
};

const STATUS: [number, string][] = [
  [3.8, "corriendo…"], [7.0, "sigue corriendo…"], [10.0, "¿todavía no llega al fondo?"], [12.2, "📡 señal débil…"],
  [14.0, "¡ahí está! 🔍"], [16.2, "¡ya viene de regreso!"],
];
const MeasuringCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const done = t >= 17.2;
  const prog = done ? 1 : interpolate(t, [3.8, 16.6], [0, 0.88], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const steps = Math.floor(Math.max(0, Math.min(t, 19.6) - 3.2) * 2.8);
  const msg = STATUS.reduce((m, [s, txt]) => (t >= s ? txt : m), STATUS[0][1]);
  const dp = done ? springAt(frame, fps, 17.2, 9) : 0;
  return (
    <div style={{ ...CHAR, padding: "26px 32px", width: 720, border: `2px solid ${done ? GREEN : OR}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Kicker color={done ? GREEN : OR}>{done ? "MEDICIÓN COMPLETA ✓" : "🏃 MIDIENDO LA BODEGA…"}</Kicker>
        <div style={{ fontSize: 28, fontWeight: 800, opacity: 0.85 }}>pasos: {steps}</div>
      </div>
      <div style={{ marginTop: 14, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
        <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 11, background: done ? GREEN : `repeating-linear-gradient(45deg, ${OR} 0 18px, ${OR_SOFT} 18px 36px)`, backgroundPositionX: `${t * 60}px` }} />
      </div>
      <div style={{ marginTop: 12, fontSize: 44, fontWeight: 900, minHeight: 56 }}>
        {done ? <span style={{ display: "inline-block", transform: `scale(${0.8 + 0.2 * dp})` }}>conclusión: ¡es <span style={{ color: OR }}>GRANDE</span>!</span> : msg}
      </div>
    </div>
  );
};

const Battery: React.FC = () => {
  const { t } = useT();
  const blink = Math.sin(t * 9) > 0 ? 1 : 0.35;
  return (
    <div style={{ ...CHAR, padding: "18px 26px", display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="96" height="48" viewBox="0 0 96 48">
        <rect x="3" y="3" width="80" height="42" rx="8" fill="none" stroke="white" strokeWidth="5" />
        <rect x="85" y="15" width="8" height="18" rx="3" fill="white" />
        <rect x="9" y="9" width="8" height="30" rx="3" fill={RED} opacity={blink} />
      </svg>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: RED, opacity: blink }}>BATERÍA BAJA</div>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>3% 😮‍💨</div>
      </div>
    </div>
  );
};

const Banner: React.FC<{ text: string }> = ({ text }) => {
  const { t } = useT();
  return (
    <div style={{ background: OR, color: "white", fontFamily: FONT, fontWeight: 900, fontSize: 84, padding: "10px 40px", borderRadius: 24, transform: `rotate(${-4 + Math.sin(t * 8) * 1.5}deg)`, boxShadow: "0 14px 34px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

const BoxPath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5" strokeLinejoin="round">
    <path d="M10 22l22-10 22 10v24L32 56 10 46z" /><path d="M10 22l22 10 22-10M32 32v24" />
  </g>
);
const AislePath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5"><path d="M12 54V12M52 54V12M12 24h12M12 38h12M40 24h12M40 38h12" /><path d="M28 54l4-8 4 8" /></g>
);
const StackPath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5" strokeLinejoin="round"><rect x="14" y="38" width="36" height="14" rx="2" /><rect x="18" y="24" width="28" height="14" rx="2" /><rect x="22" y="10" width="20" height="14" rx="2" /></g>
);

const SignsCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const rows: [number, string, React.ReactNode][] = [
    [21.18, "Cajas donde trabajas", <BoxPath key="b" />],
    [22.36, "Mercancía en pasillos", <AislePath key="a" />],
    [23.52, "Inventario donde cabe", <StackPath key="s" />],
  ];
  const sp = t >= 26.46 ? springAt(frame, fps, 26.46, 12) : 0;
  return (
    <div style={{ ...CHAR, padding: "28px 34px", width: 720, position: "relative" }}>
      <Kicker color={OR}>SEÑALES DE QUE YA NO CABES</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
        {rows.map(([s, label, icon]) => {
          const p = t >= s ? springAt(frame, fps, s, 9) : 0;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 20, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * -60}px)` }}>
              <Icon bg={OR} size={78}>{icon}</Icon>
              <div style={{ flex: 1, fontSize: 42, fontWeight: 800 }}>{label}</div>
              <div style={{ width: 50, height: 50, borderRadius: 25, background: RED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900 }}>!</div>
            </div>
          );
        })}
      </div>
      {sp > 0 && (
        <div style={{
          position: "absolute", left: "50%", top: "52%", transform: `translate(-50%,-50%) rotate(-10deg) scale(${interpolate(sp, [0, 1], [2.4, 1])})`,
          opacity: Math.min(1, sp * 3), border: `8px solid ${OR}`, borderRadius: 18, padding: "8px 26px", background: "rgba(22,22,24,0.85)",
          color: OR, fontFamily: FONT, fontWeight: 900, fontSize: 58, whiteSpace: "nowrap",
        }}>NO ES SOLO DESORDEN</div>
      )}
    </div>
  );
};

const GrowCard: React.FC = () => {
  const { t } = useT();
  const p = interpolate(t, [28.2, 29.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const line = "M30 230 L150 200 L250 210 L360 150 L470 120 L600 40";
  return (
    <div style={{ ...CHAR, padding: "28px 34px", width: 720 }}>
      <Kicker color={OR}>TU OPERACIÓN TE DICE:</Kicker>
      <svg width="652" height="260" viewBox="0 0 652 260" style={{ marginTop: 12 }}>
        {[60, 120, 180, 240].map((y) => <path key={y} d={`M0 ${y} H652`} stroke="rgba(255,255,255,0.08)" strokeWidth="2" />)}
        <path d={line} fill="none" stroke={OR} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
        <path d="M570 40 L605 37 L598 72" fill="none" stroke={OR} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity={p > 0.95 ? 1 : 0} />
      </svg>
      <div style={{ fontSize: 70, fontWeight: 900, opacity: t >= 29.66 ? 1 : 0.25 }}>NECESITAS <span style={{ color: OR }}>CRECER</span></div>
    </div>
  );
};

const NotChangeCard: React.FC = () => {
  const { t } = useT();
  const strike = interpolate(t, [32.4, 33.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ ...CHAR, padding: "30px 36px", width: 720 }}>
      <Kicker color={OR_SOFT}>QUIZÁS NO HACE FALTA…</Kicker>
      <div style={{ position: "relative", fontSize: 50, fontWeight: 900, marginTop: 10, whiteSpace: "nowrap", display: "inline-block" }}>
        cambiar todo tu negocio
        <span style={{ position: "absolute", left: -6, top: "54%", height: 9, borderRadius: 5, background: RED, width: `${strike * 104}%` }} />
      </div>
      <div style={{ fontSize: 44, fontWeight: 900, color: RED, marginTop: 6, opacity: strike }}>✗ no es necesario</div>
    </div>
  );
};

const PlaceCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const boxes = [0, 1, 2, 3];
  const done = t >= 36.52;
  const dp = done ? springAt(frame, fps, 36.52, 9) : 0;
  return (
    <div style={{ ...CHAR, padding: "28px 34px", width: 720, border: `2px solid ${done ? GREEN : OR}` }}>
      <Kicker color={done ? GREEN : OR}>SOLO NECESITAS</Kicker>
      <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>un lugar para <span style={{ color: OR }}>todo</span> lo que construiste</div>
      <div style={{ position: "relative", height: 190, marginTop: 16 }}>
        <div style={{ position: "absolute", right: 30, top: 10 }}><Icon bg={OR} size={170}><WarehousePath /></Icon></div>
        {boxes.map((k) => {
          const s = 34.2 + k * 0.45;
          const q = interpolate(t, [s, s + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
          const x = 20 + k * 30 + q * (430 - k * 30), y = 100 - Math.sin(q * Math.PI) * 90 + q * -20;
          return <svg key={k} width="70" height="70" viewBox="0 0 64 64" style={{ position: "absolute", left: x, top: y, opacity: 1 - Math.max(0, q - 0.85) * 6 }}><rect width="64" height="64" rx="14" fill="#c98d55" /><BoxPath /></svg>;
        })}
        {done && <div style={{ position: "absolute", left: 10, top: 40, fontSize: 64, fontWeight: 900, color: GREEN, transform: `scale(${dp})` }}>✓</div>}
      </div>
    </div>
  );
};

const RentCard2: React.FC = () => (
  <div style={{ ...CHAR, padding: "30px 36px", width: 720, border: `2px solid ${OR}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <Icon bg={OR} size={120}><WarehousePath /></Icon>
      <div>
        <Kicker color={OR}>DISPONIBLE</Kicker>
        <div style={{ fontSize: 74, fontWeight: 900, lineHeight: 1 }}>BODEGA</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: OR, lineHeight: 1.1 }}>EN RENTA</div>
      </div>
    </div>
    <div style={{ marginTop: 18, fontSize: 36, fontWeight: 800, opacity: 0.9 }}>¿Tu negocio pide más espacio? 📦➡️🏭</div>
  </div>
);

const ChatInfo: React.FC = () => {
  const { t, frame, fps } = useT();
  const typed = "Quiero información";
  const n = Math.floor(interpolate(t, [40.9, 41.5], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sent = t >= 41.62;
  const sp = sent ? springAt(frame, fps, 41.62, 11) : 0;
  const typing = t >= 41.85 && t < 42.22;
  const rp = t >= 42.22 ? springAt(frame, fps, 42.22, 11) : 0;
  const bubble: React.CSSProperties = { padding: "16px 26px", borderRadius: 28, fontSize: 38, fontWeight: 800, maxWidth: 560 };
  return (
    <div style={{ ...CHAR, padding: 26, width: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <Icon bg={OR} size={64}><WarehousePath /></Icon>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>Bodega en renta</div>
          <div style={{ fontSize: 22, opacity: 0.7 }}>{typing ? "escribiendo…" : "en línea"}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, minHeight: 200 }}>
        {sent ? (
          <div style={{ ...bubble, alignSelf: "flex-end", background: OR, transform: `scale(${0.7 + 0.3 * sp})`, transformOrigin: "right bottom" }}>{typed}</div>
        ) : (
          <div style={{ ...bubble, alignSelf: "stretch", background: "rgba(255,255,255,0.12)", fontWeight: 600, maxWidth: "none" }}>
            {typed.slice(0, n)}<span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span>
          </div>
        )}
        {typing && (
          <div style={{ ...bubble, alignSelf: "flex-start", background: "rgba(255,255,255,0.18)", display: "flex", gap: 10 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "white", opacity: 0.4 + 0.6 * Math.max(0, Math.sin(t * 10 - i)) }} />)}
          </div>
        )}
        {t >= 42.22 && (
          <div style={{ ...bubble, alignSelf: "flex-start", background: "rgba(255,255,255,0.92)", color: "#111", display: "flex", alignItems: "center", gap: 12, transform: `scale(${0.7 + 0.3 * rp})`, transformOrigin: "left bottom" }}>
            <svg width="40" height="40" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill={OR} /><CalendarPath /></svg>
            ¡Te damos información! ✓
          </div>
        )}
      </div>
    </div>
  );
};

const Captions: React.FC = () => {
  const { t, frame, fps } = useT();
  const pageIdx = PAGES.findIndex(([a, b], i) => {
    const nextStart = i + 1 < PAGES.length ? WORDS[PAGES[i + 1][0]][0] : 99;
    return t >= WORDS[a][0] && t < Math.min(WORDS[b - 1][1] + 0.35, nextStart);
  });
  if (pageIdx < 0) return null;
  const [a, b] = PAGES[pageIdx];
  const pin = springAt(frame, fps, WORDS[a][0], 14);
  return (
    <div style={{
      position: "absolute", bottom: 120, width: "100%", display: "flex", justifyContent: "center", flexWrap: "wrap",
      gap: "6px 18px", padding: "0 70px", boxSizing: "border-box",
      transform: `translateY(${(1 - pin) * 30}px) scale(${0.92 + 0.08 * pin})`, opacity: Math.min(1, pin * 2),
    }}>
      {WORDS.slice(a, b).map(([s, , w], k) => {
        const active = t >= s && (a + k + 1 >= b || t < WORDS[a + k + 1][0]);
        const ap = active ? springAt(frame, fps, s, 10) : 0;
        return (
          <span key={k} style={{
            fontFamily: FONT, fontWeight: 900, fontSize: 76, textTransform: "uppercase", color: "white", padding: "2px 14px",
            borderRadius: 16, background: active ? OR : "transparent", transform: `scale(${1 + 0.08 * ap})`, display: "inline-block",
            opacity: t >= s ? 1 : 0.7, textShadow: "0 3px 0 rgba(0,0,0,0.85), 0 8px 22px rgba(0,0,0,0.6)",
          }}>{w}</span>
        );
      })}
    </div>
  );
};

const BIG_X = (1080 - 720 * 1.4) / 2;

export const BodegaChica: React.FC = () => {
  const { frame } = useT();
  const r = at(frame);
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Camera>
        <OffthreadVideo src={staticFile("bodega2.mp4")} style={{ width: "100%", height: "100%" }} />
        {/* gag: dentro de la cámara para acompañar el zoom */}
        <Tracker from={5.0} to={16.6} label="ÉL ↓" />
        <Magnifier />
        <SweatDrops />
        <Tracker from={37.9} to={END} label="📍 sigue aquí 👋" />
      </Camera>

      {/* 0–2 s: gancho */}
      <Float inAt={0.6} outAt={2.5} x={180} y={170} from="top"><CapacityHook /></Float>
      {/* 2.6 s: se da la vuelta */}
      {r.ok && (
        <Float inAt={2.6} outAt={3.9} x={Math.min(720, r.cx + 90)} y={Math.max(200, r.top - 40)} from="left">
          <div style={{ ...CHAR, padding: "14px 24px", borderRadius: 28, fontSize: 46, fontWeight: 900, whiteSpace: "nowrap" }}>¿A dónde vas? 😳</div>
        </Float>
      )}
      {/* 3.8–20.6 s: midiendo la bodega a pie */}
      <Float inAt={3.8} outAt={20.5} x={(1080 - 720 * 1.3) / 2} y={120} from="top" phase={0.6}><Big w={720} scale={1.3}><MeasuringCard /></Big></Float>
      <Float inAt={17.0} outAt={20.5} x={190} y={610} from="left" phase={1.4}><Banner text="¡YA VOLVIÓ!" /></Float>
      <Float inAt={18.0} outAt={20.5} x={560} y={800} from="right" phase={2.1}><Battery /></Float>

      {/* 20.7–37.5 s: tomas vacías, widgets grandes */}
      <Float inAt={20.9} outAt={27.15} x={BIG_X} y={330} from="bottom" phase={0.3}><Big w={720} scale={1.4}><SignsCard /></Big></Float>
      <Float inAt={27.25} outAt={30.6} x={BIG_X} y={380} from="bottom" phase={1.0}><Big w={720} scale={1.4}><GrowCard /></Big></Float>
      <Float inAt={30.75} outAt={33.8} x={BIG_X} y={480} from="bottom" phase={1.8}><Big w={720} scale={1.4}><NotChangeCard /></Big></Float>
      <Float inAt={33.9} outAt={37.45} x={BIG_X} y={380} from="bottom" phase={0.7}><Big w={720} scale={1.4}><PlaceCard /></Big></Float>

      {/* 37.5 s–fin: él diminuto al fondo; widgets grandes arriba */}
      <Float inAt={37.9} outAt={40.85} x={(1080 - 720 * 1.3) / 2} y={140} from="top" phase={0.4}><Big w={720} scale={1.3}><RentCard2 /></Big></Float>
      <Float inAt={40.9} outAt={END + 1} x={(1080 - 720 * 1.3) / 2} y={120} from="top" phase={1.1}><Big w={720} scale={1.3}><ChatInfo /></Big></Float>
      <Float inAt={42.3} outAt={END + 1} x={190} y={1470} from="bottom" phase={0.9}><Cta text="CONTÁCTANOS →" /></Float>

      <Captions />
    </AbsoluteFill>
  );
};
