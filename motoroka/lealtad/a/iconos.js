// Iconos de sello (SVG 24×24, trazo 1.8). Fuente única: la web los dibuja y
// lealtad-api/mascaras.js se genera desde aquí (herramientas/mascaras.cjs) para el pase de Wallet.
// llave, gota, regalo y velocímetro: formas de Lucide (ISC); moto y casco: Tabler Icons (MIT).
window.MR_ICONOS = {
  moto: { nombre: "Moto", svg: '<circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/><path d="M7.5 14h5l4-4H6m1.5 4 4-4"/><path d="M13 6h2l1.5 3 2 4"/>' },
  casco: { nombre: "Casco", svg: '<path d="M12 4a9 9 0 0 1 5.66 16H6.34A9 9 0 0 1 12 4z"/><path d="M20 9h-8.8a1 1 0 0 0-.97 1.25c.51 2 1.6 3.42 3.27 4.25 2 1 4.33.67 7-1"/>' },
  llave: { nombre: "Llave", svg: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>' },
  llanta: { nombre: "Llanta", svg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 6.5v4M12 13.5v4M6.8 10.3l3.8 1.2M13.4 12.5l3.8 1.2M8.8 16.5l2.3-3.2M12.9 10.7l2.3-3.2"/>' },
  aceite: { nombre: "Aceite", svg: '<path d="M12 21.5a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 12.5 5 14.5a7 7 0 0 0 7 7z"/><path d="M9 15a3 3 0 0 0 3 3"/>' },
  velocimetro: { nombre: "Velocímetro", svg: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/><circle cx="12" cy="14" r="1.2"/>' },
  regalo: { nombre: "Regalo", svg: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>' },
};
window.MR_SELLOS = ["moto", "casco", "llave", "llanta", "aceite", "velocimetro"];
window.MR_TEMAS = [
  { id: "noche", nombre: "Noche" },
  { id: "roka", nombre: "Azul Roka" },
  { id: "acero", nombre: "Acero" },
  { id: "hielo", nombre: "Hielo" },
];
window.MR_ICONO = function (id, clase) {
  var i = window.MR_ICONOS[id] || window.MR_ICONOS.moto;
  return '<svg class="' + (clase || "ic") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + i.svg + "</svg>";
};
