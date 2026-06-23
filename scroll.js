/* ============================================================
   Oqra — shared scroll-transition helpers
   ============================================================
   Common pieces used by the pinned transitions (hero.js, and the #shareflow
   crossfade in stepper.js): the shared rhythm tokens, a rAF scroll/resize
   throttle, the HOLD·fade·HOLD stage mapping, and a caption updater. Loaded
   before its consumers. Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */
var OqraScroll = (function () {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  // The shared scroll rhythm tokens (vh): dwell on each stage, fade between.
  function tokens() {
    var cs = getComputedStyle(document.documentElement);
    return {
      hold: parseFloat(cs.getPropertyValue("--scroll-hold")) || 28,
      fade: parseFloat(cs.getPropertyValue("--scroll-fade")) || 42
    };
  }

  // rAF-throttled scroll + resize binding. Runs fn at most once per frame, and
  // once immediately.
  function onScroll(fn) {
    var ticking = false;
    function tick() { ticking = false; fn(); }
    function handler() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler, { passive: true });
    fn();
  }

  // HOLD·fade·HOLD over N stages → fractional stage 0..N-1. `x` is the vh of
  // travel consumed; each stage dwells for `hold`, with `fade` between stages.
  function stageAt(x, N, hold, fade) {
    var acc = 0;
    for (var k = 0; k < N; k++) {
      if (x <= acc + hold) return k;
      acc += hold;
      if (k < N - 1) {
        if (x < acc + fade) return k + (x - acc) / fade;
        acc += fade;
      }
    }
    return N - 1;
  }

  // Caption updater: returns fn(idx, total) that writes name/sub from each
  // element's data-name / data-sub and a padded count — once per index change.
  function captioner(els, nameEl, subEl, countEl) {
    var last = -1;
    return function (idx, total) {
      if (idx === last) return;
      last = idx;
      var el = els[idx];
      if (nameEl) nameEl.textContent = el.getAttribute("data-name") || "";
      if (subEl) subEl.textContent = el.getAttribute("data-sub") || "";
      if (countEl) countEl.textContent = pad(idx + 1) + " / " + pad(total);
    };
  }

  return {
    clamp: clamp, pad: pad, tokens: tokens,
    onScroll: onScroll, stageAt: stageAt, captioner: captioner
  };
})();
