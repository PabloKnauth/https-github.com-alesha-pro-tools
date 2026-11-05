import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile } from "remotion";
import { Float, FONT, glass, Icon, Kicker, springAt, useT } from "./MotoRokaServicio";

// Bodega en renta — mismo sistema que MotoRokaServicio (vidrio, cámara, subtítulos), en naranja de
// seguridad industrial. Cuando no hay persona en cuadro los widgets se agrandan y se centran.
const OR = "#ff6b1a";
const OR_SOFT = "#ffa266";
const GREEN = "#3ddc84";
const CHAR: React.CSSProperties = { ...glass, background: "rgba(22, 22, 24, 0.58)", border: "1.5px solid rgba(255,255,255,0.22)" };

// Tramos sin persona (medidos con segmentación): ahí los widgets van grandes
const NO_PERSON: [number, number][] = [[13.0, 19.8], [22.5, 28.8]];

const WORDS: [number, number, string][] = [
  [0.0, 0.32, "No"], [0.32, 0.62, "rentes"], [0.62, 0.76, "una"], [0.76, 1.06, "bodega"], [1.06, 1.32, "sin"],
  [1.32, 1.48, "antes"], [1.48, 1.66, "saber"], [1.66, 1.84, "estas"], [1.84, 2.1, "tres"], [2.1, 2.6, "cosas."],
  [2.76, 3.12, "Número"], [3.12, 3.5, "uno,"], [3.7, 3.74, "el"], [3.74, 4.3, "acceso."], [4.72, 4.86, "De"],
  [4.86, 5.0, "nada"], [5.0, 5.24, "sirve"], [5.24, 5.4, "tener"], [5.4, 5.62, "mucho"], [5.62, 6.1, "espacio"],
  [5.96, 6.48, "si"], [6.48, 6.58, "la"], [6.58, 6.76, "entrada"], [6.76, 6.88, "y"], [6.88, 6.96, "la"],
  [6.96, 7.24, "salida"], [7.24, 7.48, "es"], [7.48, 7.58, "un"], [7.58, 8.1, "problema."], [8.34, 8.62, "Número"],
  [8.62, 8.95, "dos,"], [9.14, 9.7, "seguridad."], [10.08, 10.12, "Tu"], [10.12, 10.54, "inventario"], [10.54, 10.74, "puede"],
  [10.74, 10.94, "valer"], [10.94, 11.4, "muchísimo"], [11.4, 11.72, "más"], [11.72, 11.86, "de"], [11.86, 11.94, "lo"],
  [11.94, 12.06, "que"], [12.06, 12.18, "tú"], [12.18, 12.42, "pagas"], [12.42, 12.52, "de"], [12.52, 12.95, "renta."],
  [13.18, 13.24, "Y"], [13.24, 13.38, "número"], [13.38, 13.8, "tres,"], [14.1, 14.7, "ubicación."], [15.12, 15.28, "Una"],
  [15.28, 15.56, "renta"], [15.56, 15.86, "barata"], [15.86, 16.2, "puede"], [16.2, 16.58, "salirte"], [16.58, 17.08, "carísima"],
  [17.08, 17.24, "y"], [17.24, 17.42, "todos"], [17.42, 17.58, "los"], [17.58, 17.7, "días"], [17.7, 17.98, "pierdes"],
  [17.98, 18.38, "tiempo"], [18.38, 18.62, "y"], [18.62, 18.84, "dinero"], [18.84, 18.94, "en"], [18.94, 19.5, "traslados."],
  [19.82, 19.9, "¿Y"], [19.9, 20.02, "por"], [20.02, 20.12, "qué"], [20.12, 20.22, "te"], [20.22, 20.44, "cuento"],
  [20.44, 20.9, "esto?"], [21.18, 21.28, "Porque"], [21.28, 21.48, "tenemos"], [21.48, 21.7, "una"], [21.7, 21.96, "bodega"],
  [21.96, 22.08, "en"], [22.08, 22.34, "renta"], [22.34, 22.46, "que"], [22.46, 22.62, "creo"], [22.62, 22.7, "que"],
  [22.7, 22.98, "valdría"], [22.98, 23.34, "muchísimo"], [23.34, 23.52, "la"], [23.52, 23.66, "pena"], [23.66, 23.82, "que"],
  [23.82, 24.4, "conocieras."], [25.94, 26.42, "Mándanos"], [26.42, 26.76, "mensaje"], [26.76, 27.02, "y"],
  [27.02, 27.38, "agendamos"], [27.38, 27.54, "una"], [27.54, 28.1, "visita."],
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

// ---------- cámara: empuje por escena, Ken Burns más marcado sin persona, golpes en palabras clave ----------
const CUTS = [0, 2.733, 8.333, 12.967, 19.8, 22.5];
const PUNCHES: [number, number][] = [[3.12, 0.08], [8.62, 0.08], [13.38, 0.06], [16.58, 0.07], [19.9, 0.08], [21.7, 0.07], [27.02, 0.05]];
const END = 28.77;
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useT();
  const ci = CUTS.reduce((acc, c, i) => (t >= c ? i : acc), 0);
  const c0 = CUTS[ci], c1 = ci + 1 < CUTS.length ? CUTS[ci + 1] : END;
  const broll = NO_PERSON.some(([a, b]) => c0 >= a - 0.1 && c0 < b);
  let z = 1 + (broll ? 0.1 : 0.035) * Easing.inOut(Easing.quad)(Math.min(1, (t - c0) / (c1 - c0)));
  for (const [tp, a] of PUNCHES) if (tp >= c0 && tp < c1 && t >= tp) z += a * Easing.out(Easing.cubic)(Math.min(1, (t - tp) / 0.2));
  return <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 55%" }}>{children}</AbsoluteFill>;
};

// envoltura para widgets grandes centrados: `zoom` escala también el tamaño de diseño, así el contenedor
// con brillo de Float crece con el contenido en vez de recortarlo (un transform no cambiaría la caja)
const Big: React.FC<{ w: number; scale: number; children: React.ReactNode }> = ({ w, scale, children }) => (
  <div style={{ width: w, zoom: scale } as React.CSSProperties}>{children}</div>
);

// ---------- iconos (viewBox 64) ----------
const GatePath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5" strokeLinejoin="round">
    <path d="M10 52V22l22-10 22 10v30" />
    <path d="M20 52V30h24v22" />
    <path d="M20 37h24M20 44h24" />
  </g>
);
const ShieldPath = () => (
  <g>
    <path d="M32 9l20 7v14c0 13-9 21-20 25C21 51 12 43 12 30V16z" fill="white" />
    <rect x="25" y="29" width="14" height="12" rx="2" fill="#222" />
    <path d="M28 29v-4a4 4 0 0 1 8 0v4" stroke="#222" strokeWidth="3" fill="none" />
  </g>
);
const PinPath = () => (
  <g>
    <path d="M32 8c-9 0-16 7-16 16 0 12 16 30 16 30s16-18 16-30c0-9-7-16-16-16z" fill="white" />
    <circle cx="32" cy="24" r="6" fill={OR} />
  </g>
);
const QPath = () => <text x="32" y="47" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize="42" fill="white">?</text>;
const WarehousePath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5" strokeLinejoin="round">
    <path d="M8 54V26L32 12l24 14v28" />
    <path d="M18 54V34h28v20M18 41h28M18 48h28" />
  </g>
);
const CalendarPath = () => (
  <g fill="none" stroke="white" strokeWidth="4.5">
    <rect x="12" y="16" width="40" height="36" rx="5" />
    <path d="M12 26h40M22 10v10M42 10v10" />
    <path d="M24 38l6 6 11-12" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

// ---------- widgets ----------
const HookCard: React.FC = () => {
  const { t, frame, fps } = useT();
  return (
    <div style={{ ...CHAR, padding: "28px 34px", width: 720 }}>
      <Kicker color={OR}>ANTES DE RENTAR UNA BODEGA</Kicker>
      <div style={{ fontSize: 50, fontWeight: 900, marginTop: 8 }}>revisa estas 3 cosas</div>
      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        {[0, 1, 2].map((i) => {
          const p = springAt(frame, fps, 1.84 + i * 0.12, 9);
          return (
            <div key={i} style={{
              flex: 1, height: 110, borderRadius: 24, border: `3px solid ${OR}`, background: "rgba(255,107,26,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              opacity: t >= 1.84 + i * 0.12 ? Math.min(1, p * 1.5) : 0, transform: `scale(${0.6 + 0.4 * p})`,
            }}>
              <span style={{ fontSize: 54, fontWeight: 900, color: OR }}>{i + 1}</span>
              <span style={{ fontSize: 46, fontWeight: 900, opacity: 0.85 }}>?</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NumberCard: React.FC<{ n: string; title: string; icon: React.ReactNode; width?: number; children?: React.ReactNode }> = ({
  n, title, icon, width = 720, children,
}) => (
  <div style={{ ...CHAR, padding: "26px 32px", width, border: `2px solid ${OR}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ fontSize: 120, fontWeight: 900, color: OR, lineHeight: 0.9, letterSpacing: -4, textShadow: `0 0 26px rgba(255,107,26,0.55)` }}>{n}</div>
      <div style={{ flex: 1 }}>
        <Kicker color={OR_SOFT}>{`PUNTO ${Number(n)} DE 3`}</Kicker>
        <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05 }}>{title}</div>
      </div>
      <Icon bg={OR} size={110}>{icon}</Icon>
    </div>
    {children}
  </div>
);

const AccessFlow: React.FC = () => {
  const { t } = useT();
  const show = interpolate(t, [4.72, 5.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flow = ((t - 4.72) * 0.9) % 1;
  return (
    <div style={{ marginTop: 22, opacity: show, display: "flex", flexDirection: "column", gap: 14 }}>
      {[{ label: "ENTRADA", dir: 1 }, { label: "SALIDA", dir: -1 }].map(({ label, dir }, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 170, fontSize: 30, fontWeight: 800, opacity: t >= (i ? 6.96 : 6.58) ? 1 : 0.4 }}>{label}</div>
          <div style={{ flex: 1, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.14)", position: "relative", overflow: "hidden" }}>
            {[0, 0.33, 0.66].map((o) => {
              const x = ((flow + o) % 1) * 100;
              return <div key={o} style={{ position: "absolute", top: 0, height: 16, width: "18%", borderRadius: 8, background: OR, left: `${dir > 0 ? x : 100 - x - 18}%` }} />;
            })}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: GREEN, opacity: t >= 7.58 ? 1 : 0 }}>✓</div>
        </div>
      ))}
    </div>
  );
};

const ValueBars: React.FC = () => {
  const { t } = useT();
  const inv = interpolate(t, [10.12, 11.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const rent = interpolate(t, [12.18, 12.8], [0, 0.22], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const bar = (label: string, v: number, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 230, fontSize: 30, fontWeight: 800 }}>{label}</div>
      <div style={{ flex: 1, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
        <div style={{ width: `${v * 100}%`, height: "100%", borderRadius: 15, background: color, boxShadow: `0 0 16px ${color}` }} />
      </div>
    </div>
  );
  return (
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14, opacity: t >= 10.08 ? 1 : 0 }}>
      {bar("TU INVENTARIO", inv, OR)}
      {bar("TU RENTA", rent, "rgba(255,255,255,0.75)")}
    </div>
  );
};

const RouteMap: React.FC = () => {
  const { t } = useT();
  const p = interpolate(t, [13.6, 14.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const route = "M40 250 C 120 230, 120 150, 210 150 S 330 60, 420 70 S 560 40, 600 30";
  return (
    <svg width="640" height="290" viewBox="0 0 640 290" style={{ marginTop: 18, borderRadius: 24, background: "rgba(255,255,255,0.06)" }}>
      {[60, 140, 220].map((y) => <path key={y} d={`M0 ${y} H640`} stroke="rgba(255,255,255,0.08)" strokeWidth="2" />)}
      {[120, 260, 400, 540].map((x) => <path key={x} d={`M${x} 0 V290`} stroke="rgba(255,255,255,0.08)" strokeWidth="2" />)}
      <path d={route} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="14" strokeLinecap="round" />
      <path d={route} fill="none" stroke={OR} strokeWidth="14" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      <g transform="translate(14 222)"><WarehousePath /></g>
      <g transform={`translate(572 0) scale(${0.6 + 0.4 * p})`} opacity={p}><PinPath /></g>
    </svg>
  );
};

const CheapCost: React.FC = () => {
  const { t, frame, fps } = useT();
  const strike = interpolate(t, [16.58, 16.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const loss = (at: number) => (t >= at ? springAt(frame, fps, at, 9) : 0);
  const spin = (t - 17.98) * 360;
  return (
    <div style={{ ...CHAR, padding: "30px 36px", width: 720 }}>
      <Kicker color={OR}>OJO CON EL PRECIO</Kicker>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 8, whiteSpace: "nowrap" }}>
        <span style={{ position: "relative", fontSize: 56, fontWeight: 900 }}>
          renta barata
          <span style={{ position: "absolute", left: -6, top: "52%", height: 8, borderRadius: 4, background: OR, width: `${strike * 104}%` }} />
        </span>
        <span style={{ fontSize: 56, fontWeight: 900, color: OR, opacity: strike }}>≠ ahorro</span>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
        {[
          { at: 17.98, label: "TIEMPO", icon: (
            <g fill="none" stroke="white" strokeWidth="5"><circle cx="32" cy="34" r="20" />
              <path d={`M32 34 L${32 + 13 * Math.sin((spin * Math.PI) / 180)} ${34 - 13 * Math.cos((spin * Math.PI) / 180)}`} strokeLinecap="round" />
              <path d="M32 34 L32 24" strokeLinecap="round" /></g>) },
          { at: 18.62, label: "DINERO", icon: <text x="32" y="47" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize="40" fill="white">$</text> },
        ].map(({ at, label, icon }) => {
          const p = loss(at);
          return (
            <div key={label} style={{
              flex: 1, display: "flex", alignItems: "center", gap: 18, padding: "16px 20px", borderRadius: 26,
              background: "rgba(255,107,26,0.16)", border: `2px solid ${OR}`, opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * p})`,
            }}>
              <Icon bg={OR} size={86}>{icon}</Icon>
              <div>
                <div style={{ fontSize: 36, fontWeight: 900 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: OR_SOFT }}>en traslados ↓</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RentCard: React.FC = () => {
  const { t, frame, fps } = useT();
  const items = [["Acceso", 22.7], ["Seguridad", 22.98], ["Ubicación", 23.34]] as const;
  return (
    <div style={{ ...CHAR, padding: "30px 36px", width: 720, border: `2px solid ${OR}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Icon bg={OR} size={110}><WarehousePath /></Icon>
        <div>
          <Kicker color={OR}>DISPONIBLE</Kicker>
          <div style={{ fontSize: 70, fontWeight: 900, lineHeight: 1 }}>BODEGA</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: OR, lineHeight: 1.1 }}>EN RENTA</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
        {items.map(([label, at]) => {
          const p = t >= at ? springAt(frame, fps, at, 9) : 0;
          return (
            <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 20, background: "rgba(255,255,255,0.1)" }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, background: p > 0 ? GREEN : "rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#0b0b0b", transform: `scale(${0.6 + 0.4 * Math.max(p, 0.001)})` }}>
                {p > 0 ? "✓" : ""}
              </span>
              <span style={{ fontSize: 30, fontWeight: 800 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChatVisit: React.FC = () => {
  const { t, frame, fps } = useT();
  const typed = "Quiero agendar una visita";
  const n = Math.floor(interpolate(t, [25.6, 26.3], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sent = t >= 26.42;
  const sp = sent ? springAt(frame, fps, 26.42, 11) : 0;
  const typing = t >= 26.7 && t < 27.38;
  const rp = t >= 27.38 ? springAt(frame, fps, 27.38, 11) : 0;
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
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, minHeight: 210 }}>
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
        {t >= 27.38 && (
          <div style={{ ...bubble, alignSelf: "flex-start", background: "rgba(255,255,255,0.92)", color: "#111", display: "flex", alignItems: "center", gap: 12, transform: `scale(${0.7 + 0.3 * rp})`, transformOrigin: "left bottom" }}>
            <svg width="40" height="40" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill={OR} /><CalendarPath /></svg>
            ¡Agendamos tu visita! ✓
          </div>
        )}
      </div>
    </div>
  );
};

const Cta: React.FC = () => {
  const { t } = useT();
  return (
    <div style={{
      background: OR, color: "white", fontFamily: FONT, fontWeight: 900, fontSize: 56, padding: "22px 48px", borderRadius: 999,
      boxShadow: `0 0 40px rgba(255,107,26,0.7), 0 18px 40px rgba(0,0,0,0.4)`, transform: `scale(${1 + 0.04 * Math.sin(t * 7)})`, whiteSpace: "nowrap",
    }}>
      AGENDA TU VISITA →
    </div>
  );
};

// ---------- subtítulos (estilo Moto Roka, acento naranja) ----------
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

export const BodegaRenta: React.FC = () => {
  const { t } = useT();
  // la tarjeta de "bodega en renta" crece y se centra cuando él sale de cuadro (22.5 s)
  const grow = interpolate(t, [22.4, 22.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const rentScale = 1 + 0.4 * grow;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Camera>
        <OffthreadVideo src={staticFile("bodega.mp4")} style={{ width: "100%", height: "100%" }} />
      </Camera>

      {/* con persona: tamaño normal, en la franja superior */}
      <Float inAt={0.76} outAt={2.65} x={180} y={150} from="top"><HookCard /></Float>
      <Float inAt={2.76} outAt={8.2} x={180} y={130} from="top" phase={0.5}>
        <NumberCard n="01" title="ACCESO" icon={<GatePath />}><AccessFlow /></NumberCard>
      </Float>
      <Float inAt={8.34} outAt={12.9} x={180} y={130} from="top" phase={1.1}>
        <NumberCard n="02" title="SEGURIDAD" icon={<ShieldPath />}><ValueBars /></NumberCard>
      </Float>

      {/* sin persona: grande y centrado */}
      <Float inAt={13.24} outAt={15.0} x={(1080 - 720 * 1.4) / 2} y={420} from="bottom" phase={0.2}>
        <Big w={720} scale={1.4}><NumberCard n="03" title="UBICACIÓN" icon={<PinPath />}><RouteMap /></NumberCard></Big>
      </Float>
      <Float inAt={15.12} outAt={19.55} x={(1080 - 720 * 1.4) / 2} y={470} from="bottom" phase={0.9}>
        <Big w={720} scale={1.4}><CheapCost /></Big>
      </Float>

      {/* persona de vuelta */}
      <Float inAt={19.9} outAt={21.1} x={420} y={260} from="top" phase={0.4}>
        <div style={{ ...CHAR, padding: 18, borderRadius: 40 }}><Icon bg={OR} size={170}><QPath /></Icon></div>
      </Float>
      <Float inAt={21.7} outAt={25.6} x={180 - (180 - (1080 - 720 * 1.4) / 2) * grow} y={150 + 330 * grow} from="top" phase={1.6}>
        <Big w={720} scale={rentScale}><RentCard /></Big>
      </Float>

      {/* sin persona: CTA grande */}
      <Float inAt={25.7} outAt={29} x={(1080 - 720 * 1.4) / 2} y={380} from="bottom" phase={0.6}>
        <Big w={720} scale={1.4}><ChatVisit /></Big>
      </Float>
      <Float inAt={27.6} outAt={29} x={190} y={1150} from="bottom" phase={1.2}><Cta /></Float>

      <Captions />
    </AbsoluteFill>
  );
};
