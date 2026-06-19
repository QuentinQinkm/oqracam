/* ============================================================
   Oqra — immersive sample gallery (shot on Oqra)
   ============================================================
   One photo at a time. Arrows, swipe, or arrow-keys cycle through all of them,
   wrapping around. The frame adapts to each photo's own shape (CSS), so nothing
   is ever cropped. Hard cut between photos — no fade/slide — which is on-brand
   and inherently reduced-motion-safe. Progressive: without JS the first photo
   stays visible (is-active in the markup). Vanilla, no deps, CSP-safe.
   ============================================================ */
(function () {
  "use strict";

  var gallery = document.querySelector(".gallery");
  if (!gallery) return;
  var imgs = Array.prototype.slice.call(gallery.querySelectorAll(".gallery__img"));
  if (imgs.length < 2) return;                 // nothing to cycle
  var stage = gallery.querySelector(".gallery__stage") || gallery;
  var counter = gallery.querySelector(".gallery__counter");
  var navs = gallery.querySelectorAll(".gallery__nav");
  var total = imgs.length;

  // Start from whichever image the markup marked active (fallback: first).
  var i = 0;
  for (var k = 0; k < total; k++) {
    if (imgs[k].classList.contains("is-active")) { i = k; break; }
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Warm a neighbour so the next flip paints instantly (lazy imgs only load
  // once shown otherwise). Each src is fetched at most once.
  var warmed = {};
  function preload(n) {
    n = (n + total) % total;
    if (warmed[n]) return;
    warmed[n] = true;
    var src = imgs[n].getAttribute("src");
    if (src) { var p = new Image(); p.src = src; }
  }

  function show(n) {
    i = (n + total) % total;                   // wrap around both ends
    for (var k = 0; k < total; k++) {
      imgs[k].classList.toggle("is-active", k === i);
    }
    if (counter) counter.textContent = pad(i + 1) + " / " + pad(total);
    preload(i + 1);
    preload(i - 1);
  }
  function go(dir) { show(i + dir); }

  Array.prototype.forEach.call(navs, function (btn) {
    btn.addEventListener("click", function () {
      go(parseInt(btn.getAttribute("data-dir"), 10) || 1);
    });
  });

  // Arrow keys work while focus is inside the gallery (e.g. on a nav button).
  gallery.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
  });

  // Once the page is idle, warm every photo into cache so each flip is an
  // instant hard cut (lazy imgs would otherwise blank on first view). Cheap —
  // five small JPEGs, fetched off the critical path.
  function warmAll() { for (var k = 0; k < total; k++) preload(k); }
  if (window.requestIdleCallback) window.requestIdleCallback(warmAll, { timeout: 2500 });
  else window.addEventListener("load", function () { window.setTimeout(warmAll, 800); }, { once: true });

  // Horizontal swipe on touch.
  var x0 = null, y0 = null;
  stage.addEventListener("touchstart", function (e) {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    x0 = y0 = null;
    // Only react to a deliberate horizontal swipe, not a vertical scroll.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  show(i);
})();
