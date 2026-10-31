import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Estilo 07 · Widgets flotantes — paneles de vidrio esmerilado, naranja y negro.
const ORANGE = "#ff7a00";
const FONT = "Inter, sans-serif";

// Momentos de la transcripción (segundos)
const T = { estudiante: 2.7, descuento: 4.3, productos: 5.02, seguridad: 5.48 };

const glass: React.CSSProperties = {
  background: "rgba(12, 12, 12, 0.42)",
  backdropFilter: "blur(22px) saturate(1.5)",
  WebkitBackdropFilter: "blur(22px) saturate(1.5)",
  border: "1.5px solid rgba(255, 255, 255, 0.22)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
  borderRadius: 40,
  color: "white",
  fontFamily: FONT,
};

const useEntrance = (atSec: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - atSec * fps, fps, config: { damping: 11, stiffness: 120, mass: 0.8 } });
  return { p, frame, fps };
};

const Floating: React.FC<{
  at: number;
  x: number;
  y: number;
  phase?: number;
  from?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
}> = ({ at, x, y, phase = 0, from = "bottom", children }) => {
  const { p, frame, fps } = useEntrance(at);
  if (p <= 0.001) return null;
  const t = frame / fps;
  const bob = Math.sin(t * 2.1 + phase) * 9;
  const tilt = Math.sin(t * 1.6 + phase) * 1.2;
  const off = (1 - p) * 140;
  const dx = from === "left" ? -off : from === "right" ? off : 0;
  const dy = from === "top" ? -off : from === "bottom" ? off : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: Math.min(1, p * 1.6),
        transform: `translate(${dx}px, ${dy + bob}px) scale(${0.85 + 0.15 * p}) rotate(${tilt}deg)`,
      }}
    >
      {children}
    </div>
  );
};

const CapIcon = () => (
  <svg width="74" height="74" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="18" fill={ORANGE} />
    <path d="M32 16 8 27l24 11 24-11z" fill="#111" />
    <path d="M18 32v9c0 4 6.5 7 14 7s14-3 14-7v-9l-14 6.5z" fill="#111" />
    <path d="M53 28v12" stroke="#111" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const HelmetIcon = () => (
  <svg width="74" height="74" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="18" fill={ORANGE} />
    <path d="M10 38c0-13 9.5-22 22-22s22 8 22 20v6H36l-6 6H14c-2.5 0-4-1.8-4-4z" fill="#111" />
    <rect x="30" y="29" width="25" height="9" rx="4.5" fill="#fff" opacity="0.85" />
  </svg>
);

const SmallWidget: React.FC<{ icon: React.ReactNode; kicker: string; title: string }> = ({
  icon,
  kicker,
  title,
}) => (
  <div style={{ ...glass, display: "flex", alignItems: "center", gap: 24, padding: "24px 34px 24px 24px" }}>
    {icon}
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: ORANGE, textTransform: "uppercase" }}>
        {kicker}
      </div>
      <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>{title}</div>
    </div>
  </div>
);

const DiscountWidget: React.FC = () => {
  const { p, frame, fps } = useEntrance(T.descuento);
  const count = interpolate(frame, [T.descuento * fps, (T.descuento + 0.7) * fps], [0, 10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const R = 86;
  const C = 2 * Math.PI * R;
  const ring = interpolate(count, [0, 10], [0, 1]);
  const glow = 0.5 + 0.5 * Math.sin((frame / fps) * 5);
  return (
    <div style={{ ...glass, width: 640, padding: "34px 40px", display: "flex", alignItems: "center", gap: 34 }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
        <circle cx="100" cy="100" r={R} stroke="rgba(255,255,255,0.15)" strokeWidth="16" fill="none" />
        <circle
          cx="100"
          cy="100"
          r={R}
          stroke={ORANGE}
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C * ring} ${C}`}
          transform="rotate(-90 100 100)"
          style={{ filter: `drop-shadow(0 0 ${6 + glow * 10}px ${ORANGE})` }}
        />
        <text x="100" y="116" textAnchor="middle" fill="white" fontFamily={FONT} fontWeight={900} fontSize="50">
          DTO.
        </text>
      </svg>
      <div style={{ opacity: Math.min(1, p * 1.4) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: ORANGE, boxShadow: `0 0 12px ${ORANGE}` }} />
          HASTA
        </div>
        <div style={{ fontSize: 112, fontWeight: 900, color: ORANGE, lineHeight: 1, letterSpacing: -3 }}>
          {Math.round(count)}%
        </div>
        <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: 1 }}>DESCUENTO</div>
      </div>
    </div>
  );
};

const BottomLabel: React.FC = () => {
  const { p } = useEntrance(T.seguridad);
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 170,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 60}px)`,
      }}
    >
      <div
        style={{
          background: ORANGE,
          color: "#0c0c0c",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 50,
          padding: "20px 44px",
          borderRadius: 999,
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
          letterSpacing: 0.5,
        }}
      >
        DESCUENTO PARA ESTUDIANTES
      </div>
    </div>
  );
};

export const WidgetsFlotantes: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <OffthreadVideo src={staticFile("clip.mp4")} />
      <Floating at={T.estudiante} x={48} y={1130} phase={0.6} from="left">
        <SmallWidget icon={<CapIcon />} kicker="Si eres" title="Estudiante" />
      </Floating>
      <Floating at={T.descuento} x={220} y={110} phase={0} from="top">
        <DiscountWidget />
      </Floating>
      <Floating at={T.productos} x={470} y={1330} phase={2.1} from="right">
        <SmallWidget icon={<HelmetIcon />} kicker="En productos" title="de seguridad" />
      </Floating>
      <BottomLabel />
    </AbsoluteFill>
  );
};
