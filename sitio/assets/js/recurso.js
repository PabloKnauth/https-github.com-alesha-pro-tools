(function () {
  "use strict";
  var abierto = false;
  try { abierto = localStorage.getItem("biblioteca-desbloqueada-v1") === "1"; } catch (e) {}
  var imprimir = /[?&]imprimir\b/.test(location.search);
  var compuerta = document.getElementById("compuerta");
  if (compuerta && !abierto && !imprimir) compuerta.hidden = false;

  // En el PDF, cada título viaja con su primer bloque para no quedar solo al pie de página.
  if (imprimir) {
    document.querySelectorAll(".doc h2, .doc h3").forEach(function (h) {
      var sig = h.nextElementSibling; if (!sig) return;
      var caja = document.createElement("div"); caja.className = "mantener";
      h.parentNode.insertBefore(caja, h); caja.appendChild(h); caja.appendChild(sig);
    });
  }

  function copiar(btn, texto) {
    function listo(ok) {
      var antes = btn.getAttribute("data-t") || btn.textContent;
      btn.setAttribute("data-t", antes);
      btn.textContent = ok ? "¡Copiado!" : "Selecciónalo y copia";
      setTimeout(function () { btn.textContent = antes; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { listo(true); }, function () { seleccionar(); listo(false); });
    } else { seleccionar(); listo(false); }
    function seleccionar() {
      var pre = btn.parentNode.querySelector("pre");
      var r = document.createRange(); r.selectNodeContents(pre);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".copiar"); if (!b) return;
    copiar(b, b.parentNode.querySelector("pre").innerText.trim());
  });
})();
