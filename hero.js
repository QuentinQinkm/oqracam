// Hero scroll choreography.
// The spectrum glow stays hidden through the hero, then grows in from the top as it
// scrolls away, on every screen. Windows taller than square also pin the hero and
// crossfade frame A (headline + camera) into frame B (editor + intro).
//
// Progressive: only runs with JS on and motion allowed. Otherwise the frames stack
// in normal flow and the glow shows at its CSS default.
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
  var glowEl = document.querySelector(".hero-glow"); // driven directly (no CSS var)

  function setFrame(el, opacity, active) {
    el.style.opacity = opacity;
    el.style.pointerEvents = active ? "" : "none";
  }

  function update() {
    var vh = window.innerHeight || 1;

    if (row.matches) {
      if (hero.classList.contains("is-pinned")) {
        hero.classList.remove("is-pinned");
        setFrame(frameA, "", true);
        setFrame(frameB, "", true);
      }
    } else {
      hero.classList.add("is-pinned");
      // Travel comes from measured heights, not vh: on phones CSS vh and
      // innerHeight disagree with the URL bar showing.
      var range = stage.offsetHeight - pin.offsetHeight;
      var scrolled = OqraScroll.clamp(-stage.getBoundingClientRect().top, 0, range);
      var units = 2 * HOLD + FADE;                  // the transition itself
      var x = (range > 0 ? scrolled / range : 0) * (units + TAIL);
      var q = OqraScroll.stageAt(x, 2, HOLD, FADE);
      // A clears before B arrives: the two layouts overlap and collide mid-fade.
      setFrame(frameA, String(Math.max(0, 1 - 2 * q)), q <= 0.5);
      setFrame(frameB, String(Math.max(0, 2 * q - 1)), q > 0.5);
    }

    // Starts once the hero's end is on screen, so the second section stays on black.
    var g = OqraScroll.clamp((vh - hero.getBoundingClientRect().bottom) / (0.65 * vh), 0, 1);
    if (glowEl) {
      glowEl.style.transform = "translateX(-50%) scaleY(" + g.toFixed(3) + ")";
      glowEl.style.opacity = g > 0 ? (0.10 + g * 0.18).toFixed(3) : "0";
    }
  }
  OqraScroll.onScroll(update);
})();
