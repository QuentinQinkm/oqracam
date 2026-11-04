// Hero scroll choreography.
// The page light stays hidden through the hero, then fades in as it scrolls away, on
// every screen. Windows taller than square also pin the hero and
// crossfade frame A (headline + camera) into frame B (editor + intro).
//
// Progressive: only runs with JS on and motion allowed. Otherwise the frames stack
// in normal flow and the decorative light stays hidden.
(function () {
  var hero = document.getElementById("top");
  if (!hero) return;
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var tok = OqraScroll.tokens();          // shared rhythm: dwell + fade + tail (vh)
  var HOLD = tok.hold, FADE = tok.fade, TAIL = tok.tail;

  // Matches the row layout's media query in styles.css.
  var row = window.matchMedia("(min-aspect-ratio: 1/1)");
  var stage = hero.querySelector(".hero__stage");
  var pin = hero.querySelector(".hero__pin");
  var frameA = hero.querySelector(".hero__frame--a");
  var frameB = hero.querySelector(".hero__frame--b");
  var lightEl = document.querySelector(".page-light"); // driven directly (no CSS var)
  var pinned = hero.classList.contains("is-pinned");
  var lightOpacity;

  function frameWriter(el) {
    var previousOpacity, previousActive;
    return function (opacity, active) {
      if (opacity !== previousOpacity) {
        el.style.opacity = opacity;
        previousOpacity = opacity;
      }
      if (active !== previousActive) {
        el.style.pointerEvents = active ? "" : "none";
        previousActive = active;
      }
    };
  }
  var setFrameA = frameWriter(frameA), setFrameB = frameWriter(frameB);

  // Layout-mode writes happen on setup/resize, outside the shared scroll reads.
  function syncMode() {
    var nextPinned = !row.matches;
    if (nextPinned === pinned) return;
    pinned = nextPinned;
    hero.classList.toggle("is-pinned", pinned);
    if (!pinned) {
      setFrameA("", true);
      setFrameB("", true);
    }
    OqraScroll.refresh();
  }
  syncMode();
  row.addEventListener("change", syncMode);
  window.addEventListener("resize", syncMode, { passive: true });

  function measure() {
    var vh = window.innerHeight || 1;
    var q;
    if (pinned) {
      // Travel comes from measured heights, not vh: on phones CSS vh and
      // innerHeight disagree with the URL bar showing.
      var range = stage.offsetHeight - pin.offsetHeight;
      var scrolled = OqraScroll.clamp(-stage.getBoundingClientRect().top, 0, range);
      var units = 2 * HOLD + FADE;                  // the transition itself
      var x = (range > 0 ? scrolled / range : 0) * (units + TAIL);
      q = OqraScroll.stageAt(x, 2, HOLD, FADE);
    }

    // Starts once the hero's end is on screen, so the second section stays on black.
    var g = OqraScroll.clamp((vh - hero.getBoundingClientRect().bottom) / (0.65 * vh), 0, 1);
    return { phase: q, light: g };
  }

  function render(state) {
    var q = state.phase, g = state.light;
    if (pinned) {
      // A clears before B arrives: the two layouts overlap and collide mid-fade.
      setFrameA(String(Math.max(0, 1 - 2 * q)), q <= 0.5);
      setFrameB(String(Math.max(0, 2 * q - 1)), q > 0.5);
    }
    if (lightEl) {
      var opacity = (g * 0.62).toFixed(3);
      if (opacity !== lightOpacity) {
        lightEl.style.opacity = opacity;
        lightEl.style.visibility = g > 0 ? "visible" : "hidden";
        lightOpacity = opacity;
      }
    }
  }
  OqraScroll.onScroll(measure, render);
})();
