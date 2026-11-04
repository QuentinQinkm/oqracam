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

  // Prepare the actual image, including its decode, before hiding the old one.
  // Keep only the neighbours warm; the whole gallery needn't download at load.
  var ready = {}, near = false, shown = i, request = 0;
  function preload(n) {
    n = (n + total) % total;
    if (ready[n]) return ready[n];
    var img = imgs[n];
    img.loading = "eager";
    var src = img.getAttribute("data-src") || img.getAttribute("src");
    if (src && img.getAttribute("src") !== src) img.src = src;
    ready[n] = (img.decode ? img.decode() : new Promise(function (resolve, reject) {
      if (img.complete) {
        if (img.naturalWidth) resolve(); else reject(new Error("Image unavailable"));
        return;
      }
      function loaded() { cleanup(); resolve(); }
      function failed() { cleanup(); reject(new Error("Image unavailable")); }
      function cleanup() {
        img.removeEventListener("load", loaded);
        img.removeEventListener("error", failed);
      }
      img.addEventListener("load", loaded);
      img.addEventListener("error", failed);
    })).then(function () { return true; }, function () {
      delete ready[n];
      return false;
    });
    return ready[n];
  }

  function warmNeighbours() {
    if (!near) return;
    preload(i + 1);
    preload(i - 1);
  }

  function show(n) {
    i = (n + total) % total;                   // wrap around both ends
    near = true;
    var target = i, token = ++request;
    preload(target).then(function (loaded) {
      if (token !== request) return;
      if (!loaded) { i = shown; return; }
      imgs[shown].classList.remove("is-active");
      imgs[target].classList.add("is-active");
      shown = target;
      if (counter) counter.textContent = pad(target + 1) + " / " + pad(total);
      warmNeighbours();
    });
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

  // Load one viewport ahead, keeping these requests off the hero's load path.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      near = true; io.disconnect();
      preload(i); warmNeighbours();
    }, { rootMargin: (window.innerHeight || 800) + "px 0px" });
    io.observe(gallery);
  }

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

  if (counter) counter.textContent = pad(i + 1) + " / " + pad(total);
})();
