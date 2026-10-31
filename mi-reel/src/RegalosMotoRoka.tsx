import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile } from "remotion";
import { BLUE, BLUE_SOFT, Float, FONT, glass, Icon, Kicker, springAt, useT } from "./MotoRokaServicio";

// Moto Roka · guía de regalos por presupuesto — mismo sistema visual que MotoRokaServicio.
// La iluminación del clip no se toca: solo zoom y gráficos encima.
const GOLD = "#ffc24a";
// Vidrio más denso para tarjetas que caen sobre ropa clara (legibilidad)
const DENSE = "rgba(10, 14, 40, 0.66)";

// Transcripción verificada con el usuario (precios y frase final confirmados)
const WORDS: [number, number, string][] = [
  [0.0, 0.54, "¿No"], [0.54, 0.76, "sabes"], [0.76, 0.96, "qué"], [0.96, 1.44, "regalarle"], [1.44, 1.48, "a"],
  [1.48, 1.64, "alguien"], [1.64, 1.84, "que"], [1.84, 2.02, "ama"], [2.02, 2.2, "su"], [2.2, 2.6, "moto?"],
  [3.0, 3.1, "Te"], [3.1, 3.22, "lo"], [3.22, 3.56, "resuelvo"], [3.56, 3.72, "con"], [3.72, 3.9, "estos"],
  [3.9, 4.18, "tres"], [4.18, 4.9, "presupuestos."], [5.18, 5.28, "Si"], [5.28, 5.5, "quieres"], [5.5, 5.82, "gastar"],
  [5.82, 6.2, "poco,"], [6.66, 6.92, "guantes"], [6.92, 7.34, "desde"], [7.34, 7.92, "$350"], [7.92, 8.38, "pesos."],
  [8.8, 8.98, "Si"], [8.98, 9.26, "quieres"], [9.26, 9.56, "quedar"], [9.56, 9.9, "bien,"], [10.08, 10.3, "tenemos"],
  [10.3, 10.68, "cascos"], [10.68, 10.96, "desde"], [10.96, 11.8, "$999."], [14.04, 14.56, "Y"], [14.56, 14.64, "si"],
  [14.64, 14.76, "te"], [14.76, 14.96, "quieres"], [14.96, 15.4, "lucir,"], [15.66, 15.92, "tenemos"], [15.92, 16.2, "esta"],
  [16.2, 16.68, "chamarra"], [16.68, 16.82, "desde"], [16.82, 17.26, "$1,600"], [17.26, 17.82, "pesos."], [18.0, 18.08, "Y"],
  [18.08, 18.44, "recuerda"], [18.44, 18.58, "que"], [18.58, 18.68, "si"], [18.68, 18.78, "eres"], [18.78, 19.24, "estudiante"],
  [19.24, 19.5, "tienes"], [19.5, 19.72, "hasta"], [19.72, 19.9, "un"], [19.9, 20.44, "10%"], [20.44, 20.68, "de"],
  [20.68, 20.98, "descuento"], [20.98, 21.12, "en"], [21.12, 21.34, "productos"], [21.34, 21.56, "de"],
  [21.56, 22.1, "seguridad."], [22.52, 23.0, "Escríbenos"], [23.0, 23.32, "«REGALO»"], [23.32, 23.54, "y"], [23.54, 23.64, "te"],
  [23.64, 23.72, "lo"], [23.72, 24.3, "apartamos."], [24.64, 24.84, "Así"], [24.84, 25.0, "que"], [25.0, 25.1, "ya"],
  [25.1, 25.18, "no hay"], [25.18, 25.54, "excusa…"], [25.54, 25.76, "¿por"], [25.76, 26.2, "qué?"],
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

// ---------- cámara: empuje lento por escena + acercamientos que se mantienen ----------
const SCENES: [number, string][] = [
  [0, "50% 30%"], [5.233, "50% 40%"], [8.767, "50% 32%"], [14.133, "50% 40%"], [18.033, "50% 36%"], [22.367, "50% 33%"],
];
const PUNCHES: [number, number][] = [[3.9, 0.06], [7.34, 0.1], [10.96, 0.1], [16.82, 0.12], [19.9, 0.1], [23.0, 0.08], [25.18, 0.1]];
const END = 26.23;

const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useT();
  const si = SCENES.reduce((acc, [s], i) => (t >= s ? i : acc), 0);
  const s0 = SCENES[si][0];
  const s1 = si + 1 < SCENES.length ? SCENES[si + 1][0] : END;
  let z = 1 + 0.04 * Math.min(1, (t - s0) / (s1 - s0));
  for (const [tp, a] of PUNCHES) {
    if (tp >= s0 && tp < s1 && t >= tp) z += a * Easing.out(Easing.cubic)(Math.min(1, (t - tp) / 0.2));
  }
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: SCENES[si][1] }}>{children}</AbsoluteFill>
  );
};

// ---------- iconos ----------
const GiftIcon: React.FC<{ lift?: number }> = ({ lift = 0 }) => (
  <svg width="96" height="96" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
    <rect width="64" height="64" rx="18" fill={BLUE} />
    <rect x="14" y="30" width="36" height="22" rx="3" fill="white" />
    <rect x="29" y="30" width="6" height="22" fill={GOLD} />
    <g transform={`translate(0 ${-lift}) rotate(${-lift * 1.5} 14 24)`}>
      <rect x="11" y="21" width="42" height="10" rx="3" fill="white" />
      <rect x="29" y="21" width="6" height="10" fill={GOLD} />
      <path d="M32 21c-4-8-13-8-11-2 1 3 7 3 11 2zm0 0c4-8 13-8 11-2-1 3-7 3-11 2z" fill={GOLD} />
    </g>
  </svg>
);
const GlovePath = () => (
  <path d="M22 50V30l-4-6c-1-2 2-4 3-2l3 4V14c0-3 4-3 4 0v10-13c0-3 4-3 4 0v13-11c0-3 4-3 4 0v11-8c0-3 4-3 4 0v20c0 8-4 14-10 14z" fill="white" />
);
const HelmetPath = () => (
  <g>
    <path d="M10 38c0-13 9.5-22 22-22s22 8 22 20v6H36l-6 6H14c-2.5 0-4-1.8-4-4z" fill="white" />
    <rect x="30" y="29" width="25" height="9" rx="4.5" fill="#111" opacity="0.8" />
  </g>
);
const JacketPath = () => (
  <path d="M24 12h16l12 8-4 12-5-3v23H21V29l-5 3-4-12zm8 2v34" fill="white" stroke="#111" strokeWidth="0" />
);
const CapPath = () => (
  <g>
    <path d="M32 16 8 27l24 11 24-11z" fill="white" />
    <path d="M18 32v9c0 4 6.5 7 14 7s14-3 14-7v-9l-14 6.5z" fill="white" />
  </g>
);

// ---------- widgets ----------
const TIERS = [
  { sign: "$", label: "Gastar poco", color: BLUE_SOFT },
  { sign: "$$", label: "Quedar bien", color: "#4f6bff" },
  { sign: "$$$", label: "Lucirte", color: GOLD },
];

const HookCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const lift = Math.max(0, Math.sin(t * 5)) * 6;
  return (
    <div style={{ ...glass, background: DENSE, padding: "26px 32px", width: 680 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <GiftIcon lift={lift} />
        <div>
          <Kicker>GUÍA DE REGALOS</Kicker>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1 }}>para quien ama su moto</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
        {TIERS.map((tier, i) => {
          const p = springAt(frame, fps, 3.9 + i * 0.12, 10);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "12px 0",
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
                border: `2px solid ${tier.color}`,
                opacity: t >= 3.9 + i * 0.12 ? Math.min(1, p * 1.5) : 0,
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            >
              <div style={{ fontSize: 34, fontWeight: 900, color: tier.color }}>{tier.sign}</div>
              <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.9 }}>{tier.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PriceCard: React.FC<{ tier: number; product: string; price: number; priceAt: number; icon: React.ReactNode }> = ({
  tier,
  product,
  price,
  priceAt,
  icon,
}) => {
  const { t, frame, fps } = useT();
  const { sign, label, color } = TIERS[tier];
  const v = interpolate(t, [priceAt, priceAt + 0.6], [0, price], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const shown = t >= priceAt;
  const pp = shown ? springAt(frame, fps, priceAt, 9) : 0;
  const glow = shown ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
  return (
    <div style={{ ...glass, background: DENSE, padding: "26px 32px", width: 680, border: `2px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Kicker color={color}>{`PRESUPUESTO ${tier + 1}`}</Kicker>
        <div style={{ fontSize: 34, fontWeight: 900, color, letterSpacing: 2 }}>
          {sign}
          <span style={{ opacity: 0.25 }}>{"$$$".slice(sign.length)}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 16 }}>
        <Icon bg={color} size={92}>
          {icon}
        </Icon>
        <div>
          <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.05 }}>{product}</div>
          <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.85, marginBottom: 2 }}>{`para ${label.toLowerCase()}`}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, opacity: shown ? 1 : 0.35 }}>
            <span style={{ fontSize: 28, fontWeight: 700, opacity: 0.8 }}>desde</span>
            <span
              style={{
                fontSize: 86,
                fontWeight: 900,
                letterSpacing: -2,
                color: tier === 2 ? GOLD : "white",
                transform: `scale(${0.85 + 0.15 * pp})`,
                display: "inline-block",
                textShadow: `0 0 ${10 + glow * 18}px ${color}`,
              }}
            >
              ${Math.round(v).toLocaleString("en-US")}
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, opacity: 0.8 }}>MXN</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const count = interpolate(t, [19.9, 20.5], [0, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const R = 70;
  const C = 2 * Math.PI * R;
  const prod = t >= 21.12 ? springAt(frame, fps, 21.12, 11) : 0;
  return (
    <div style={{ ...glass, padding: "26px 32px", width: 680, display: "flex", alignItems: "center", gap: 28 }}>
      <svg width="170" height="170" viewBox="0 0 170 170" style={{ flexShrink: 0 }}>
        <circle cx="85" cy="85" r={R} stroke="rgba(255,255,255,0.15)" strokeWidth="14" fill="none" />
        <circle cx="85" cy="85" r={R} stroke={BLUE_SOFT} strokeWidth="14" fill="none" strokeLinecap="round"
          strokeDasharray={`${(C * count) / 10} ${C}`} transform="rotate(-90 85 85)"
          style={{ filter: `drop-shadow(0 0 10px ${BLUE})` }} />
        <g transform="translate(53 53) scale(1)">
          <CapPath />
        </g>
      </svg>
      <div>
        <Kicker>SI ERES ESTUDIANTE</Kicker>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, opacity: t >= 19.5 ? 1 : 0.35 }}>
          <span style={{ fontSize: 30, fontWeight: 800 }}>HASTA</span>
          <span style={{ fontSize: 96, fontWeight: 900, color: BLUE_SOFT, letterSpacing: -3, lineHeight: 1 }}>{Math.round(count)}%</span>
        </div>
        <div style={{ fontSize: 40, fontWeight: 900 }}>DE DESCUENTO</div>
        <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.85 * prod, transform: `translateY(${(1 - prod) * 12}px)` }}>
          en productos de seguridad
        </div>
      </div>
    </div>
  );
};

const ChatWidget: React.FC = () => {
  const { t, frame, fps } = useT();
  const typed = "REGALO";
  const nChars = Math.floor(interpolate(t, [22.7, 22.98], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sent = t >= 23.0;
  const sp = sent ? springAt(frame, fps, 23.0, 11) : 0;
  const typing = t >= 23.25 && t < 23.72;
  const reply = t >= 23.72 ? springAt(frame, fps, 23.72, 11) : 0;
  const bubble: React.CSSProperties = { padding: "16px 26px", borderRadius: 28, fontSize: 38, fontWeight: 800, maxWidth: 460 };
  return (
    <div style={{ ...glass, background: DENSE, padding: 26, width: 600 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ width: 58, height: 58, borderRadius: 29, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 26 }}>
          MR
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>Moto Roka</div>
          <div style={{ fontSize: 22, opacity: 0.7 }}>{typing ? "escribiendo…" : "en línea"}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, minHeight: 200 }}>
        {sent ? (
          <div style={{ ...bubble, alignSelf: "flex-end", background: BLUE, transform: `scale(${0.7 + 0.3 * sp})`, transformOrigin: "right bottom" }}>
            REGALO
          </div>
        ) : (
          <div style={{ ...bubble, alignSelf: "stretch", background: "rgba(255,255,255,0.12)", fontWeight: 600, maxWidth: "none" }}>
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
        {t >= 23.72 && (
          <div style={{ ...bubble, alignSelf: "flex-start", background: "rgba(255,255,255,0.92)", color: "#111", transform: `scale(${0.7 + 0.3 * reply})`, transformOrigin: "left bottom" }}>
            ¡Te lo apartamos! ✓
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
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: BLUE,
        color: "white",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 50,
        padding: "16px 40px 16px 18px",
        borderRadius: 999,
        boxShadow: `0 0 40px ${BLUE}, 0 18px 40px rgba(0,0,0,0.4)`,
        transform: `scale(${pulse})`,
        whiteSpace: "nowrap",
      }}
    >
      <GiftIcon lift={Math.max(0, Math.sin(t * 6)) * 6} />
      ESCRÍBENOS «REGALO»
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
        const isPrice = w.startsWith("$") || w === "10%";
        return (
          <span
            key={k}
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 76,
              textTransform: "uppercase",
              color: isPrice && !active ? GOLD : "white",
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

export const RegalosMotoRoka: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Camera>
        <OffthreadVideo src={staticFile("regalos.mp4")} style={{ width: "100%", height: "100%" }} />
      </Camera>

      <Float inAt={0.96} outAt={5.0} x={200} y={1060} from="bottom">
        <HookCard />
      </Float>
      <Float inAt={5.5} outAt={8.6} x={200} y={1230} from="left" phase={0.4}>
        <PriceCard tier={0} product="Guantes" price={350} priceAt={7.34} icon={<GlovePath />} />
      </Float>
      <Float inAt={9.26} outAt={13.9} x={40} y={1030} from="left" phase={1.2}>
        <PriceCard tier={1} product="Cascos" price={999} priceAt={10.96} icon={<HelmetPath />} />
      </Float>
      <Float inAt={14.96} outAt={17.85} x={200} y={110} from="top" phase={2}>
        <PriceCard tier={2} product="Chamarra" price={1600} priceAt={16.82} icon={<JacketPath />} />
      </Float>
      <Float inAt={18.78} outAt={22.2} x={200} y={90} from="top" phase={0.8}>
        <StudentCard />
      </Float>
      <Float inAt={22.52} outAt={24.45} x={40} y={1060} from="left" phase={2.4}>
        <ChatWidget />
      </Float>
      <Float inAt={24.64} outAt={27} x={150} y={1250} from="bottom" phase={0.9}>
        <FinalCta />
      </Float>

      <Captions />
    </AbsoluteFill>
  );
};
