/* ============================================================
   Oqra — film build-up (#develop), DRAG-to-develop vertical WIPE
   ============================================================
   N stacked stills; a horizontal dragger (.develop__scrub) under the image
   scrubs through them. Each next stage is wiped in VERTICALLY (top→down) over
   the stage below it, led by a hard BLACK BAR — the #compare slider's reveal,
   turned vertical and black. Image 0 is the always-on base; image i is
   clip-path revealed from the top, so a solid frame is always under the wipe
   edge (never flashes black).

   No scroll, no pin, no auto-advance: the dragger position maps linearly to the
   fractional stage 0..N-1 (N derives from the DOM). Default = fully developed
   (handle right); drag left to rewind to the raw capture. Keyboard: arrows /
   Home / End. Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */

/* Shared, stateless helpers — used by both the #develop and #shareflow
   controllers below (closed over from file scope; defined once). */
var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

(function () {
  "use strict";
  var root = document.getElementById("develop");
  if (!root) return;
  var imgs = Array.prototype.slice.call(root.querySelectorAll(".develop__img"));
  var N = imgs.length;
  if (!N) return;
  var bar = root.querySelector(".develop__bar");
  var scrub = root.querySelector(".develop__scrub");
  var nameEl = document.getElementById("buildName");
  var subEl = document.getElementById("buildSub");
  var countEl = document.getElementById("buildCount");
  var lastIdx = -1;

  function clipFor(f) {
    if (f <= 0) return "inset(0 0 100% 0)";   // hidden
    if (f >= 1) return "none";                 // full
    return "inset(0 0 " + ((1 - f) * 100).toFixed(2) + "% 0)";
  }

  function caption(idx) {
    if (idx === lastIdx) return;
    lastIdx = idx;
    var el = imgs[idx];
    if (nameEl) nameEl.textContent = el.getAttribute("data-name") || "";
    if (subEl) subEl.textContent = el.getAttribute("data-sub") || "";
    if (countEl) countEl.textContent = pad(idx + 1) + " / " + pad(N);
  }

  // Paint the stacked wipe for a fractional stage 0..N-1: image 0 is the
  // always-on base, each later image is clip-revealed from the top, with a hard
  // black bar riding the seam mid-transition.
  function render(stage) {
    for (var i = 0; i < N; i++) {
      imgs[i].style.clipPath = (i === 0) ? "none" : clipFor(clamp(stage - (i - 1), 0, 1));
    }
    if (bar) {
      var frac = stage - Math.floor(stage);
      if (stage > 0 && stage < N - 1 && frac > 0.0015) {
        bar.style.top = (frac * 100).toFixed(2) + "%";
        bar.style.opacity = "1";
      } else {
        bar.style.opacity = "0";
      }
    }
    caption(clamp(Math.round(stage), 0, N - 1));
  }

  // Drag-to-develop: the horizontal scrubber drives the build — no scroll, no
  // auto-advance. Default fully developed (handle at the right); drag left to
  // rewind to the raw capture.
  var pos = 1;                                 // 0..1 along the scrubber
  function apply() {
    var stage = clamp(pos * (N - 1), 0, N - 1);
    if (scrub) {
      scrub.style.setProperty("--scrub", pos.toFixed(4));   // unitless 0..1; CSS insets the travel
      scrub.setAttribute("aria-valuenow", String(Math.round(stage)));
    }
    render(stage);
  }
  function setFromX(clientX) {
    if (!scrub) return;
    var r = scrub.getBoundingClientRect();
    var half = 17;   // = --handle / 2 in CSS — handle centre travels [half .. width-half]
    pos = clamp((clientX - r.left - half) / (r.width - 2 * half), 0, 1);
    apply();
  }

  if (scrub) {
    var dragging = false;
    scrub.addEventListener("pointerdown", function (e) {
      dragging = true;
      if (scrub.setPointerCapture) { try { scrub.setPointerCapture(e.pointerId); } catch (_) {} }
      setFromX(e.clientX);
      e.preventDefault();
    });
    scrub.addEventListener("pointermove", function (e) { if (dragging) { setFromX(e.clientX); e.preventDefault(); } });
    scrub.addEventListener("pointerup",   function () { dragging = false; });
    scrub.addEventListener("pointercancel", function () { dragging = false; });
    scrub.addEventListener("keydown", function (e) {
      var step = 1 / (N - 1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowDown") { pos = clamp(pos - step, 0, 1); apply(); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") { pos = clamp(pos + step, 0, 1); apply(); e.preventDefault(); }
      else if (e.key === "Home") { pos = 0; apply(); e.preventDefault(); }
      else if (e.key === "End")  { pos = 1; apply(); e.preventDefault(); }
    });
  }

  apply();   // initial paint — fully developed
})();

/* ============================================================
   Oqra — build → collect → share (#shareflow), scroll CROSSFADE
   ============================================================
   One pinned phone frame cross-fades through the three app screenshots in
   order (Build → Collect → Share) as the section scrolls. Stacked so the
   crossfade never dips to black: image 0 is the always-on base, each next
   fades in on top. HOLD·fade·HOLD timeline with a dwell on every shot
   (first/last included). N derives from the DOM. prefers-reduced-motion
   falls back to the CSS row (all three shown, no scroll bind).
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("shareflow");
  if (!root) return;
  var imgs = Array.prototype.slice.call(root.querySelectorAll(".shareflow__img"));
  var N = imgs.length;
  if (!N) return;
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var nameEl = document.getElementById("shareName");
  var subEl = document.getElementById("shareSub");
  var countEl = document.getElementById("shareCount");
  var lastIdx = -1;

  var HOLD = 28, FADE = 42;                        // matches the develop dwell/wipe
  var units = N * HOLD + (N - 1) * FADE;          // scroll budget, in vh
  root.style.setProperty("--shareflow-scroll", units + "vh");

  function stageAt(p) {                             // HOLD/fade/HOLD → 0..N-1
    var x = clamp(p, 0, 1) * units, acc = 0;
    for (var k = 0; k < N; k++) {
      if (x <= acc + HOLD) return k;
      acc += HOLD;
      if (k < N - 1) {
        if (x < acc + FADE) return k + (x - acc) / FADE;
        acc += FADE;
      }
    }
    return N - 1;
  }

  function caption(idx) {
    if (idx === lastIdx) return;
    lastIdx = idx;
    var el = imgs[idx];
    if (nameEl) nameEl.textContent = el.getAttribute("data-name") || "";
    if (subEl) subEl.textContent = el.getAttribute("data-sub") || "";
    if (countEl) countEl.textContent = pad(idx + 1) + " / " + pad(N);
  }

  var ticking = false;
  function update() {
    ticking = false;
    var scrollable = root.offsetHeight - window.innerHeight;
    var top = root.getBoundingClientRect().top;
    var stage = stageAt(scrollable > 0 ? clamp(-top / scrollable, 0, 1) : 0);
    for (var i = 0; i < N; i++) {
      // image 0 = always-on base; image i fades in over (i-1) across [i-1, i].
      imgs[i].style.opacity = (i === 0) ? "1" : clamp(stage - (i - 1), 0, 1).toFixed(3);
    }
    caption(clamp(Math.round(stage), 0, N - 1));
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
})();
