import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile } from "remotion";
import { BLUE, BLUE_SOFT, Float, FONT, glass, Icon, Kicker, springAt, useT } from "./MotoRokaServicio";

// Moto Roka · "¿en manos de cualquiera?" — mismo sistema que MotoRokaServicio: vidrio, azul de la marca,
// cámara con acercamientos por escena y subtítulos palabra por palabra. Iluminación del clip intacta.
const RED = "#ff4d4f";
const GREEN = "#4ade80";
const GOLD = "#ffc24a";
const DENSE = "rgba(10, 14, 40, 0.62)";
const END = 34.97;

const WORDS: [number, number, string][] = [
  [0.0, 0.46, "¿Dejarías"], [0.46, 0.64, "tu"], [0.64, 0.78, "moto"], [0.78, 0.92, "en"], [0.92, 1.06, "manos"], [1.06, 1.26, "de"],
  [1.26, 1.9, "cualquiera?"], [2.28, 2.68, "Nosotros"], [2.68, 3.1, "tampoco."], [3.5, 3.64, "En"], [3.64, 3.82, "Moto"],
  [3.82, 4.1, "Roka"], [4.1, 4.4, "sabemos"], [4.4, 4.72, "que"], [4.72, 4.86, "tu"], [4.86, 5.6, "motocicleta"], [5.6, 5.92, "merece"],
  [5.92, 6.02, "un"], [6.02, 6.36, "servicio"], [6.36, 7.1, "profesional,"], [7.42, 7.54, "no"], [7.54, 7.72, "solo"], [7.72, 7.88, "un"],
  [7.88, 8.06, "cambio"], [8.06, 8.22, "de"], [8.22, 8.6, "aceite."], [8.84, 8.96, "Por"], [8.96, 9.1, "eso"], [9.1, 9.5, "contamos"],
  [9.5, 9.78, "con"], [9.78, 10.26, "personal"], [10.26, 11.14, "certificado"], [11.14, 11.26, "y"], [11.26, 11.94, "capacitado"],
  [11.94, 12.22, "para"], [12.22, 12.46, "darle"], [12.46, 12.62, "el"], [12.62, 12.84, "cuidado"], [12.84, 13.06, "que"],
  [13.06, 13.5, "necesita."], [14.08, 14.52, "Trabajamos"], [14.52, 14.74, "con"], [14.74, 15.2, "refacciones"], [15.2, 16.16, "originales"],
  [16.16, 16.36, "y"], [16.36, 16.66, "aceite"], [16.66, 16.9, "de"], [16.9, 17.02, "la"], [17.02, 17.24, "marca"], [17.24, 17.64, "Liqui"],
  [17.64, 18.0, "Moly."], [18.18, 18.32, "Y"], [18.32, 18.42, "lo"], [18.42, 18.9, "mejor,"], [19.04, 19.18, "nuestros"],
  [19.18, 19.58, "servicios"], [19.58, 20.1, "comienzan"], [20.1, 20.32, "desde"], [20.32, 20.58, "los"], [20.58, 21.58, "$499"],
  [21.58, 22.3, "pesos."], [22.48, 22.94, "Calidad,"], [22.94, 23.34, "experiencia"], [23.34, 23.92, "y"], [23.92, 24.26, "atención"],
  [24.26, 24.92, "profesional"], [24.92, 25.24, "para"], [25.24, 25.38, "que"], [25.38, 25.64, "vuelvas"], [25.64, 25.76, "a"],
  [25.76, 26.02, "rodar"], [26.02, 26.16, "con"], [26.16, 26.78, "confianza."], [26.78, 27.32, "Agenda"], [27.32, 27.46, "tu"],
  [27.46, 27.7, "servicio"], [27.7, 27.9, "en"], [27.9, 28.08, "Moto"], [28.08, 28.4, "Roka"], [28.4, 28.6, "Fix"], [28.6, 28.74, "&"],
  [28.74, 29.1, "Shop,"], [29.28, 29.5, "donde"], [29.5, 29.72, "tu"], [29.72, 29.96, "moto"], [29.96, 30.26, "queda"], [30.26, 30.4, "en"],
  [30.4, 30.58, "buenas"], [30.58, 31.1, "manos."], [31.48, 31.52, "Pero"], [31.52, 31.9, "dime,"], [32.12, 32.32, "¿hace"],
  [32.32, 32.72, "cuánto"], [32.72, 32.84, "no"], [32.84, 32.96, "le"], [32.96, 33.12, "das"], [33.12, 33.26, "a"], [33.26, 33.38, "tu"],
  [33.38, 33.62, "moto"], [33.62, 33.74, "el"], [33.74, 34.1, "servicio"], [34.1, 34.3, "que"], [34.3, 34.44, "se"], [34.44, 34.95, "merece?"],
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

// ---------- cámara: empuje suave por escena + golpes en palabras clave ----------
const CUTS = [0, 3.433, 8.7, 13.833, 18.167, 22.5, 26.967, 31.267];
const PUNCHES: [number, number][] = [[1.26, 0.06], [3.82, 0.07], [10.26, 0.06], [17.24, 0.07], [20.58, 0.1], [26.78, 0.06], [32.32, 0.08]];
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useT();
  const ci = CUTS.reduce((acc, c, i) => (t >= c ? i : acc), 0);
  const c0 = CUTS[ci], c1 = ci + 1 < CUTS.length ? CUTS[ci + 1] : END;
  let z = 1 + 0.035 * Math.min(1, (t - c0) / (c1 - c0));
  for (const [tp, a] of PUNCHES) if (tp >= c0 && tp < c1 && t >= tp) z += a * Easing.out(Easing.cubic)(Math.min(1, (t - tp) / 0.2));
  return <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "45% 38%" }}>{children}</AbsoluteFill>;
};

// ---------- iconos (viewBox 64) ----------
const HandPath = () => (
  <path d="M20 52V30l-4-6c-1-2 2-4 3-2l3 4V14c0-3 4-3 4 0v10-13c0-3 4-3 4 0v13-11c0-3 4-3 4 0v11-8c0-3 4-3 4 0v20c0 8-4 14-10 14z" fill="white" />
);
const MedalPath = () => (
  <g>
    <path d="M22 8l6 14M42 8l-6 14" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <circle cx="32" cy="38" r="16" fill="white" />
    <path d="M32 28l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill={BLUE} />
  </g>
);
const GearPath = () => (
  <g fill="white">
    <circle cx="32" cy="32" r="13" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="28" y="8" width="8" height="12" rx="2" transform={`rotate(${a} 32 32)`} />)}
    <circle cx="32" cy="32" r="6" fill={BLUE} />
  </g>
);
const DropPath = () => <path d="M32 10c7 10 14 18 14 26a14 14 0 0 1-28 0c0-8 7-16 14-26z" fill="white" />;
const StarPath = () => <path d="M32 10l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="white" />;
const WrenchPath = () => (
  <path d="M44 12a12 12 0 0 0-12 15L14 45a5 5 0 0 0 7 7l18-18a12 12 0 0 0 15-12l-7 7-6-2-2-6z" fill="white" />
);
const HeadsetPath = () => (
  <g fill="none" stroke="white" strokeWidth="5" strokeLinecap="round">
    <path d="M14 36v-6a18 18 0 0 1 36 0v6" /><rect x="10" y="34" width="10" height="14" rx="4" fill="white" /><rect x="44" y="34" width="10" height="14" rx="4" fill="white" />
    <path d="M50 48c0 6-6 8-12 8" />
  </g>
);
const CalPath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5"><rect x="12" y="16" width="40" height="36" rx="5" /><path d="M12 26h40M22 10v10M42 10v10" /></g>
);

// ---------- widgets ----------
const HandsCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const sp = t >= 2.28 ? springAt(frame, fps, 2.28, 13) : 0;
  return (
    <div style={{ ...glass, background: DENSE, padding: "26px 32px", width: 700 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Icon bg={BLUE} size={96}><HandPath /></Icon>
        <div>
          <Kicker>¿LO DEJARÍAS EN…</Kicker>
          <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.05 }}>manos de cualquiera?</div>
        </div>
      </div>
      {/* sello dentro de la tarjeta: el contenedor con brillo de Float recorta lo que sobresale */}
      <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 14 }}>
        {sp > 0 && (
          <div style={{
            transform: `rotate(-6deg) scale(${interpolate(sp, [0, 1], [2.2, 1])})`,
            opacity: Math.min(1, sp * 3), border: `8px solid ${RED}`, borderRadius: 18, padding: "4px 24px", background: "rgba(10,14,40,0.9)",
            color: RED, fontFamily: FONT, fontWeight: 900, fontSize: 52, whiteSpace: "nowrap",
          }}>✗ ¡NOSOTROS TAMPOCO!</div>
        )}
      </div>
    </div>
  );
};

const RokaCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const l1 = t >= 6.02 ? springAt(frame, fps, 6.02, 10) : 0;
  const l2 = t >= 7.42 ? springAt(frame, fps, 7.42, 10) : 0;
  return (
    <div style={{ ...glass, background: DENSE, padding: "28px 34px", width: 720 }}>
      <Kicker>SERVICIO EN</Kicker>
      <div style={{ fontSize: 90, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>MOTO <span style={{ color: BLUE_SOFT }}>ROKA</span></div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 8, opacity: 0.85 }}>FIX &amp; SHOP</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        <div style={{ fontSize: 42, fontWeight: 900, opacity: Math.min(1, l1 * 1.5), transform: `translateX(${(1 - l1) * -40}px)` }}>
          <span style={{ color: GREEN }}>✓</span> servicio profesional
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, opacity: Math.min(1, l2 * 1.5) * 0.85, transform: `translateX(${(1 - l2) * -40}px)` }}>
          no solo un cambio de aceite 💧
        </div>
      </div>
    </div>
  );
};

const CheckRow: React.FC<{ at: number; label: string; icon: React.ReactNode; big?: boolean }> = ({ at, label, icon, big }) => {
  const { t, frame, fps } = useT();
  const p = t >= at ? springAt(frame, fps, at, 9) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: t >= at ? Math.min(1, p * 1.5) : 0.3 }}>
      <Icon bg={t >= at ? BLUE : "rgba(255,255,255,0.18)"} size={big ? 84 : 70}>{icon}</Icon>
      <div style={{ flex: 1, fontSize: big ? 46 : 40, fontWeight: 900 }}>{label}</div>
      <div style={{ width: 54, height: 54, borderRadius: 27, background: t >= at ? GREEN : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#0b0b0b", transform: `scale(${0.6 + 0.4 * Math.max(p, 0.001)})` }}>
        {t >= at ? "✓" : ""}
      </div>
    </div>
  );
};

const StaffCard: React.FC = () => (
  <div style={{ ...glass, background: DENSE, padding: "26px 32px", width: 640, display: "flex", flexDirection: "column", gap: 16 }}>
    <Kicker>NUESTRO PERSONAL</Kicker>
    <CheckRow at={10.26} label="Certificado" icon={<MedalPath />} big />
    <CheckRow at={11.26} label="Capacitado" icon={<WrenchPath />} big />
  </div>
);

const PartsCard: React.FC = () => (
  <div style={{ ...glass, background: DENSE, padding: "26px 32px", width: 700, display: "flex", flexDirection: "column", gap: 16 }}>
    <Kicker>TRABAJAMOS CON</Kicker>
    <CheckRow at={14.74} label="Refacciones originales" icon={<GearPath />} />
    <CheckRow at={16.36} label="Aceite Liqui Moly" icon={<DropPath />} />
  </div>
);

const PriceCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const v = interpolate(t, [20.58, 21.3], [0, 499], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const shown = t >= 20.58;
  const pp = shown ? springAt(frame, fps, 20.58, 8) : 0;
  const glow = shown ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
  return (
    <div style={{ ...glass, background: DENSE, padding: "28px 36px", width: 760, border: `2px solid ${BLUE_SOFT}`, textAlign: "center" }}>
      <Kicker color={GOLD}>Y LO MEJOR…</Kicker>
      <div style={{ fontSize: 44, fontWeight: 900, marginTop: 6 }}>servicios desde</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 14, opacity: t >= 20.1 ? 1 : 0.3 }}>
        <span style={{ fontSize: 150, fontWeight: 900, letterSpacing: -5, color: GOLD, transform: `scale(${0.85 + 0.15 * pp})`, display: "inline-block", textShadow: `0 0 ${14 + glow * 22}px rgba(255,194,74,0.7)` }}>
          ${Math.round(v)}
        </span>
        <span style={{ fontSize: 40, fontWeight: 900, opacity: 0.85 }}>MXN</span>
      </div>
    </div>
  );
};

const QualityCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const items: [number, string, React.ReactNode][] = [[22.48, "Calidad", <StarPath key="s" />], [22.94, "Experiencia", <WrenchPath key="w" />], [23.92, "Atención", <HeadsetPath key="h" />]];
  const p = interpolate(t, [25.0, 26.16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ready = p >= 0.999;
  return (
    <div style={{ ...glass, background: DENSE, padding: "24px 30px", width: 760 }}>
      <div style={{ display: "flex", gap: 14 }}>
        {items.map(([at, label, icon]) => {
          const q = t >= at ? springAt(frame, fps, at, 9) : 0;
          return (
            <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 22, background: "rgba(255,255,255,0.1)", opacity: Math.min(1, q * 1.5), transform: `scale(${0.7 + 0.3 * q})` }}>
              <Icon bg={BLUE} size={56}>{icon}</Icon>
              <span style={{ fontSize: 28, fontWeight: 900 }}>{label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 18, opacity: t >= 24.9 ? 1 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Kicker color={ready ? GREEN : BLUE_SOFT}>{ready ? "A RODAR CON CONFIANZA" : "PREPARANDO TU MOTO"}</Kicker>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{Math.round(p * 100)}%</div>
        </div>
        <div style={{ marginTop: 10, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
          <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 11, background: ready ? GREEN : `linear-gradient(90deg, ${BLUE}, ${BLUE_SOFT})` }} />
        </div>
      </div>
    </div>
  );
};

const BookingCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const pick = t >= 27.46 ? springAt(frame, fps, 27.46, 9) : 0;
  const hands = t >= 30.4 ? springAt(frame, fps, 30.4, 9) : 0;
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <div style={{ ...glass, background: DENSE, padding: "26px 32px", width: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Icon bg={BLUE} size={84}><CalPath /></Icon>
        <div>
          <Kicker>MOTO ROKA FIX &amp; SHOP</Kicker>
          <div style={{ fontSize: 50, fontWeight: 900 }}>Agenda tu servicio</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        {days.map((d, i) => {
          const sel = i === 3;
          return (
            <div key={i} style={{
              flex: 1, height: 74, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900,
              background: sel && pick > 0 ? BLUE : "rgba(255,255,255,0.1)", transform: sel ? `scale(${1 + 0.12 * pick})` : undefined,
              boxShadow: sel && pick > 0 ? `0 0 22px ${BLUE}` : undefined,
            }}>{sel && pick > 0.5 ? "✓" : d}</div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 40, fontWeight: 900, opacity: hands, transform: `translateY(${(1 - hands) * 14}px)` }}>
        tu moto, en buenas manos 🤝
      </div>
    </div>
  );
};

const LastServiceCard: React.FC = () => {
  const { t } = useT();
  const spinning = t < 33.4;
  const n = spinning ? Math.floor((t * 37) % 97) + 3 : -1;
  return (
    <div style={{ ...glass, background: DENSE, padding: "26px 34px", width: 680, textAlign: "center" }}>
      <Kicker color={GOLD}>TU ÚLTIMO SERVICIO FUE HACE…</Kicker>
      <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 1.05, color: spinning ? "white" : GOLD, fontVariantNumeric: "tabular-nums" }}>
        {spinning ? n : "¿?"} <span style={{ fontSize: 52 }}>días</span>
      </div>
    </div>
  );
};

const Cta: React.FC = () => {
  const { t } = useT();
  return (
    <div style={{
      background: BLUE, color: "white", fontFamily: FONT, fontWeight: 900, fontSize: 54, padding: "22px 44px", borderRadius: 999,
      boxShadow: `0 0 40px ${BLUE}, 0 18px 40px rgba(0,0,0,0.4)`, transform: `scale(${1 + 0.04 * Math.sin(t * 7)})`, whiteSpace: "nowrap",
    }}>AGENDA TU SERVICIO →</div>
  );
};

const TeamPill: React.FC = () => (
  <div style={{ background: BLUE, color: "white", fontFamily: FONT, fontWeight: 900, fontSize: 34, padding: "10px 22px", borderRadius: 16, boxShadow: "0 8px 22px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
    NUESTRO EQUIPO ↓
  </div>
);

// ---------- subtítulos (estilo Moto Roka) ----------
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
        const isPrice = w.startsWith("$");
        return (
          <span key={k} style={{
            fontFamily: FONT, fontWeight: 900, fontSize: 76, textTransform: "uppercase", color: isPrice && !active ? GOLD : "white",
            padding: "2px 14px", borderRadius: 16, background: active ? BLUE : "transparent", transform: `scale(${1 + 0.08 * ap})`,
            display: "inline-block", opacity: t >= s ? 1 : 0.7, textShadow: "0 3px 0 rgba(0,0,0,0.85), 0 8px 22px rgba(0,0,0,0.6)",
          }}>{w}</span>
        );
      })}
    </div>
  );
};

export const MotoRokaCalidad: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <Camera>
      <OffthreadVideo src={staticFile("roka_calidad.mp4")} style={{ width: "100%", height: "100%" }} />
    </Camera>

    <Float inAt={0.92} outAt={3.35} x={190} y={110} from="top"><HandsCard /></Float>
    <Float inAt={3.64} outAt={8.62} x={180} y={90} from="top" phase={0.6}><RokaCard /></Float>
    <Float inAt={9.78} outAt={13.7} x={40} y={110} from="left" phase={1.2}><StaffCard /></Float>
    <Float inAt={10.6} outAt={13.7} x={700} y={300} from="right" phase={2.0}><TeamPill /></Float>
    <Float inAt={14.52} outAt={18.1} x={190} y={100} from="top" phase={0.3}><PartsCard /></Float>
    <Float inAt={18.42} outAt={22.4} x={160} y={90} from="top" phase={0.9}><PriceCard /></Float>
    {/* escena con el letrero LIQUI MOLY arriba: este widget va abajo para no taparlo */}
    <Float inAt={22.48} outAt={26.9} x={160} y={1240} from="bottom" phase={1.5}><QualityCard /></Float>
    <Float inAt={26.78} outAt={31.2} x={180} y={100} from="top" phase={0.4}><BookingCard /></Float>
    <Float inAt={32.12} outAt={END + 1} x={200} y={110} from="top" phase={1.1}><LastServiceCard /></Float>
    <Float inAt={33.74} outAt={END + 1} x={180} y={1300} from="bottom" phase={0.8}><Cta /></Float>

    <Captions />
  </AbsoluteFill>
);
