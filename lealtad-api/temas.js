// Temas de la tarjeta: solo colores de la marca Moto Roka (tinta, papel, azul, azul hondo, azul claro, gris).
export const TEMAS = {
  noche: { fondo: "#0b0d12", fondo2: "#1a2140", texto: "#ffffff", etiqueta: "#8a97ff", sello: "#2f45e0", iconoSello: "#ffffff", vacio: "#ffffff", vacioAlfa: 0.2, regalo: "#8a97ff", iconoRegalo: "#0b0d12" },
  roka: { fondo: "#2236c4", fondo2: "#3b52f0", texto: "#ffffff", etiqueta: "#d6dbff", sello: "#ffffff", iconoSello: "#2236c4", vacio: "#ffffff", vacioAlfa: 0.32, regalo: "#0b0d12", iconoRegalo: "#ffffff" },
  acero: { fondo: "#24272f", fondo2: "#585d68", texto: "#ffffff", etiqueta: "#c9ceff", sello: "#8a97ff", iconoSello: "#0b0d12", vacio: "#ffffff", vacioAlfa: 0.25, regalo: "#ffffff", iconoRegalo: "#2236c4" },
  hielo: { fondo: "#f4f3ef", fondo2: "#dfe3ff", texto: "#0b0d12", etiqueta: "#2236c4", sello: "#2f45e0", iconoSello: "#ffffff", vacio: "#0b0d12", vacioAlfa: 0.18, regalo: "#0b0d12", iconoRegalo: "#f4f3ef" },
};
export const SELLOS = ["moto", "casco", "llave", "llanta", "aceite", "velocimetro"];
export const temaDe = (t) => TEMAS[t?.tema] ? t.tema : "noche";
export const selloDe = (t) => SELLOS.includes(t?.sello) ? t.sello : "moto";
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbTexto = (h) => `rgb(${rgb(h).join(",")})`;
export { rgb };
