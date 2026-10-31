import React from "react";
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

// Moto Roka · servicio — widgets de vidrio, cámara dinámica y subtítulos palabra por palabra.
// La iluminación del clip no se toca: solo zoom/movimiento y gráficos encima.
const BLUE = "#2f45e0";
const BLUE_SOFT = "#7d8cff";
const AMBER = "#ffb020";
const RED = "#ff4d4f";
const FONT = "Inter, sans-serif";

// Transcripción corregida [inicio, fin, palabra]
const WORDS: [number, number, string][] = [
  [0.0, 0.72, "¿Hace"], [0.72, 1.06, "cuánto"], [1.06, 1.2, "no"], [1.2, 1.3, "le"], [1.3, 1.62, "cambias"],
  [1.62, 1.78, "el"], [1.78, 1.98, "aceite"], [1.98, 2.18, "a"], [2.18, 2.28, "tu"], [2.28, 2.9, "moto?"],
  [3.16, 3.36, "Te"], [3.36, 3.72, "pregunto"], [3.72, 3.98, "porque"], [3.98, 4.18, "una"], [4.18, 4.42, "moto"],
  [4.42, 4.62, "no"], [4.62, 5.0, "avisa,"], [5.12, 5.22, "un"], [5.22, 5.34, "día"], [5.34, 5.7, "simplemente"],
  [5.7, 6.3, "falla."], [6.58, 6.66, "Y"], [6.66, 6.86, "casi"], [6.86, 7.2, "siempre"], [7.2, 7.54, "empieza"],
  [7.54, 7.76, "por"], [7.76, 7.86, "lo"], [7.86, 8.04, "más"], [8.04, 8.6, "sencillo:"], [8.82, 9.18, "aceite"],
  [9.18, 9.7, "viejo,"], [9.92, 10.24, "cadena"], [10.24, 10.6, "floja"], [10.72, 11.0, "o"], [11.0, 11.34, "balatas"],
  [11.34, 12.1, "desgastadas."], [12.4, 12.64, "Aquí"], [12.64, 12.74, "en"], [12.74, 12.9, "Moto"],
  [12.9, 13.12, "Roka"], [13.12, 13.34, "somos"], [13.34, 13.68, "un"], [13.68, 13.96, "centro"], [13.96, 14.16, "de"],
  [14.16, 14.46, "servicio"], [14.46, 15.1, "oficial"], [15.1, 15.88, "QJ Motor."], [16.18, 16.4, "En"],
  [16.4, 16.6, "cada"], [16.6, 17.0, "servicio"], [17.0, 17.5, "cambiamos"], [17.5, 17.74, "el"], [17.74, 18.04, "aceite"],
  [18.04, 18.7, "y"], [18.7, 19.28, "revisamos"], [19.28, 20.02, "cadenas,"], [20.02, 20.3, "frenos"], [20.3, 20.46, "y"],
  [20.46, 21.0, "llantas."], [21.2, 21.34, "Te"], [21.34, 21.7, "entregamos"], [21.7, 21.88, "tu"], [21.88, 22.15, "moto"],
  [22.15, 22.42, "lista"], [22.42, 22.66, "para"], [22.66, 23.2, "rodar."], [23.42, 23.98, "Escríbenos"],
  [23.98, 24.3, "«SERVICIO»"], [24.3, 24.56, "por"], [24.56, 25.08, "mensaje"], [25.08, 25.36, "y"], [25.36, 25.5, "te"],
  [25.5, 25.86, "daremos"], [25.86, 26.06, "tu"], [26.06, 26.38, "cita."], [26.38, 27.02, "Entonces,"], [27.02, 27.6, "dime…"],
];

// Páginas de subtítulos [desde, hasta): se cortan en puntuación, en pausas o cada 4 palabras
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

const glass: React.CSSProperties = {
  background: "rgba(10, 14, 40, 0.42)",
  backdropFilter: "blur(22px) saturate(1.5)",
  WebkitBackdropFilter: "blur(22px) saturate(1.5)",
  border: "1.5px solid rgba(255, 255, 255, 0.24)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28)",
  borderRadius: 36,
  color: "white",
  fontFamily: FONT,
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};

const springAt = (frame: number, fps: number, at: number, damping = 12) =>
  spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 130, mass: 0.8 } });

// ---------- cámara ----------
const CAM_T = [0, 2.3, 5.6, 5.78, 6.5, 7.4, 8.6, 12.7, 12.95, 15.9, 16.6, 20.9, 22.6, 22.8, 23.3, 23.8, 26.9, 27.1, 27.93];
const CAM_Z = [1.0, 1.1, 1.1, 1.23, 1.2, 1.05, 1.0, 1.0, 1.16, 1.16, 1.0, 1.04, 1.04, 1.13, 1.13, 1.0, 1.0, 1.17, 1.19];

const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useT();
  const z = interpolate(t, CAM_T, CAM_Z, {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
  });
  // sacudida en "falla"
  const shakeK = t > 5.7 && t < 6.4 ? (1 - (t - 5.7) / 0.7) : 0;
  const sx = Math.sin(t * 90) * 14 * shakeK;
  const sy = Math.cos(t * 77) * 10 * shakeK;
  const rot = Math.sin(t * 60) * 0.8 * shakeK;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${sx}px, ${sy}px) scale(${z}) rotate(${rot}deg)`,
        transformOrigin: "50% 42%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------- contenedor flotante ----------
const Float: React.FC<{
  inAt: number;
  outAt: number;
  x: number;
  y: number;
  from?: "left" | "right" | "top" | "bottom";
  phase?: number;
  width?: number;
  shine?: boolean;
  children: React.ReactNode;
}> = ({ inAt, outAt, x, y, from = "bottom", phase = 0, width, shine: withShine = true, children }) => {
  const { t, frame, fps } = useT();
  if (t < inAt - 0.01 || t > outAt + 0.4) return null;
  const pin = springAt(frame, fps, inAt);
  const pout = interpolate(t, [outAt, outAt + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p = pin * (1 - pout);
  const off = (1 - pin) * 150 + pout * 60;
  const dx = from === "left" ? -off : from === "right" ? off : 0;
  const dy = from === "top" ? -off : from === "bottom" ? off : 0;
  const bob = Math.sin(t * 2.0 + phase) * 9;
  const tilt = Math.sin(t * 1.5 + phase) * 1.0;
  // brillo que barre el vidrio al entrar
  const shine = interpolate(t, [inAt + 0.15, inAt + 0.9], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        opacity: Math.min(1, p * 1.6),
        transform: `translate(${dx}px, ${dy + bob}px) scale(${0.86 + 0.14 * p}) rotate(${tilt}deg)`,
      }}
    >
      <div style={{ position: "relative", overflow: withShine ? "hidden" : "visible", borderRadius: 36 }}>
        {children}
        {withShine && <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(105deg, transparent ${shine - 30}%, rgba(255,255,255,0.28) ${shine}%, transparent ${shine + 30}%)`,
          }}
        />}
      </div>
    </div>
  );
};

const Kicker: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = BLUE_SOFT, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 800, letterSpacing: 3, color }}>
    <span style={{ width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 12px ${color}` }} />
    {children}
  </div>
);

// ---------- iconos ----------
const Icon: React.FC<{ bg: string; children: React.ReactNode; size?: number }> = ({ bg, children, size = 76 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
    <rect width="64" height="64" rx="18" fill={bg} />
    {children}
  </svg>
);
const DropPath = () => <path d="M32 12c7 10 13 17 13 25a13 13 0 0 1-26 0c0-8 6-15 13-25z" fill="white" />;
const ChainPath = () => (
  <g fill="none" stroke="white" strokeWidth="5">
    <rect x="10" y="24" width="24" height="16" rx="8" />
    <rect x="30" y="24" width="24" height="16" rx="8" />
  </g>
);
const BrakePath = () => (
  <g fill="none" stroke="white" strokeWidth="5">
    <circle cx="32" cy="32" r="17" />
    <circle cx="32" cy="32" r="5" fill="white" />
    <path d="M14 20a22 22 0 0 1 10-8" strokeLinecap="round" />
  </g>
);
const TirePath = () => (
  <g fill="none" stroke="white" strokeWidth="6">
    <circle cx="32" cy="32" r="18" />
    <circle cx="32" cy="32" r="7" strokeWidth="4" />
  </g>
);
const WarnPath = () => (
  <g>
    <path d="M32 12 54 50H10z" fill="white" />
    <rect x="29.5" y="25" width="5" height="14" rx="2" fill="#111" />
    <circle cx="32" cy="44" r="3" fill="#111" />
  </g>
);

// ---------- widgets ----------
const OilGauge: React.FC = () => {
  const { t } = useT();
  const level = interpolate(t, [2.0, 4.2], [0.82, 0.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const low = level < 0.3;
  const blink = low ? 0.55 + 0.45 * Math.sin(t * 14) : 1;
  const col = low ? RED : level < 0.5 ? AMBER : BLUE_SOFT;
  return (
    <div style={{ ...glass, display: "flex", alignItems: "center", gap: 24, padding: "26px 32px", width: 600 }}>
      <Icon bg={col}>
        <DropPath />
      </Icon>
      <div style={{ flex: 1 }}>
        <Kicker color={col}>NIVEL DE ACEITE</Kicker>
        <div style={{ marginTop: 14, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
          <div style={{ width: `${level * 100}%`, height: "100%", borderRadius: 11, background: col, boxShadow: `0 0 16px ${col}` }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 38, fontWeight: 900, opacity: blink }}>{low ? "BAJO" : "Revisando…"}</div>
      </div>
    </div>
  );
};

const AlertWidget: React.FC = () => {
  const { t } = useT();
  const failed = t >= 5.7;
  const col = failed ? RED : AMBER;
  const jitter = failed && t < 6.3 ? Math.sin(t * 80) * 6 : 0;
  return (
    <div style={{ ...glass, display: "flex", alignItems: "center", gap: 22, padding: "24px 34px 24px 24px", width: 640, transform: `translateX(${jitter}px)` }}>
      <Icon bg={col}>
        <WarnPath />
      </Icon>
      <div>
        <Kicker color={col}>{failed ? "ALERTA" : "AVISO"}</Kicker>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1 }}>
          {failed ? "Falla inesperada" : "Tu moto no avisa"}
        </div>
      </div>
    </div>
  );
};

const ProblemChip: React.FC<{ at: number; label: string; icon: React.ReactNode; y: number }> = ({ at, label, icon, y }) => {
  const { t, frame, fps } = useT();
  if (t < at) return null;
  const p = springAt(frame, fps, at, 10);
  return (
    <div
      style={{
        ...glass,
        position: "absolute",
        top: y,
        left: 0,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "18px 30px 18px 18px",
        transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`,
        transformOrigin: "left center",
        opacity: Math.min(1, p * 1.5),
        whiteSpace: "nowrap",
      }}
    >
      <Icon bg={AMBER} size={66}>
        {icon}
      </Icon>
      <div style={{ fontSize: 40, fontWeight: 900 }}>{label}</div>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill={RED} />
        <path d="M13 13l14 14M27 13 13 27" stroke="white" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const ProblemsStack: React.FC = () => (
  <div style={{ position: "relative", width: 620, height: 380 }}>
    <ProblemChip at={8.82} label="Aceite viejo" icon={<DropPath />} y={0} />
    <ProblemChip at={9.92} label="Cadena floja" icon={<ChainPath />} y={125} />
    <ProblemChip at={11.0} label="Balatas desgastadas" icon={<BrakePath />} y={250} />
  </div>
);

const OfficialBadge: React.FC = () => {
  const { t, frame, fps } = useT();
  const qj = springAt(frame, fps, 15.1, 10);
  return (
    <div style={{ ...glass, padding: "30px 40px", width: 720, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <Kicker>CENTRO DE SERVICIO OFICIAL</Kicker>
      <div style={{ fontSize: 92, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
        MOTO <span style={{ color: BLUE_SOFT }}>ROKA</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 8, opacity: 0.85 }}>FIX &amp; SHOP</div>
      <div
        style={{
          marginTop: 6,
          background: BLUE,
          borderRadius: 999,
          padding: "12px 30px",
          fontSize: 34,
          fontWeight: 900,
          opacity: t >= 15.1 ? Math.min(1, qj * 1.5) : 0,
          transform: `scale(${0.6 + 0.4 * qj})`,
          boxShadow: `0 0 24px ${BLUE}`,
        }}
      >
        ✓ SERVICIO OFICIAL QJ MOTOR
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ at: number; label: string; icon: React.ReactNode }> = ({ at, label, icon }) => {
  const { t, frame, fps } = useT();
  const done = t >= at;
  const p = done ? springAt(frame, fps, at, 9) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 0", opacity: done ? 1 : 0.55 }}>
      <Icon bg={done ? BLUE : "rgba(255,255,255,0.18)"} size={62}>
        {icon}
      </Icon>
      <div style={{ flex: 1, fontSize: 40, fontWeight: 800 }}>{label}</div>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r="24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
        <circle cx="27" cy="27" r="24" fill={BLUE} opacity={p} transform={`scale(${p})`} style={{ transformOrigin: "27px 27px" }} />
        <path d="M16 28l8 8 15-17" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="40" strokeDashoffset={40 * (1 - p)} />
      </svg>
    </div>
  );
};

const ServiceChecklist: React.FC = () => (
  <div style={{ ...glass, padding: "28px 34px", width: 560 }}>
    <Kicker>EN CADA SERVICIO</Kicker>
    <div style={{ height: 10 }} />
    <CheckItem at={17.74} label="Cambio de aceite" icon={<DropPath />} />
    <CheckItem at={19.28} label="Cadenas" icon={<ChainPath />} />
    <CheckItem at={20.02} label="Frenos" icon={<BrakePath />} />
    <CheckItem at={20.46} label="Llantas" icon={<TirePath />} />
  </div>
);

const ReadyWidget: React.FC = () => {
  const { t } = useT();
  const p = interpolate(t, [21.4, 22.66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ready = p >= 0.999;
  return (
    <div style={{ ...glass, padding: "26px 34px", width: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Kicker color={ready ? "#4ade80" : BLUE_SOFT}>{ready ? "LISTA PARA RODAR" : "PREPARANDO TU MOTO"}</Kicker>
        <div style={{ fontSize: 40, fontWeight: 900 }}>{Math.round(p * 100)}%</div>
      </div>
      <div style={{ marginTop: 16, height: 24, borderRadius: 12, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div
          style={{
            width: `${p * 100}%`,
            height: "100%",
            borderRadius: 12,
            background: ready ? "#4ade80" : `linear-gradient(90deg, ${BLUE}, ${BLUE_SOFT})`,
            boxShadow: `0 0 18px ${ready ? "#4ade80" : BLUE}`,
          }}
        />
      </div>
    </div>
  );
};

const ChatWidget: React.FC = () => {
  const { t, frame, fps } = useT();
  const typed = "SERVICIO";
  const nChars = Math.floor(interpolate(t, [23.6, 24.2], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sent = t >= 24.3;
  const sp = sent ? springAt(frame, fps, 24.3, 11) : 0;
  const typing = t >= 24.7 && t < 25.5;
  const reply = t >= 25.5 ? springAt(frame, fps, 25.5, 11) : 0;
  const bubble: React.CSSProperties = { padding: "16px 26px", borderRadius: 28, fontSize: 38, fontWeight: 800, maxWidth: 460 };
  return (
    <div style={{ ...glass, padding: 26, width: 600 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ width: 58, height: 58, borderRadius: 29, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 26 }}>
          MR
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>Moto Roka</div>
          <div style={{ fontSize: 22, opacity: 0.7 }}>{typing ? "escribiendo…" : "en línea"}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, minHeight: 210 }}>
        {sent ? (
          <div style={{ ...bubble, alignSelf: "flex-end", background: BLUE, transform: `scale(${0.7 + 0.3 * sp})`, transformOrigin: "right bottom" }}>
            SERVICIO
          </div>
        ) : (
          <div style={{ ...bubble, alignSelf: "stretch", background: "rgba(255,255,255,0.12)", fontWeight: 600, opacity: 0.9, maxWidth: "none" }}>
            {typed.slice(0, nChars)}
            <span style={{ opacity: Math.sin(t * 12) > 0 ? 1 : 0 }}>|</span>
          </div>
        )}
        {typing && (
          <div style={{ ...bubble, alignSelf: "flex-start", background: "rgba(255,255,255,0.18)", display: "flex", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "white", opacity: 0.4 + 0.6 * Math.max(0, Math.sin(t * 10 - i)) }} />
            ))}
          </div>
        )}
        {t >= 25.5 && (
          <div style={{ ...bubble, alignSelf: "flex-start", background: "rgba(255,255,255,0.92)", color: "#111", transform: `scale(${0.7 + 0.3 * reply})`, transformOrigin: "left bottom" }}>
            ¡Te damos tu cita! ✓
          </div>
        )}
      </div>
    </div>
  );
};

const FinalCta: React.FC = () => {
  const { t } = useT();
  const pulse = 1 + 0.04 * Math.sin(t * 7);
  return (
    <div
      style={{
        background: BLUE,
        color: "white",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 52,
        padding: "24px 44px",
        borderRadius: 999,
        boxShadow: `0 0 40px ${BLUE}, 0 18px 40px rgba(0,0,0,0.4)`,
        transform: `scale(${pulse})`,
        whiteSpace: "nowrap",
      }}
    >
      ESCRÍBENOS «SERVICIO» →
    </div>
  );
};

// ---------- subtítulos ----------
const Captions: React.FC = () => {
  const { t, frame, fps } = useT();
  const pageIdx = PAGES.findIndex(([a, b], i) => {
    const start = WORDS[a][0];
    const nextStart = i + 1 < PAGES.length ? WORDS[PAGES[i + 1][0]][0] : 99;
    const end = Math.min(WORDS[b - 1][1] + 0.35, nextStart);
    return t >= start && t < end;
  });
  if (pageIdx < 0) return null;
  const [a, b] = PAGES[pageIdx];
  const pageIn = springAt(frame, fps, WORDS[a][0], 14);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "6px 18px",
        padding: "0 70px",
        boxSizing: "border-box",
        transform: `translateY(${(1 - pageIn) * 30}px) scale(${0.92 + 0.08 * pageIn})`,
        opacity: Math.min(1, pageIn * 2),
      }}
    >
      {WORDS.slice(a, b).map(([s, , w], k) => {
        const active = t >= s && (k + a + 1 >= b || t < WORDS[a + k + 1][0]);
        const ap = active ? springAt(frame, fps, s, 10) : 0;
        return (
          <span
            key={k}
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 76,
              textTransform: "uppercase",
              color: "white",
              padding: "2px 14px",
              borderRadius: 16,
              background: active ? BLUE : "transparent",
              transform: `scale(${1 + 0.08 * ap})`,
              display: "inline-block",
              opacity: t >= s ? 1 : 0.7,
              textShadow: "0 3px 0 rgba(0,0,0,0.85), 0 8px 22px rgba(0,0,0,0.6)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const MotoRokaServicio: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Camera>
        <OffthreadVideo src={staticFile("roka.mp4")} style={{ width: "100%", height: "100%" }} />
      </Camera>

      <Float inAt={1.78} outAt={4.5} x={240} y={90} from="top">
        <OilGauge />
      </Float>
      <Float inAt={4.62} outAt={8.3} x={220} y={110} from="top" phase={1}>
        <AlertWidget />
      </Float>
      <Float inAt={8.7} outAt={12.2} x={40} y={1040} from="left" phase={2} shine={false}>
        <ProblemsStack />
      </Float>
      <Float inAt={12.74} outAt={16.0} x={180} y={70} from="top" phase={0.5}>
        <OfficialBadge />
      </Float>
      <Float inAt={16.4} outAt={21.0} x={40} y={1000} from="left" phase={1.7}>
        <ServiceChecklist />
      </Float>
      <Float inAt={21.2} outAt={23.3} x={220} y={110} from="top" phase={0.3}>
        <ReadyWidget />
      </Float>
      <Float inAt={23.42} outAt={26.4} x={240} y={70} from="right" phase={2.4}>
        <ChatWidget />
      </Float>
      <Float inAt={26.38} outAt={28.5} x={150} y={150} from="top" phase={0.9}>
        <FinalCta />
      </Float>

      <Captions />
    </AbsoluteFill>
  );
};
