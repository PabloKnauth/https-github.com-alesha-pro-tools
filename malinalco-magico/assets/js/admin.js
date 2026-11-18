/* Panel de administración de Malinalco Mágico. Habla con /api/admin (Netlify Functions). */
(function () {
  "use strict";
  var BASE = (window.MM && window.MM.casas) || [];
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var MS = 864e5, MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var CATS = [["limpieza", "Limpieza"], ["comodidad", "Comodidad"], ["alberca", "Alberca"], ["ubicacion", "Ubicación"], ["atencion", "Atención"]];
  var D = null, TOKEN = null, TAB = "resumen";
  try { TOKEN = sessionStorage.getItem("mm-token"); } catch (e) {}

  /* ---------- utilidades ---------- */
  function f(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2] || 1); }
  function k(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var t0 = new Date(), HOY = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  function corta(s) { var d = f(s); return d.getDate() + " " + MES[d.getMonth()]; }
  function noches(r) { return Math.round((f(r.salida) - f(r.llegada)) / MS); }
  function dinero(n) { return "$" + Math.round(n || 0).toLocaleString("es-MX"); }
  function nombreCasa(id) { var c = BASE.find(function (x) { return x.id === id; }); var o = D && D.casas[id]; return (o && o.nombre) || (c && c.nombre) || id; }
  function casa(id) { var c = BASE.find(function (x) { return x.id === id; }) || { id: id }; return Object.assign({}, c, (D && D.casas[id]) || {}); }
  function activas() { return D.reservas.filter(function (r) { return r.estado !== "cancelada"; }); }
  function toast(m, malo) { var t = $("#toast"); t.textContent = m; t.className = "adm-toast" + (malo ? " adm-toast--malo" : ""); t.hidden = false; clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 3200); }
  function estrellas(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }

  /* ---------- API ---------- */
  function api(cuerpo) {
    return fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (TOKEN || "") }, body: JSON.stringify(cuerpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.status === 401 && cuerpo.accion !== "entrar") salir(); if (!r.ok) throw new Error(j.error || "Error " + r.status); return j; }); });
  }
  function guardar(col, valor, msg) {
    return api({ accion: "guardar", coleccion: col, valor: valor }).then(function (j) { D[col] = j.valor; toast(msg || "Guardado"); pintar(); return j; })
      .catch(function (e) { toast(e.message, true); throw e; });
  }

  /* ---------- sesión ---------- */
  $("#form-login").addEventListener("submit", function (e) {
    e.preventDefault(); var err = $("#login-error"); err.hidden = true;
    api({ accion: "entrar", clave: $("#clave").value }).then(function (j) {
      TOKEN = j.token; try { sessionStorage.setItem("mm-token", TOKEN); } catch (x) {} $("#clave").value = ""; cargar();
    }).catch(function (x) { err.textContent = x.message; err.hidden = false; });
  });
  function salir() { TOKEN = null; try { sessionStorage.removeItem("mm-token"); } catch (x) {} $("#app").hidden = true; $("#pantalla-login").hidden = false; }
  $("#salir").addEventListener("click", salir);
  function cargar() {
    api({ accion: "leer" }).then(function (j) { D = j; $("#pantalla-login").hidden = true; $("#app").hidden = false; pintar(); })
      .catch(function () { salir(); });
  }
  $("#tabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return; TAB = b.getAttribute("data-tab");
    [].forEach.call(document.querySelectorAll("[data-tab]"), function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
    pintar(); window.scrollTo(0, 0);
  });

  function pintar() {
    var pend = D.evaluaciones.filter(function (e) { return e.estado === "pendiente"; }).length;
    var op = oportunidades().filter(function (e) { return !e.atendida; }).length;
    var bp = $("#badge-pend"); bp.hidden = !pend; bp.textContent = pend;
    var bo = $("#badge-op"); bo.hidden = !op; bo.textContent = op;
    ({ resumen: vResumen, reservas: vReservas, casas: vCasas, evaluaciones: vEvaluaciones, oportunidad: vOportunidad,
       atractivos: function () { vLugares("atractivos"); }, lugares: function () { vLugares("lugares"); }, ajustes: vAjustes })[TAB]();
  }

  /* ================= RESUMEN ================= */
  function ocupacion(dias) {
    var fin = new Date(+HOY + dias * MS), por = {};
    activas().forEach(function (r) {
      var a = Math.max(+f(r.llegada), +HOY), b = Math.min(+f(r.salida), +fin);
      if (b > a) por[r.casa] = (por[r.casa] || 0) + Math.round((b - a) / MS);
    });
    return por;
  }
  function oportunidades() {
    return D.evaluaciones.filter(function (e) {
      if (e.estado === "rechazada") return false;
      if (e.estrellas <= 2) return true;
      return Object.keys(e.categorias || {}).some(function (c) { return e.categorias[c] <= 2; });
    });
  }
  function vResumen() {
    var visibles = BASE.filter(function (c) { return !(D.casas[c.id] && D.casas[c.id].oculta); });
    var ocu = ocupacion(30), tot = 0; Object.keys(ocu).forEach(function (x) { tot += ocu[x]; });
    var pctR = visibles.length ? tot / (visibles.length * 30) * 100 : 0, pct = pctR > 0 && pctR < 1 ? "<1" : Math.round(pctR);
    var mesA = HOY.getFullYear() + "-" + String(HOY.getMonth() + 1).padStart(2, "0");
    var delMes = activas().filter(function (r) { return r.llegada.slice(0, 7) === mesA; });
    var ingresos = delMes.reduce(function (s, r) { return s + (r.monto || 0); }, 0);
    var futuras = activas().filter(function (r) { return f(r.salida) >= HOY; });
    var saldo = futuras.reduce(function (s, r) { return s + Math.max(0, (r.monto || 0) - (r.anticipo || 0)); }, 0);
    var pub = D.evaluaciones.filter(function (e) { return e.estado === "publicada"; });
    var prom = pub.length ? pub.reduce(function (s, e) { return s + e.estrellas; }, 0) / pub.length : null;
    var pend = D.evaluaciones.filter(function (e) { return e.estado === "pendiente"; }).length;
    var opAb = oportunidades().filter(function (e) { return !e.atendida; }).length;
    var en7 = new Date(+HOY + 7 * MS);
    var llegadas = activas().filter(function (r) { return f(r.llegada) >= HOY && f(r.llegada) <= en7; }).sort(function (a, b) { return a.llegada.localeCompare(b.llegada); });
    var salidas = activas().filter(function (r) { return f(r.salida) >= HOY && f(r.salida) <= en7; }).sort(function (a, b) { return a.salida.localeCompare(b.salida); });
    // categoría más baja
    var cs = {}; pub.forEach(function (e) { Object.keys(e.categorias || {}).forEach(function (c) { cs[c] = cs[c] || [0, 0]; cs[c][0] += e.categorias[c]; cs[c][1]++; }); });
    var baja = Object.keys(cs).map(function (c) { return [c, cs[c][0] / cs[c][1]]; }).sort(function (a, b) { return a[1] - b[1]; })[0];
    // canal y casa más reservadas en el año
    var anio = String(HOY.getFullYear()), porCasa = {}, porCanal = {};
    activas().filter(function (r) { return r.llegada.slice(0, 4) === anio; }).forEach(function (r) { porCasa[r.casa] = (porCasa[r.casa] || 0) + 1; var c = r.canal || "Sin dato"; porCanal[c] = (porCanal[c] || 0) + 1; });
    var top = function (o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; })[0]; };
    // información incompleta
    var falta = visibles.map(function (c0) {
      var c = casa(c0.id), l = [];
      if (!c.maps) l.push("ubicación de Google Maps"); if (!c.banos) l.push("baños"); if (!c.personas) l.push("capacidad");
      if (!(c.habitaciones && c.habitaciones.length)) l.push("camas por recámara");
      if (!pub.some(function (e) { return e.casa === c.id; })) l.push("evaluaciones");
      return [c, l];
    }).filter(function (x) { return x[1].length; });
    var filaRes = function (r, campo) {
      return "<li><strong>" + corta(r[campo]) + "</strong> · " + esc(nombreCasa(r.casa)) + " · " + esc(r.huesped || "Sin nombre") + (r.telefono ? ' · <a href="tel:' + esc(r.telefono) + '">' + esc(r.telefono) + "</a>" : "") +
        (campo === "llegada" && r.monto ? ' · saldo ' + dinero(Math.max(0, r.monto - (r.anticipo || 0))) : "") + "</li>";
    };
    $("#vista").innerHTML =
      '<h1 class="adm-h1">Resumen</h1><p class="adm-sub">' + HOY.getDate() + " de " + MESL[HOY.getMonth()] + " de " + HOY.getFullYear() + "</p>" +
      '<div class="kpis">' +
        kpi("Ocupación próximos 30 días", pct + " %", tot + " noches reservadas en " + visibles.length + " casas") +
        kpi("Ingresos registrados del mes", dinero(ingresos), delMes.length + (delMes.length === 1 ? " reserva" : " reservas") + " con llegada en " + MESL[HOY.getMonth()]) +
        kpi("Saldo por cobrar", dinero(saldo), futuras.length + (futuras.length === 1 ? " reserva vigente o futura" : " reservas vigentes o futuras")) +
        kpi("Calificación promedio", prom ? prom.toFixed(2) + " ★" : "—", pub.length + " evaluaciones publicadas") +
        kpi("Evaluaciones por revisar", pend, pend ? "Revisa la pestaña Evaluaciones" : "Todo al día", pend ? "aviso" : "") +
        kpi("Áreas de oportunidad abiertas", opAb, opAb ? "Comentarios críticos sin atender" : "Sin pendientes", opAb ? "alerta" : "") +
      "</div>" +
      '<div class="adm-cols">' +
        panel("Llegadas en los próximos 7 días", llegadas.length ? "<ul class=\"adm-lista\">" + llegadas.map(function (r) { return filaRes(r, "llegada"); }).join("") + "</ul>" : vacio("Sin llegadas esta semana.")) +
        panel("Salidas en los próximos 7 días", salidas.length ? "<ul class=\"adm-lista\">" + salidas.map(function (r) { return filaRes(r, "salida"); }).join("") + "</ul>" : vacio("Sin salidas esta semana.")) +
      "</div>" +
      panel("Ocupación por casa · próximos 30 días", '<div class="ocup">' + visibles.map(function (c) { return [c, ocu[c.id] || 0]; }).sort(function (a, b) { return b[1] - a[1]; }).map(function (x) {
        var p = Math.round(x[1] / 30 * 100);
        return '<div class="ocup__fila"><span class="ocup__nom">' + esc(nombreCasa(x[0].id)) + '</span><span class="ocup__barra"><i style="width:' + p + '%"></i></span><span class="ocup__num">' + p + " % · " + x[1] + " n</span></div>";
      }).join("") + "</div>") +
      '<div class="adm-cols">' +
        panel("Datos del año " + anio, '<ul class="adm-lista">' +
          "<li>Casa más reservada: <strong>" + (top(porCasa) ? esc(nombreCasa(top(porCasa))) + " (" + porCasa[top(porCasa)] + ")" : "—") + "</strong></li>" +
          "<li>Canal principal: <strong>" + (top(porCanal) ? esc(top(porCanal)) + " (" + porCanal[top(porCanal)] + ")" : "—") + "</strong></li>" +
          "<li>Categoría peor evaluada: <strong>" + (baja ? CATS.find(function (c) { return c[0] === baja[0]; })[1] + " (" + baja[1].toFixed(2) + ")" : "—") + "</strong></li>" +
          "<li>Disponibilidad en la web: <strong>" + (D.config.mostrarDisponibilidad ? "visible" : "oculta (dice «Consulta disponibilidad»)") + "</strong></li></ul>") +
        panel("Casas con información incompleta", falta.length ? '<ul class="adm-lista">' + falta.map(function (x) { return "<li><strong>" + esc(x[0].nombre) + ":</strong> falta " + x[1].join(", ") + "</li>"; }).join("") + "</ul>" : vacio("Todas completas.")) +
      "</div>";
  }
  function kpi(t, v, s, tipo) { return '<div class="kpi' + (tipo ? " kpi--" + tipo : "") + '"><p class="kpi__t">' + t + '</p><p class="kpi__v">' + v + '</p><p class="kpi__s">' + s + "</p></div>"; }
  function panel(t, html) { return '<section class="adm-panel"><h2>' + t + "</h2>" + html + "</section>"; }
  function vacio(t) { return '<p class="adm-vacio">' + t + "</p>"; }
  function opcionesCasas(sel, todas) { return (todas ? '<option value="">Todas las casas</option>' : '<option value="">Elige la casa</option>') + BASE.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + esc(nombreCasa(c.id)) + "</option>"; }).join(""); }

  /* ================= RESERVAS ================= */
  var filtroRes = { casa: "", cuando: "proximas" }, editRes = null, calCasa = "", calMes = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
  function vReservas() {
    var r = editRes || { estado: "confirmada", canal: "WhatsApp" };
    var lista = D.reservas.filter(function (x) {
      if (filtroRes.casa && x.casa !== filtroRes.casa) return false;
      if (filtroRes.cuando === "proximas") return f(x.salida) >= HOY && x.estado !== "cancelada";
      if (filtroRes.cuando === "pasadas") return f(x.salida) < HOY;
      if (filtroRes.cuando === "canceladas") return x.estado === "cancelada";
      return true;
    }).sort(function (a, b) { return filtroRes.cuando === "pasadas" ? b.llegada.localeCompare(a.llegada) : a.llegada.localeCompare(b.llegada); });
    $("#vista").innerHTML = '<h1 class="adm-h1">Reservas</h1><p class="adm-sub">Las fechas de reservas no canceladas se marcan como ocupadas en la página. Los datos del huésped nunca se publican.</p>' +
      '<div class="adm-cols adm-cols--form">' +
      panel(editRes ? "Editar reserva" : "Nueva reserva",
        '<form class="adm-form" id="f-res">' +
        campo("Casa", '<select name="casa" required>' + opcionesCasas(r.casa) + "</select>") +
        '<div class="adm-fila">' + campo("Llegada", '<input type="date" name="llegada" required value="' + esc(r.llegada || "") + '">') + campo("Salida", '<input type="date" name="salida" required value="' + esc(r.salida || "") + '">') + "</div>" +
        '<div class="adm-fila">' + campo("Huésped", '<input name="huesped" value="' + esc(r.huesped || "") + '">') + campo("Teléfono", '<input name="telefono" type="tel" value="' + esc(r.telefono || "") + '">') + "</div>" +
        '<div class="adm-fila adm-fila--3">' + campo("Personas", '<input name="personas" type="number" min="0" value="' + esc(r.personas || "") + '">') + campo("Monto total $", '<input name="monto" type="number" min="0" step="50" value="' + esc(r.monto || "") + '">') + campo("Anticipo $", '<input name="anticipo" type="number" min="0" step="50" value="' + esc(r.anticipo || "") + '">') + "</div>" +
        '<div class="adm-fila">' + campo("Estado", sel("estado", ["apartada", "confirmada", "pagada", "cancelada"], r.estado)) + campo("Canal", sel("canal", ["WhatsApp", "Facebook", "Instagram", "Airbnb", "Booking", "Teléfono", "Recomendación", "Otro"], r.canal)) + "</div>" +
        campo("Notas", '<textarea name="notas" rows="2">' + esc(r.notas || "") + "</textarea>") +
        '<p class="adm-aviso" id="res-choque" hidden></p>' +
        '<div class="adm-acciones"><button class="boton boton--terracota" type="submit">' + (editRes ? "Guardar cambios" : "Agregar reserva") + "</button>" + (editRes ? '<button class="boton boton--linea" type="button" id="res-cancelar">Cancelar edición</button>' : "") + "</div></form>") +
      panel("Calendario", '<div class="adm-fila"><select id="cal-casa">' + opcionesCasas(calCasa, false) + '</select><div class="adm-acciones"><button class="boton boton--linea boton--chico" id="cal-ant" type="button">‹</button><button class="boton boton--linea boton--chico" id="cal-sig" type="button">›</button></div></div><div id="cal"></div>') +
      "</div>" +
      panel("Lista de reservas", '<div class="adm-fila adm-filtros"><select id="fr-casa">' + opcionesCasas(filtroRes.casa, true) + "</select>" + sel("fr-cuando", ["proximas", "pasadas", "canceladas", "todas"], filtroRes.cuando, ["Vigentes y próximas", "Pasadas", "Canceladas", "Todas"]) + "</div>" +
        (lista.length ? '<div class="tabla"><table><thead><tr><th>Casa</th><th>Fechas</th><th>Huésped</th><th>Estado</th><th>Monto</th><th>Saldo</th><th></th></tr></thead><tbody>' + lista.map(function (x) {
          return "<tr><td>" + esc(nombreCasa(x.casa)) + "</td><td>" + corta(x.llegada) + " → " + corta(x.salida) + " <small>(" + noches(x) + " n)</small></td><td>" + esc(x.huesped || "—") + (x.personas ? " <small>· " + x.personas + " p</small>" : "") + (x.telefono ? "<br><small>" + esc(x.telefono) + "</small>" : "") +
            '</td><td><span class="pill pill--' + x.estado + '">' + x.estado + "</span><br><small>" + esc(x.canal || "") + "</small></td><td>" + (x.monto ? dinero(x.monto) : "—") + "</td><td>" + (x.monto ? dinero(Math.max(0, x.monto - (x.anticipo || 0))) : "—") +
            '</td><td class="tabla__acc"><button type="button" class="enlace-oscuro" data-ed-res="' + x.id + '">Editar</button> <button type="button" class="enlace-oscuro" data-del-res="' + x.id + '">Borrar</button></td></tr>';
        }).join("") + "</tbody></table></div>" : vacio("No hay reservas con este filtro.")));
    pintarCal();
    var form = $("#f-res");
    function revisarChoque() {
      var d = Object.fromEntries(new FormData(form)), av = $("#res-choque");
      var ch = d.casa && d.llegada && d.salida && D.reservas.filter(function (x) { return x.estado !== "cancelada" && x.casa === d.casa && (!editRes || x.id !== editRes.id) && x.llegada < d.salida && d.llegada < x.salida; });
      av.hidden = !(ch && ch.length); if (ch && ch.length) av.textContent = "Atención: se cruza con " + ch.map(function (x) { return (x.huesped || "otra reserva") + " (" + corta(x.llegada) + "–" + corta(x.salida) + ")"; }).join(", ") + ".";
    }
    form.addEventListener("change", revisarChoque);
    form.addEventListener("submit", function (e) {
      e.preventDefault(); var d = Object.fromEntries(new FormData(form));
      if (!d.casa || !d.llegada || !d.salida || d.salida <= d.llegada) return toast("Revisa la casa y que la salida sea después de la llegada.", true);
      var nueva = Object.assign({}, editRes || {}, d, { personas: +d.personas || 0, monto: +d.monto || 0, anticipo: +d.anticipo || 0 });
      var lista2 = editRes ? D.reservas.map(function (x) { return x.id === editRes.id ? nueva : x; }) : D.reservas.concat([nueva]);
      guardar("reservas", lista2, editRes ? "Reserva actualizada" : "Reserva agregada").then(function () { editRes = null; calCasa = d.casa; calMes = new Date(f(d.llegada).getFullYear(), f(d.llegada).getMonth(), 1); vReservas(); });
    });
    if ($("#res-cancelar")) $("#res-cancelar").addEventListener("click", function () { editRes = null; vReservas(); });
    $("#fr-casa").addEventListener("change", function (e) { filtroRes.casa = e.target.value; vReservas(); });
    $("#fr-cuando").addEventListener("change", function (e) { filtroRes.cuando = e.target.value; vReservas(); });
    $("#cal-casa").addEventListener("change", function (e) { calCasa = e.target.value; pintarCal(); });
    $("#cal-ant").addEventListener("click", function () { calMes = new Date(calMes.getFullYear(), calMes.getMonth() - 1, 1); pintarCal(); });
    $("#cal-sig").addEventListener("click", function () { calMes = new Date(calMes.getFullYear(), calMes.getMonth() + 1, 1); pintarCal(); });
  }
  function pintarCal() {
    var c = $("#cal"); if (!c) return;
    if (!calCasa) { c.innerHTML = vacio("Elige una casa para ver su calendario."); return; }
    var m = calMes, des = (m.getDay() + 6) % 7, dias = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), cel = [];
    for (var i = 0; i < des; i++) cel.push('<span class="vacio"></span>');
    for (var d = 1; d <= dias; d++) {
      var dia = new Date(m.getFullYear(), m.getMonth(), d), dk = k(dia);
      var r = activas().find(function (x) { return x.casa === calCasa && x.llegada <= dk && dk < x.salida; });
      cel.push('<span class="' + (r ? "ocupado" : "") + (+dia === +HOY ? " hoy" : "") + '" title="' + (r ? esc((r.huesped || "Reservada") + " · " + r.estado) : "Libre") + '">' + d + "</span>");
    }
    c.innerHTML = '<div class="mes"><h4>' + MESL[m.getMonth()] + " " + m.getFullYear() + '</h4><div class="mes__rejilla"><b>L</b><b>M</b><b>M</b><b>J</b><b>V</b><b>S</b><b>D</b>' + cel.join("") + "</div></div>";
  }
  function campo(t, html) { return '<label class="adm-campo"><span>' + t + "</span>" + html + "</label>"; }
  function sel(name, ops, val, etiquetas) { return '<select name="' + name + '" id="' + name + '">' + ops.map(function (o, i) { return '<option value="' + esc(o) + '"' + (o === val ? " selected" : "") + ">" + esc(etiquetas ? etiquetas[i] : o) + "</option>"; }).join("") + "</select>"; }

  /* ================= CASAS ================= */
  var casaSel = "";
  function vCasas() {
    var c = casaSel ? casa(casaSel) : null;
    $("#vista").innerHTML = '<h1 class="adm-h1">Casas</h1><p class="adm-sub">Los cambios se publican en la página en un minuto. Las fotos se cambian aparte: envíalas y se procesan para mantener la calidad.</p>' +
      '<div class="adm-casas">' + BASE.map(function (b) {
        var o = D.casas[b.id] || {};
        return '<button type="button" class="adm-casa' + (b.id === casaSel ? " activa" : "") + '" data-casa="' + b.id + '"><img src="assets/img/casas/min/' + b.fotos[0] + '.webp" onerror="this.src=\'assets/img/casas/' + b.fotos[0] + '.webp\'" alt=""><span>' + esc(o.nombre || b.nombre) + (o.oculta ? ' <em>oculta</em>' : "") + "</span></button>";
      }).join("") + "</div>" +
      (c ? panel("Editar " + esc(c.nombre),
        '<form class="adm-form" id="f-casa">' +
        '<label class="adm-check"><input type="checkbox" name="oculta"' + (c.oculta ? " checked" : "") + "> Ocultar esta casa de la página</label>" +
        '<div class="adm-fila">' + campo("Nombre", '<input name="nombre" value="' + esc(c.nombre) + '">') + campo("Etiqueta", '<input name="etiqueta" value="' + esc(c.etiqueta || "") + '" placeholder="Ej.: Nueva, Grupos grandes">') + "</div>" +
        campo("Descripción", '<textarea name="resumen" rows="3">' + esc(c.resumen) + "</textarea>") +
        '<div class="adm-fila adm-fila--4">' + campo("Personas mín.", '<input name="pmin" type="number" min="1" value="' + (c.personas ? c.personas[0] : "") + '">') + campo("Personas máx.", '<input name="pmax" type="number" min="1" value="' + (c.personas ? c.personas[1] : "") + '">') +
          campo("Recámaras", '<input name="recamaras" value="' + esc(c.recamaras == null ? "" : c.recamaras) + '">') + campo("Baños", '<input name="banos" value="' + esc(c.banos == null ? "" : c.banos) + '">') + "</div>" +
        campo("Camas (resumen)", '<input name="camas" value="' + esc(c.camas || "") + '">') +
        campo("Camas por recámara <small>(una por línea: Nombre | camas | número de foto)</small>", '<textarea name="habitaciones" rows="4" placeholder="Recámara principal | 1 king | 8">' + esc((c.habitaciones || []).map(function (h) { return [h.nombre, h.camas, h.foto == null ? "" : h.foto + 1].join(" | "); }).join("\n")) + "</textarea>") +
        campo("Amenidades <small>(una por línea)</small>", '<textarea name="amenidades" rows="6">' + esc((c.amenidades || []).join("\n")) + "</textarea>") +
        campo("Reglas de la casa <small>(una por línea)</small>", '<textarea name="reglas" rows="2">' + esc((c.reglas || []).join("\n")) + "</textarea>") +
        campo("Enlace de Google Maps", '<input name="maps" type="url" placeholder="https://maps.app.goo.gl/…" value="' + esc(c.maps || "") + '">') +
        '<div class="adm-acciones"><button class="boton boton--terracota" type="submit">Guardar casa</button>' + (D.casas[c.id] ? '<button class="boton boton--linea" type="button" id="casa-reset">Volver a los datos originales</button>' : "") +
        '<a class="boton boton--linea" target="_blank" rel="noopener" href="./#casa-' + c.id + '">Ver en la página</a></div></form>') : vacio("Elige una casa para editar su información."));
    [].forEach.call(document.querySelectorAll("[data-casa]"), function (b) { b.addEventListener("click", function () { casaSel = b.getAttribute("data-casa"); vCasas(); }); });
    var form = $("#f-casa"); if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault(); var d = Object.fromEntries(new FormData(form)), lineas = function (s) { return String(s || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); };
      var o = {
        oculta: !!d.oculta, nombre: d.nombre, etiqueta: d.etiqueta, resumen: d.resumen, camas: d.camas, maps: d.maps,
        personas: d.pmin && d.pmax ? [+d.pmin, +d.pmax] : null, recamaras: d.recamaras === "" ? null : (isNaN(+d.recamaras) ? d.recamaras : +d.recamaras),
        banos: d.banos === "" ? null : (isNaN(+d.banos) ? d.banos : +d.banos), amenidades: lineas(d.amenidades), reglas: lineas(d.reglas),
        habitaciones: lineas(d.habitaciones).map(function (l) { var p = l.split("|").map(function (x) { return x.trim(); }); return { nombre: p[0], camas: p[1] || "", foto: p[2] ? (+p[2] - 1) : null }; })
      };
      if (d.maps && !/^https:\/\//.test(d.maps)) return toast("El enlace de Maps debe empezar con https://", true);
      var todo = Object.assign({}, D.casas); todo[casaSel] = o; guardar("casas", todo, "Casa guardada");
    });
    if ($("#casa-reset")) $("#casa-reset").addEventListener("click", function () { var todo = Object.assign({}, D.casas); delete todo[casaSel]; guardar("casas", todo, "Datos originales restaurados"); });
  }

  /* ================= EVALUACIONES ================= */
  var filtroEv = "pendiente", agregarEv = false;
  function tarjetaEv(e, acciones) {
    return '<article class="adm-ev"><header><strong>' + esc(e.nombre) + "</strong> <small>" + esc(e.ciudad || "") + (e.fecha ? " · " + esc(e.fecha) : "") + " · " + esc(nombreCasa(e.casa)) + (e.origen ? " · vía " + esc(e.origen) : "") + "</small></header>" +
      '<p class="adm-ev__est est' + (e.estrellas <= 2 ? " est--baja" : "") + '">' + estrellas(e.estrellas) + "</p>" +
      (Object.keys(e.categorias || {}).length ? '<p class="adm-ev__cats">' + CATS.filter(function (c) { return e.categorias[c[0]]; }).map(function (c) { return '<span class="' + (e.categorias[c[0]] <= 2 ? "baja" : "") + '">' + c[1] + " " + e.categorias[c[0]] + "</span>"; }).join("") + "</p>" : "") +
      "<p>" + esc(e.texto) + "</p>" + (e.telefono ? "<p><small>Teléfono (privado): " + esc(e.telefono) + "</small></p>" : "") + acciones + "</article>";
  }
  function vEvaluaciones() {
    var lista = D.evaluaciones.filter(function (e) { return filtroEv === "todas" || e.estado === filtroEv; }).sort(function (a, b) { return String(b.recibida).localeCompare(String(a.recibida)); });
    $("#vista").innerHTML = '<h1 class="adm-h1">Evaluaciones</h1><p class="adm-sub">Al publicar: las de <strong>3 ★ o más</strong> se ven completas en la página; las de <strong>1–2 ★</strong> cuentan en el promedio, pero su texto solo aparece en «Áreas de oportunidad». Rechaza únicamente spam, ofensas o reseñas de personas que no se hospedaron.</p>' +
      '<div class="adm-fila adm-filtros">' + sel("fe", ["pendiente", "publicada", "rechazada", "todas"], filtroEv, ["Por revisar", "Publicadas", "Rechazadas", "Todas"]) + '<button class="boton boton--linea boton--chico" id="ev-nueva" type="button">' + (agregarEv ? "Cerrar" : "Agregar una evaluación recibida por otro medio") + "</button></div>" +
      (agregarEv ? panel("Evaluación recibida por WhatsApp, Facebook u otro medio", '<form class="adm-form" id="f-ev">' + campo("Casa", '<select name="casa" required>' + opcionesCasas("") + "</select>") +
        '<div class="adm-fila">' + campo("Nombre", '<input name="nombre" required>') + campo("Ciudad", '<input name="ciudad">') + "</div>" +
        '<div class="adm-fila adm-fila--3">' + campo("Mes de estancia", '<input name="fecha" type="month">') + campo("Estrellas", sel("estrellas", ["5", "4", "3", "2", "1"], "5")) + campo("Origen", sel("origen", ["WhatsApp", "Facebook", "Instagram", "Airbnb", "Google", "En persona"], "WhatsApp")) + "</div>" +
        campo("Texto (tal como lo escribió el huésped)", '<textarea name="texto" rows="3" required></textarea>') + '<div class="adm-acciones"><button class="boton boton--terracota" type="submit">Guardar y publicar</button></div></form>') : "") +
      (lista.length ? '<div class="adm-evs">' + lista.map(function (e) {
        return tarjetaEv(e, '<div class="adm-acciones">' + (e.estado !== "publicada" ? '<button class="boton boton--terracota boton--chico" data-ev="' + e.id + '" data-a="publicada">Publicar</button>' : "") +
          (e.estado !== "rechazada" ? '<button class="boton boton--linea boton--chico" data-ev="' + e.id + '" data-a="rechazada">Rechazar</button>' : "") +
          (e.estado !== "pendiente" ? '<button class="boton boton--linea boton--chico" data-ev="' + e.id + '" data-a="pendiente">Regresar a revisión</button>' : "") +
          '<span class="pill pill--' + e.estado + '">' + e.estado + "</span></div>");
      }).join("") + "</div>" : vacio(filtroEv === "pendiente" ? "No hay evaluaciones por revisar." : "No hay evaluaciones con este filtro."));
    $("#fe").addEventListener("change", function (e) { filtroEv = e.target.value; vEvaluaciones(); });
    $("#ev-nueva").addEventListener("click", function () { agregarEv = !agregarEv; vEvaluaciones(); });
    [].forEach.call(document.querySelectorAll("[data-ev]"), function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-ev"), a = b.getAttribute("data-a");
      guardar("evaluaciones", D.evaluaciones.map(function (e) { return e.id === id ? Object.assign({}, e, { estado: a }) : e; }), a === "publicada" ? "Evaluación publicada" : "Evaluación actualizada");
    }); });
    var fe = $("#f-ev"); if (fe) fe.addEventListener("submit", function (e) {
      e.preventDefault(); var d = Object.fromEntries(new FormData(fe));
      if (String(d.texto).trim().length < 10) return toast("Escribe el texto de la evaluación.", true);
      agregarEv = false;
      guardar("evaluaciones", D.evaluaciones.concat([{ casa: d.casa, nombre: d.nombre, ciudad: d.ciudad, fecha: d.fecha, estrellas: +d.estrellas, texto: d.texto, origen: d.origen, estado: "publicada", categorias: {} }]), "Evaluación agregada");
    });
  }

  /* ================= ÁREAS DE OPORTUNIDAD ================= */
  function vOportunidad() {
    var l = oportunidades().sort(function (a, b) { return (a.atendida - b.atendida) || String(b.recibida).localeCompare(String(a.recibida)); });
    var porCasa = {}, porCat = {};
    l.forEach(function (e) { porCasa[e.casa] = (porCasa[e.casa] || 0) + 1; Object.keys(e.categorias || {}).forEach(function (c) { if (e.categorias[c] <= 2) porCat[c] = (porCat[c] || 0) + 1; }); });
    $("#vista").innerHTML = '<h1 class="adm-h1">Áreas de oportunidad</h1><p class="adm-sub">Evaluaciones de 1–2 ★ y comentarios con alguna categoría de 1–2. <strong>Su texto no aparece en la página pública.</strong> Contacta al huésped, corrige y anota qué hiciste.</p>' +
      '<div class="adm-cols">' + panel("Por casa", Object.keys(porCasa).length ? '<ul class="adm-lista">' + Object.keys(porCasa).sort(function (a, b) { return porCasa[b] - porCasa[a]; }).map(function (c) { return "<li><strong>" + esc(nombreCasa(c)) + "</strong>: " + porCasa[c] + "</li>"; }).join("") + "</ul>" : vacio("Sin comentarios críticos.")) +
      panel("Por categoría", Object.keys(porCat).length ? '<ul class="adm-lista">' + Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; }).map(function (c) { return "<li><strong>" + CATS.find(function (x) { return x[0] === c; })[1] + "</strong>: " + porCat[c] + "</li>"; }).join("") + "</ul>" : vacio("Sin categorías con calificación baja.")) + "</div>" +
      (l.length ? '<div class="adm-evs">' + l.map(function (e) {
        return tarjetaEv(e, '<label class="adm-campo"><span>Seguimiento</span><textarea rows="2" data-seg="' + e.id + '" placeholder="Ej.: Se habló con el huésped; se cambió la bomba de la alberca.">' + esc(e.seguimiento || "") + "</textarea></label>" +
          '<div class="adm-acciones"><label class="adm-check"><input type="checkbox" data-at="' + e.id + '"' + (e.atendida ? " checked" : "") + "> Atendida</label><button class=\"boton boton--terracota boton--chico\" data-guardar-op=\"" + e.id + '">Guardar</button>' +
          (e.estado === "pendiente" ? ' <span class="pill pill--pendiente">sin revisar</span>' : "") + "</div>");
      }).join("") + "</div>" : vacio("No hay áreas de oportunidad registradas. ¡Buen trabajo!"));
    [].forEach.call(document.querySelectorAll("[data-guardar-op]"), function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-guardar-op");
      guardar("evaluaciones", D.evaluaciones.map(function (e) { return e.id === id ? Object.assign({}, e, { seguimiento: $('[data-seg="' + id + '"]').value, atendida: $('[data-at="' + id + '"]').checked }) : e; }), "Seguimiento guardado");
    }); });
  }

  /* ================= ATRACTIVOS Y RECOMENDADOS ================= */
  var editLugar = null;
  var SEMILLA = [
    { nombre: "Zona arqueológica de Malinalco", categoria: "Historia prehispánica", descripcion: "El templo de Cuauhtinchan está tallado directamente en la roca del cerro. La subida regala una de las mejores vistas del valle." },
    { nombre: "Ex convento agustino", categoria: "Arquitectura colonial", descripcion: "Construido en el siglo XVI, conserva pintura mural con escenas de flora y fauna. Está en el corazón del pueblo." },
    { nombre: "Museo Universitario Dr. Luis Mario Schneider", categoria: "Cultura", descripcion: "Ideal para entender la historia de la región antes o después de visitar la zona arqueológica." }
  ];
  function vLugares(col) {
    var titulo = col === "atractivos" ? "Atractivos turísticos" : "Lugares recomendados";
    var sub = col === "atractivos" ? "Aparecen en la sección «Qué hacer» de la página." : "Restaurantes, cafés, tiendas y paseos. Aparecen en su propia sección con filtro por categoría.";
    var l = D[col], e = editLugar && editLugar.col === col ? editLugar.item : {};
    var cats = col === "atractivos" ? ["Historia prehispánica", "Arquitectura colonial", "Cultura", "Naturaleza", "Aventura", "Mirador"] : ["Restaurante", "Café", "Bar", "Tienda", "Spa", "Paseo", "Naturaleza", "Aventura"];
    $("#vista").innerHTML = '<h1 class="adm-h1">' + titulo + '</h1><p class="adm-sub">' + sub + "</p>" +
      '<div class="adm-cols adm-cols--form">' + panel(e.id ? "Editar" : "Agregar", '<form class="adm-form" id="f-lugar">' +
        '<div class="adm-fila">' + campo("Nombre", '<input name="nombre" required value="' + esc(e.nombre || "") + '">') + campo("Categoría", '<input name="categoria" list="cats" value="' + esc(e.categoria || "") + '"><datalist id="cats">' + cats.map(function (c) { return '<option value="' + c + '">'; }).join("") + "</datalist>") + "</div>" +
        campo("Descripción", '<textarea name="descripcion" rows="3">' + esc(e.descripcion || "") + "</textarea>") +
        campo("Dirección", '<input name="direccion" value="' + esc(e.direccion || "") + '">') +
        '<div class="adm-fila">' + campo("Google Maps", '<input name="maps" type="url" placeholder="https://…" value="' + esc(e.maps || "") + '">') + campo("Sitio web o Instagram", '<input name="web" type="url" placeholder="https://…" value="' + esc(e.web || "") + '">') + "</div>" +
        campo("Teléfono", '<input name="telefono" type="tel" value="' + esc(e.telefono || "") + '">') +
        '<label class="adm-check"><input type="checkbox" name="visible"' + (e.visible === false ? "" : " checked") + "> Visible en la página</label>" +
        '<div class="adm-acciones"><button class="boton boton--terracota" type="submit">' + (e.id ? "Guardar" : "Agregar") + "</button>" + (e.id ? '<button class="boton boton--linea" type="button" id="l-cancel">Cancelar</button>' : "") + "</div></form>") +
      panel("Lista (" + l.length + ")", (l.length ? '<ol class="adm-ordenable">' + l.map(function (x, i) {
        return '<li><div><strong>' + esc(x.nombre) + "</strong> <small>" + esc(x.categoria || "") + (x.visible === false ? " · oculto" : "") + '</small></div><div class="adm-acciones">' +
          '<button class="enlace-oscuro" data-sub="' + i + '" aria-label="Subir">↑</button><button class="enlace-oscuro" data-baj="' + i + '" aria-label="Bajar">↓</button><button class="enlace-oscuro" data-ed="' + i + '">Editar</button><button class="enlace-oscuro" data-del="' + i + '">Borrar</button></div></li>';
      }).join("") + "</ol>" : vacio("Todavía no hay elementos." + (col === "atractivos" ? ' <button class="enlace-oscuro" id="semilla">Cargar los 3 atractivos que hoy muestra la página</button>' : ""))) ) + "</div>";
    var form = $("#f-lugar");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); var d = Object.fromEntries(new FormData(form)); d.visible = !!d.visible;
      if ((d.maps && !/^https:\/\//.test(d.maps)) || (d.web && !/^https:\/\//.test(d.web))) return toast("Los enlaces deben empezar con https://", true);
      var nueva = e.id ? l.map(function (x) { return x.id === e.id ? Object.assign({}, x, d) : x; }) : l.concat([d]);
      guardar(col, nueva, e.id ? "Guardado" : "Agregado").then(function () { editLugar = null; vLugares(col); });
    });
    if ($("#l-cancel")) $("#l-cancel").addEventListener("click", function () { editLugar = null; vLugares(col); });
    if ($("#semilla")) $("#semilla").addEventListener("click", function () { guardar(col, SEMILLA, "Atractivos cargados"); });
    var mover = function (i, j) { if (j < 0 || j >= l.length) return; var c = l.slice(); var t = c[i]; c[i] = c[j]; c[j] = t; guardar(col, c, "Orden guardado"); };
    [].forEach.call(document.querySelectorAll("[data-sub]"), function (b) { b.addEventListener("click", function () { var i = +b.getAttribute("data-sub"); mover(i, i - 1); }); });
    [].forEach.call(document.querySelectorAll("[data-baj]"), function (b) { b.addEventListener("click", function () { var i = +b.getAttribute("data-baj"); mover(i, i + 1); }); });
    [].forEach.call(document.querySelectorAll("[data-ed]"), function (b) { b.addEventListener("click", function () { editLugar = { col: col, item: l[+b.getAttribute("data-ed")] }; vLugares(col); window.scrollTo(0, 0); }); });
    [].forEach.call(document.querySelectorAll("[data-del]"), function (b) { b.addEventListener("click", function () {
      if (b.getAttribute("data-ok") !== "1") { b.setAttribute("data-ok", "1"); b.textContent = "¿Seguro? Toca otra vez"; return; }
      var i = +b.getAttribute("data-del"); guardar(col, l.filter(function (_, j) { return j !== i; }), "Borrado");
    }); });
  }
  // Confirmación de borrado de reservas (dos toques) y edición
  document.addEventListener("click", function (e) {
    var ed = e.target.closest("[data-ed-res]"); if (ed) { editRes = D.reservas.find(function (r) { return r.id === ed.getAttribute("data-ed-res"); }); vReservas(); window.scrollTo(0, 0); return; }
    var de = e.target.closest("[data-del-res]"); if (!de) return;
    if (de.getAttribute("data-ok") !== "1") { de.setAttribute("data-ok", "1"); de.textContent = "¿Seguro?"; return; }
    var id = de.getAttribute("data-del-res"); guardar("reservas", D.reservas.filter(function (r) { return r.id !== id; }), "Reserva borrada");
  });

  /* ================= AJUSTES ================= */
  function vAjustes() {
    $("#vista").innerHTML = '<h1 class="adm-h1">Ajustes</h1>' +
      panel("Disponibilidad en la página", '<label class="adm-check"><input type="checkbox" id="aj-disp"' + (D.config.mostrarDisponibilidad ? " checked" : "") + "> Mostrar «Disponible / Ocupada» según las reservas registradas</label>" +
        '<p class="adm-sub">Actívalo cuando todas las reservas (de WhatsApp, Airbnb, etc.) estén registradas aquí. Mientras esté apagado, cada casa dice «Consulta disponibilidad».</p>') +
      panel("Respaldo", '<p class="adm-sub">Descarga una copia de todas las reservas, evaluaciones y cambios. Guárdala cada semana.</p><div class="adm-acciones"><button class="boton boton--terracota" id="aj-desc" type="button">Descargar respaldo</button></div>') +
      panel("Seguridad", '<ul class="adm-lista"><li>La contraseña se configura en Netlify → Project configuration → Environment variables → <code>ADMIN_PASSWORD</code>.</li><li>La sesión dura 12 horas; usa «Salir» en computadoras compartidas.</li><li>Tras 8 intentos fallidos, el acceso se bloquea 15 minutos.</li></ul>');
    $("#aj-disp").addEventListener("change", function (e) { guardar("config", { mostrarDisponibilidad: e.target.checked }, e.target.checked ? "Disponibilidad visible en la página" : "Disponibilidad oculta"); });
    $("#aj-desc").addEventListener("click", function () {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2)], { type: "application/json" }));
      a.download = "respaldo-malinalco-magico-" + k(HOY) + ".json"; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  if (TOKEN) cargar();
})();
