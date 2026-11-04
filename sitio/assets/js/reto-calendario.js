(function () {
  "use strict";
  var R = window.RETO;
  if (!R || !document.getElementById("reto-meses")) return;

  var MS = 86400000;
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function fecha(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function clave(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dif(a, b) { return Math.round((a - b) / MS); }
  function bonita(d) { return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var t = new Date(), hoy = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  var inicio = fecha(R.inicio), total = Math.max(1, R.dias | 0);
  var fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + total - 1);
  var n = dif(hoy, inicio) + 1;                       // día del reto (puede ser <=0 o >total)
  var reg = {};
  (R.registro || []).forEach(function (e) { if (e && e.fecha) reg[e.fecha] = e; });

  /* ---- cabecera ---- */
  var diaVisible = Math.min(Math.max(n, 1), total);
  document.getElementById("reto-dia").textContent = "Día " + diaVisible;
  document.getElementById("reto-frase").textContent = R.frase || "";
  var meta;
  if (n <= 0) meta = (n === 0 ? "Empieza mañana, " : "Empieza el ") + bonita(inicio) + ". " + total + " días por delante.";
  else if (n > total) meta = "Reto terminado el " + bonita(fin) + ".";
  else meta = "Día " + n + " de " + total + " · termina el " + bonita(fin) + ".";
  document.getElementById("reto-meta").textContent = meta + (R.objetivo ? " " + R.objetivo : "");

  /* ---- datos ---- */
  var entrenos = 0, descansos = 0;
  Object.keys(reg).forEach(function (k) { if (reg[k].tipo === "descanso") descansos++; else entrenos++; });
  var racha = 0, cursor = new Date(hoy);
  if (!reg[clave(cursor)]) cursor.setDate(cursor.getDate() - 1);     // hoy aún puede no estar registrado
  while (reg[clave(cursor)] && cursor >= inicio) { racha++; cursor.setDate(cursor.getDate() - 1); }
  var avance = Math.round(Math.min(Math.max(n - (n > total ? 0 : 1), 0), total) / total * 100);
  if (n > total) avance = 100;
  var datos = [
    [n <= 0 ? "0" : String(Math.min(n, total)), "de " + total + " días"],
    [String(entrenos), entrenos === 1 ? "entreno" : "entrenos"],
    [String(racha), racha === 1 ? "día de racha" : "días de racha"],
    [avance + " %", "del reto"]
  ];
  document.getElementById("reto-datos").innerHTML = datos.map(function (d) {
    return "<li><strong class=\"display\">" + d[0] + "</strong>" + d[1] + "</li>";
  }).join("");
  document.getElementById("reto-barra").style.width = avance + "%";

  /* ---- meses ---- */
  var html = [], m = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  var ultimo = new Date(fin.getFullYear(), fin.getMonth(), 1);
  while (m <= ultimo) {
    var celdas = [], desfase = (m.getDay() + 6) % 7;   // lunes primero
    for (var i = 0; i < desfase; i++) celdas.push('<span class="dia dia--vacio" aria-hidden="true"></span>');
    var diasMes = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (var d = 1; d <= diasMes; d++) {
      var f = new Date(m.getFullYear(), m.getMonth(), d), k = clave(f), e = reg[k];
      var dentro = f >= inicio && f <= fin, num = dif(f, inicio) + 1;
      var cls = "dia", etiqueta = bonita(f);
      if (!dentro) cls += " dia--fuera";
      else {
        etiqueta = "Día " + num + " · " + etiqueta;
        if (e) { cls += e.tipo === "descanso" ? " dia--descanso" : " dia--hecho"; etiqueta += " · " + (e.que || e.tipo); }
        else if (f < hoy) { cls += " dia--sin"; etiqueta += " · sin registro"; }
        else cls += " dia--futuro";
        if (+f === +hoy) cls += " dia--hoy";
      }
      celdas.push(e && dentro
        ? '<button type="button" class="' + cls + '" data-f="' + k + '" title="' + esc(etiqueta) + '" aria-label="' + esc(etiqueta) + '">' + d + "</button>"
        : '<span class="' + cls + '" title="' + esc(etiqueta) + '">' + d + "</span>");
    }
    html.push('<section class="mes"><h3 class="mes__t">' + MESES[m.getMonth()] + " <span>" + m.getFullYear() + "</span></h3>" +
      '<div class="mes__sem" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' +
      '<div class="mes__dias">' + celdas.join("") + "</div></section>");
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  document.getElementById("reto-meses").innerHTML = html.join("");

  /* ---- detalle ---- */
  var detalle = document.getElementById("reto-detalle");
  function mostrar(k) {
    var e = reg[k], f = fecha(k), num = dif(f, inicio) + 1;
    detalle.innerHTML = '<p class="marker reto__detalle-f">Día ' + num + " · " + bonita(f) + "</p>" +
      "<h3>" + esc(e.tipo === "descanso" ? "Descanso" : (e.que || "Entreno")) + (e.minutos ? " · " + esc(e.minutos) + " min" : "") + "</h3>" +
      (e.nota ? "<p>" + esc(e.nota) + "</p>" : "");
  }
  var claves = Object.keys(reg).sort();
  if (claves.length) mostrar(claves[claves.length - 1]);
  else detalle.innerHTML = '<p class="marker reto__detalle-f">bitácora</p><h3>' + (n <= 0 ? "Mañana marco el primer día." : "Aún no hay días registrados.") +
    "</h3><p>Cada día que entreno se marca con un zarpazo en el calendario. Toca un día marcado para ver qué hice.</p>";
  document.getElementById("reto-meses").addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-f]"); if (b) mostrar(b.getAttribute("data-f"));
  });
})();
