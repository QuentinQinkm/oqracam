/* ============================================================
   Oqra — fade sections in as they appear, out as they leave
   ============================================================
   Adds .reveal (hidden) to each top-level section + the footer, then toggles
   .is-visible with the viewport (CSS does the transition) — symmetric, so a
   section fades IN on appear and OUT on disappear, consistently across the page.
   The hero is excluded: it runs its own pinned choreography (hero.js).
   Sections already in view at load are shown immediately (no flash).
   Progressive: without JS nothing gets .reveal so everything stays visible;
   prefers-reduced-motion opts out entirely. Vanilla, CSP-safe.
   ============================================================ */
(function () {
  "use strict";
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var els = Array.prototype.slice.call(
    document.querySelectorAll("main > section:not(.hero), .site-footer")
  );
  if (!els.length) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      // Only > ~12% visible counts as "in view" (threshold below), so the
      // section you're actually reading never fades — only ones mostly off do.
      e.target.classList.toggle("is-visible", e.isIntersecting);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  els.forEach(function (el) {
    el.classList.add("reveal");
    // Show anything already on screen synchronously (no enter animation, no
    // flash); the observer takes over from there.
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
    io.observe(el);
  });
})();
