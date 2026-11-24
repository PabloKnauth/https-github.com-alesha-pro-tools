(function () {
  "use strict";
  var raiz = document.documentElement, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  raiz.classList.add("js");
  requestAnimationFrame(function () { document.querySelector(".hero").classList.add("listo"); });

  // Revelado escalonado al entrar en pantalla
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  document.querySelectorAll(".revela").forEach(function (el) {
    var hermanos = Array.prototype.filter.call(el.parentNode.children, function (h) { return h.classList.contains("revela"); });
    el.style.setProperty("--d", Math.min(hermanos.indexOf(el), 5) * 0.08 + "s");
    io.observe(el);
  });

  // Barra: sólida al bajar, se oculta al hacer scroll hacia abajo
  var barra = document.querySelector("[data-barra]"), ultimo = 0;
  addEventListener("scroll", function () {
    var y = scrollY;
    barra.classList.toggle("solida", y > 40);
    barra.classList.toggle("oculta", y > 400 && y > ultimo);
    ultimo = y;
  }, { passive: true });

  // Cinta de clientes: se duplica para un bucle continuo
  var cinta = document.querySelector("[data-cinta]");
  if (cinta) cinta.innerHTML += cinta.innerHTML;

  // Reels: se reproducen solo cuando están a la vista
  var vio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { var v = e.target; if (e.isIntersecting && !quieto) v.play().catch(function () {}); else v.pause(); });
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-reel]").forEach(function (v) {
    vio.observe(v);
    v.addEventListener("click", function () { v.muted = !v.muted; if (v.paused) v.play(); });
  });
})();
