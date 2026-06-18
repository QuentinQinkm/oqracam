/* ============================================================
   Oqra — film build-up (#develop), scroll-driven vertical WIPE
   ============================================================
   The frame steps through N stacked stills as the sticky section scrolls.
   Each next stage is wiped in VERTICALLY (top→down) over the stage below it,
   led by a hard BLACK BAR — the #compare slider's reveal, turned vertical and
   black. Image 0 is the always-on base; image i is clip-path revealed from the
   top, so a solid frame is always under the wipe edge (never flashes black).

   PACING: the scroll timeline is HOLD · wipe · HOLD · wipe · … · HOLD — every
   stage (including the FIRST and LAST) gets a dwell of redundant scroll where
   the frame holds still, with the wipe only happening between dwells. Hold /
   wipe distances (in vh) set both the scroll-to-stage mapping AND the section
   height (so the two always agree). N derives from the DOM.

   Vanilla, no deps, CSP-safe (script-src 'self'). The wipe runs at every width
   (portrait too); only prefers-reduced-motion falls back to the final frame.
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
  var nameEl = document.getElementById("buildName");
  var subEl = document.getElementById("buildSub");
  var countEl = document.getElementById("buildCount");
  var lastIdx = -1;

  // Per-stage scroll budget (vh): HOLD = redundant dwell at every stage
  // (incl. first/last), WIPE = the transition between two stages.
  var HOLD = 28, WIPE = 42;
  var holds = N, wipes = N - 1;
  var units = holds * HOLD + wipes * WIPE;     // total scroll budget, in vh
  // Section height = one read-screen + the timeline; keeps CSS in lockstep.
  root.style.setProperty("--develop-scroll", units + "vh");

  // Map scroll progress 0..1 → fractional stage 0..N-1 through the
  // HOLD/wipe/HOLD timeline. Holds return an integer (frame parked);
  // wipes return a fraction (mid-transition).
  function stageAt(p) {
    var x = clamp(p, 0, 1) * units, acc = 0;
    for (var k = 0; k < N; k++) {
      if (x <= acc + HOLD) return k;            // dwell on stage k
      acc += HOLD;
      if (k < N - 1) {
        if (x < acc + WIPE) return k + (x - acc) / WIPE;   // wipe k → k+1
        acc += WIPE;
      }
    }
    return N - 1;
  }

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

  var motionOK = !(window.matchMedia &&
                   window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function showStatic() {              // reduced-motion fallback: finished frame
    for (var i = 0; i < N; i++) {
      imgs[i].style.clipPath = (i === 0 || i === N - 1) ? "none" : "inset(0 0 100% 0)";
    }
    if (bar) bar.style.opacity = "0";
    caption(N - 1);
  }

  var ticking = false;
  function update() {
    ticking = false;
    // The whole section pins (#develop is tall; .develop__sticky stays put) on
    // both desktop and mobile, so the wipe keys off #develop's scroll progress.
    var scrollable = root.offsetHeight - window.innerHeight;
    var top = root.getBoundingClientRect().top;
    var progress = scrollable > 0 ? clamp(-top / scrollable, 0, 1) : 0;
    var stage = stageAt(progress);

    for (var i = 0; i < N; i++) {
      imgs[i].style.clipPath = (i === 0) ? "none" : clipFor(clamp(stage - (i - 1), 0, 1));
    }

    if (bar) {
      var frac = stage - Math.floor(stage);     // >0 only mid-wipe
      if (stage > 0 && stage < N - 1 && frac > 0.0015) {
        bar.style.top = (frac * 100).toFixed(2) + "%";
        bar.style.opacity = "1";
      } else {
        bar.style.opacity = "0";
      }
    }

    caption(clamp(Math.round(stage), 0, N - 1));
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  if (!motionOK) {
    showStatic();
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }
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
