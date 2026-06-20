/* ============================================================
   Oqra — hide the nav while the hero ("landing") is in view
   ============================================================
   The hero carries its own brand lockup, so showing the nav at the same time
   reads as a duplicate. While any part of the hero sits below the nav, the whole
   bar is hidden; once you scroll past the hero it slides back in. A keyboard Tab
   also reveals it (CSS :focus-within), so its links are never left invisible but
   focusable.

   Progressive: pages with no .hero (privacy, 404) bail and keep the nav visible.
   The initial state is set instantly, then the slide transition is enabled, so
   the bar never slides on first paint. Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */
(function () {
  "use strict";
  var nav = document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  if (!nav || !hero) return;                 // no hero here → nav always visible

  var NAV_H = 72;                            // ~nav height; show once the hero clears it
  function atHero() { return hero.getBoundingClientRect().bottom > NAV_H; }
  function update(hide) { nav.classList.toggle("is-hidden", hide); }

  update(atHero());                          // set instantly, before transitions are on
  // Enable the slide transition only after the first paint.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { nav.classList.add("nav--anim"); });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      update(entries[0].isIntersecting);
    }, { rootMargin: "-" + NAV_H + "px 0px 0px 0px", threshold: 0 });
    io.observe(hero);
  } else {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; update(atHero()); });
    }, { passive: true });
  }
})();
