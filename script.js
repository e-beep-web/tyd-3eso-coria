/* Tecnología y Digitalización · 3.º ESO · Coria del Río
   Todo el comportamiento del sitio. Sin librerías externas. */
(function () {
  "use strict";

  /* ---------- almacenamiento tolerante a fallos ---------- */
  var mem = {};
  function leer(k, def) {
    try { var v = localStorage.getItem(k); return v === null ? def : v; }
    catch (e) { return k in mem ? mem[k] : def; }
  }
  function guardar(k, v) {
    try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; }
  }
  function borrarPrefijo(p) {
    try {
      var fuera = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(p) === 0) fuera.push(k);
      }
      fuera.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { mem = {}; }
  }

  /* ---------- tema claro / oscuro ---------- */
  var temaGuardado = leer("tyd:tema", "");
  if (temaGuardado) document.documentElement.setAttribute("data-tema", temaGuardado);

  function alternarTema() {
    var actual = document.documentElement.getAttribute("data-tema");
    if (!actual) {
      var oscuroSistema = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      actual = oscuroSistema ? "oscuro" : "claro";
    }
    var nuevo = actual === "oscuro" ? "claro" : "oscuro";
    document.documentElement.setAttribute("data-tema", nuevo);
    guardar("tyd:tema", nuevo);
    document.querySelectorAll("[data-tema-bt]").forEach(function (b) {
      b.setAttribute("aria-pressed", nuevo === "oscuro" ? "true" : "false");
    });
  }

  /* ---------- mapa conceptual ---------- */
  function abrirSeccion(id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    if (sec.tagName.toLowerCase() === "details") sec.open = true;
    var padre = sec.closest("details");
    if (padre && padre !== sec) padre.open = true;
    sec.scrollIntoView({ behavior: "smooth", block: "start" });
    sec.classList.remove("destacado-ancla");
    void sec.offsetWidth;
    sec.classList.add("destacado-ancla");
  }

  function iniciarMapa() {
    var svg = document.querySelector(".mapa-lienzo svg");
    document.querySelectorAll("[data-destino]").forEach(function (el) {
      var ir = function (ev) {
        ev.preventDefault();
        var destino = el.getAttribute("data-destino");
        if (svg) {
          svg.querySelectorAll(".enlace").forEach(function (l) {
            l.style.stroke = "";
            l.style.strokeWidth = "";
          });
          svg.querySelectorAll('[data-enlace-de="' + destino + '"]').forEach(function (l) {
            l.style.stroke = "var(--ambar)";
            l.style.strokeWidth = "3.2";
          });
        }
        abrirSeccion(destino);
      };
      el.addEventListener("click", ir);
      el.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") ir(ev);
      });
    });
  }

  /* ---------- progreso por unidad ---------- */
  function iniciarProgreso() {
    var cont = document.querySelector("[data-progreso-ud]");
    if (!cont) return;
    var ud = cont.getAttribute("data-progreso-ud");
    var casillas = document.querySelectorAll("[data-tarea]");
    var relleno = cont.querySelector(".relleno");
    var texto = cont.querySelector("[data-progreso-txt]");

    function pinta() {
      var hechas = 0;
      casillas.forEach(function (c) { if (c.checked) hechas++; });
      var pct = casillas.length ? Math.round((hechas / casillas.length) * 100) : 0;
      if (relleno) relleno.style.width = pct + "%";
      if (texto) texto.textContent = hechas + " de " + casillas.length +
        " ejercicios marcados (" + pct + " %)";
      guardar("tyd:ud" + ud + ":pct", String(pct));
    }

    casillas.forEach(function (c) {
      var clave = "tyd:ud" + ud + ":" + c.getAttribute("data-tarea");
      c.checked = leer(clave, "0") === "1";
      c.addEventListener("change", function () {
        guardar(clave, c.checked ? "1" : "0");
        pinta();
      });
    });
    pinta();

    var reset = cont.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", function () {
      if (!window.confirm("¿Desmarcar todos los ejercicios de esta unidad?")) return;
      casillas.forEach(function (c) {
        c.checked = false;
        guardar("tyd:ud" + ud + ":" + c.getAttribute("data-tarea"), "0");
      });
      pinta();
    });
  }

  /* ---------- progreso global (portada de un curso) ---------- */
  function iniciarProgresoGlobal() {
    var cont = document.querySelector("[data-progreso-global]");
    if (!cont) return;
    var slug = cont.getAttribute("data-progreso-global") || "";
    var n = parseInt(cont.getAttribute("data-n-uds"), 10) || 0;
    var total = 0;
    for (var i = 1; i <= n; i++) {
      total += parseInt(leer("tyd:ud" + slug + i + ":pct", "0"), 10) || 0;
    }
    var media = n ? Math.round(total / n) : 0;
    var relleno = cont.querySelector(".relleno");
    var txt = cont.querySelector("[data-progreso-txt]");
    if (relleno) relleno.style.width = media + "%";
    if (txt) txt.textContent = media === 0
      ? "Aún no has marcado ningún ejercicio."
      : "Progreso del curso: " + media + " %";
    document.querySelectorAll("[data-pct-ud]").forEach(function (el) {
      var p = parseInt(leer("tyd:ud" + el.getAttribute("data-pct-ud") + ":pct", "0"), 10) || 0;
      if (p > 0) el.textContent = p + " % marcado";
    });
    var reset = cont.querySelector("[data-reset-todo]");
    if (reset) reset.addEventListener("click", function () {
      if (!window.confirm("Esto borra tus marcas de las " + n +
                          " unidades de este curso en este navegador. ¿Seguro?")) return;
      borrarPrefijo("tyd:ud" + slug);
      location.reload();
    });
  }

  /* ---------- glosario ---------- */
  function iniciarGlosario() {
    var campo = document.querySelector("[data-buscador]");
    if (!campo) return;
    var items = Array.prototype.slice.call(document.querySelectorAll(".glos-item"));
    var grupos = Array.prototype.slice.call(document.querySelectorAll(".glos-grupo"));
    var vacio = document.querySelector("[data-sin-resultados]");
    campo.addEventListener("input", function () {
      var q = campo.value.trim().toLowerCase();
      var visibles = 0;
      items.forEach(function (it) {
        var ok = !q || it.textContent.toLowerCase().indexOf(q) !== -1;
        it.style.display = ok ? "" : "none";
        if (ok) visibles++;
      });
      grupos.forEach(function (g) {
        var algo = g.querySelectorAll('.glos-item:not([style*="display: none"])').length;
        g.style.display = algo ? "" : "none";
      });
      if (vacio) vacio.style.display = visibles ? "none" : "";
    });
  }

  /* ---------- cuestionario de diagnóstico ---------- */
  function iniciarCuestionario() {
    var form = document.querySelector("[data-cuestionario]");
    if (!form) return;
    var salida = document.querySelector("[data-resultado]");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var aciertos = 0, corregibles = 0, sinResponder = 0;
      form.querySelectorAll(".preg").forEach(function (p) {
        var correcta = p.getAttribute("data-correcta");
        var marcada = p.querySelector("input:checked");
        if (correcta === null) return;
        corregibles++;
        if (!marcada) { sinResponder++; }
        p.querySelectorAll(".opc").forEach(function (o) {
          o.classList.remove("ok", "ko");
          var val = o.querySelector("input").value;
          if (val === correcta) o.classList.add("ok");
          else if (marcada && marcada.value === val) o.classList.add("ko");
        });
        if (marcada && marcada.value === correcta) aciertos++;
        var exp = p.querySelector(".explica");
        if (exp) exp.style.display = "block";
      });
      var msg;
      if (aciertos <= 2) msg = "Vas a partir casi de cero en varios temas, y eso está perfectamente bien: para eso es el curso.";
      else if (aciertos <= 4) msg = "Tienes una base en algunos bloques y huecos en otros. Normal a estas alturas.";
      else if (aciertos <= 6) msg = "Llegas con una base sólida. Aprovecha para profundizar donde fallaste.";
      else msg = "Llegas muy bien preparado. Te vendrá bien buscar el reto en los apartados avanzados.";
      if (salida) {
        salida.innerHTML = "<h2>Resultado: " + aciertos + " de " + corregibles + "</h2>" +
          "<p>" + msg + "</p>" +
          (sinResponder ? "<p>Has dejado " + sinResponder + " pregunta(s) sin responder.</p>" : "") +
          "<p><strong>Esto no es una nota y no cuenta para nada.</strong> Solo sirve para saber por " +
          "dónde empezar. Revisa arriba las respuestas correctas y sus explicaciones.</p>";
        salida.style.display = "block";
        salida.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  /* ---------- presentación ---------- */
  function iniciarPresentacion() {
    var dias = document.querySelectorAll(".dia");
    if (!dias.length || !document.querySelector("[data-presentacion]")) return;
    document.addEventListener("keydown", function (ev) {
      var i, actual = 0;
      var y = window.scrollY + 80;
      for (i = 0; i < dias.length; i++) if (dias[i].offsetTop <= y) actual = i;
      if (ev.key === "ArrowRight" || ev.key === "PageDown") {
        if (actual < dias.length - 1) {
          ev.preventDefault();
          dias[actual + 1].scrollIntoView({ behavior: "smooth" });
        }
      } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
        if (actual > 0) {
          ev.preventDefault();
          dias[actual - 1].scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  }

  /* ---------- abrir la sección apuntada por el hash ---------- */
  function abrirDesdeHash() {
    if (!location.hash) return;
    var el = document.querySelector(location.hash);
    if (!el) return;
    var d = el.closest("details");
    if (d) d.open = true;
    if (el.tagName.toLowerCase() === "details") el.open = true;
    setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 60);
  }

  /* ---------- arranque ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-tema-bt]").forEach(function (b) {
      b.addEventListener("click", alternarTema);
    });
    document.querySelectorAll("[data-abrir-todo]").forEach(function (b) {
      b.addEventListener("click", function () {
        var abrir = b.getAttribute("data-abierto") !== "1";
        document.querySelectorAll("details.seccion").forEach(function (d) { d.open = abrir; });
        b.setAttribute("data-abierto", abrir ? "1" : "0");
        b.textContent = abrir ? "Plegar todo" : "Desplegar todo";
      });
    });
    iniciarMapa();
    iniciarProgreso();
    iniciarProgresoGlobal();
    iniciarGlosario();
    iniciarCuestionario();
    iniciarPresentacion();
    abrirDesdeHash();
    window.addEventListener("beforeprint", function () {
      document.querySelectorAll("details").forEach(function (d) {
        if (!d.open) { d.setAttribute("data-cerrado-impr", "1"); d.open = true; }
      });
    });
    window.addEventListener("afterprint", function () {
      document.querySelectorAll('[data-cerrado-impr="1"]').forEach(function (d) {
        d.open = false; d.removeAttribute("data-cerrado-impr");
      });
    });
  });
})();
