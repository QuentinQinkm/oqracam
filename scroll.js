/* ============================================================
   Oqra — shared scroll-transition helpers
   ============================================================
   Common pieces used by the pinned sections (hero.js, sideways.js): the shared
   rhythm tokens, a rAF scroll/resize throttle, the HOLD·fade·HOLD stage
   mapping, and a caption updater. Loaded
   before its consumers. Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */
var OqraScroll = (function () {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  // Turn vertical motion into horizontal travel, then back, without a timed
  // catch-up animation. Integrating smoothstep makes velocity continuous at
  // both sticky boundaries, including when the user reverses direction.
  // The former holds remain in the travel budget, but no longer stop motion.
  function turnAt(scroll, distance, hold, edge) {
    if (distance <= 0) return { x: 0, y: 0 };
    var travel = distance + 2 * hold;
    edge = Math.min(Math.max(1, edge), travel / 2);
    var speed = distance / (travel - edge);
    var s = clamp(scroll, 0, travel);
    function integral(t) { return t * t * t * (1 - 0.5 * t); }
    if (s < edge) {
      var enter = s / edge, a = integral(enter);
      return { x: speed * edge * a, y: edge / 2 - edge * (enter - a) };
    }
    if (s > travel - edge) {
      var leave = (s - travel + edge) / edge, b = integral(leave);
      return { x: distance - speed * edge / 2 + speed * edge * (leave - b), y: -edge * b };
    }
    return { x: speed * (s - edge / 2), y: 0 };
  }

  // The shared scroll rhythm tokens (vh): dwell on each stage, fade between, and
  // a trailing dwell after the final phase before the section releases.
  function tokens() {
    var cs = getComputedStyle(document.documentElement);
    return {
      hold: parseFloat(cs.getPropertyValue("--scroll-hold")) || 28,
      fade: parseFloat(cs.getPropertyValue("--scroll-fade")) || 42,
      tail: parseFloat(cs.getPropertyValue("--scroll-tail")) || 0
    };
  }

  // One frame for every pinned section. Read all geometry before any section
  // writes styles, so one animation cannot force layout for the next one.
  var jobs = [], ticking = false;
  function tick() {
    ticking = false;
    var values = jobs.map(function (job) { return job.measure(); });
    jobs.forEach(function (job, i) { if (job.render) job.render(values[i]); });
  }
  function refresh() {
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }
  window.addEventListener("scroll", refresh, { passive: true });
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("pageshow", refresh);

  function onScroll(measure, render) {
    jobs.push({ measure: measure, render: render });
    var value = measure();
    if (render) render(value);
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
    clamp: clamp, pad: pad, tokens: tokens, turnAt: turnAt,
    onScroll: onScroll, refresh: refresh, stageAt: stageAt, captioner: captioner
  };
})();
