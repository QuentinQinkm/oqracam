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

  var tok = OqraScroll.tokens();          // shared rhythm: dwell + fade (vh)
  var HOLD = tok.hold, FADE = tok.fade;

  var facesA = hero.querySelectorAll(".hero__face--a");
  var facesB = hero.querySelectorAll(".hero__face--b");
  var brand = hero.querySelector(".hero__brand");   // logo + name: fades with the title
  var glowEl = document.querySelector(".hero-glow"); // driven directly (no CSS var)
  if (glowEl) { glowEl.style.transform = "translateX(-50%) scaleY(0)"; glowEl.style.opacity = "0"; }

  function update() {
    var vh = window.innerHeight || 1;
    var range = hero.offsetHeight - vh;             // how far the stage stays pinned
    var scrolled = Math.min(range, Math.max(0, -hero.getBoundingClientRect().top));
    var p = range > 0 ? scrolled / range : 0;
    // HOLD · fade · HOLD over two phases — same rhythm as #shareflow. stageAt
    // returns 0..1 here: the crossfade amount between phase one and phase two.
    var units = 2 * HOLD + FADE;
    var x = p * units;                              // vh of travel consumed
    var q = OqraScroll.stageAt(x, 2, HOLD, FADE);

    // Logo + name fade out with the title (opacity only, so its box stays
    // reserved and nothing below shifts position).
    if (brand) brand.style.opacity = String(1 - q);

    // Spectrum background glow grows in from the top — starts when phase two
    // begins (x = HOLD) and finishes at 75% of the whole transition distance.
    // Written straight to the element's compositor props (scaleY + opacity).
    var glowEnd = 0.75 * units;
    var g = x <= HOLD ? 0
          : x >= glowEnd ? 1
          : (x - HOLD) / (glowEnd - HOLD);
    if (glowEl) {
      glowEl.style.transform = "translateX(-50%) scaleY(" + g.toFixed(3) + ")";
      glowEl.style.opacity = (0.12 + g * 0.2).toFixed(3);
    }

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
  OqraScroll.onScroll(update);
})();
