// Pinned hero crossfade.
// The phone stays locked dead-centre and never moves. As you scroll through the
// hero, the zone above it crossfades brand+title → intro copy, and the zone
// below crossfades the spec row → the install buttons. Both faces of each zone
// occupy the same grid cell, so heights are constant and the phone never shifts.
//
// Progressive: only runs with JS on and motion allowed. Otherwise every face is
// just shown in normal flow (CSS default) so nothing is hidden.
(function () {
  var hero = document.getElementById("top");
  if (!hero) return;
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  hero.classList.add("is-scroll");

  var root = document.documentElement;
  root.style.setProperty("--glow", "0");   // phase one starts on plain black

  // Shared scroll rhythm tokens (vh): dwell on each phase, fade between them.
  var cs = getComputedStyle(root);
  var HOLD = parseFloat(cs.getPropertyValue("--scroll-hold")) || 28;
  var FADE = parseFloat(cs.getPropertyValue("--scroll-fade")) || 42;

  var facesA = hero.querySelectorAll(".hero__face--a");
  var facesB = hero.querySelectorAll(".hero__face--b");
  var brand = hero.querySelector(".hero__brand");   // logo + name: fades with the title

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight || 1;
    var range = hero.offsetHeight - vh;             // how far the stage stays pinned
    var scrolled = Math.min(range, Math.max(0, -hero.getBoundingClientRect().top));
    var p = range > 0 ? scrolled / range : 0;
    // HOLD · fade · HOLD: phase 1 dwells for HOLD, crossfades over FADE, then
    // phase 2 dwells for HOLD — same rhythm as #shareflow, from shared tokens.
    var units = 2 * HOLD + FADE;
    var x = p * units;                              // vh of travel consumed
    var q = x <= HOLD ? 0
          : x >= HOLD + FADE ? 1
          : (x - HOLD) / FADE;

    // Logo + name fade out with the title (opacity only, so its box stays
    // reserved and nothing below shifts position).
    if (brand) brand.style.opacity = String(1 - q);

    // Spectrum background glow grows in from the top — starts when phase two
    // begins (x = HOLD) and finishes at 75% of the whole transition distance.
    // --glow is a 0..1 progress; CSS turns it into scaleY + opacity.
    var glowEnd = 0.75 * units;
    var glow = x <= HOLD ? 0
             : x >= glowEnd ? 1
             : (x - HOLD) / (glowEnd - HOLD);
    root.style.setProperty("--glow", glow.toFixed(3));

    var i;
    for (i = 0; i < facesA.length; i++) {
      facesA[i].style.opacity = String(1 - q);
      facesA[i].style.pointerEvents = q > 0.5 ? "none" : "";
    }
    for (i = 0; i < facesB.length; i++) {
      facesB[i].style.opacity = String(q);
      facesB[i].style.pointerEvents = q > 0.5 ? "" : "none";
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
})();
