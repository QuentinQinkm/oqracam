/* ============================================================
   Oqra — fade sections in as they enter the viewport
   ============================================================
   Adds .reveal (hidden) to each top-level section + the footer, then .is-visible
   once it scrolls into view (CSS does the transition). Sections already in view
   at load are shown immediately (no flash). Progressive: without JS nothing gets
   .reveal so everything stays visible; prefers-reduced-motion opts out entirely.
   Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */
(function () {
  "use strict";
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var els = Array.prototype.slice.call(
    document.querySelectorAll("main > section, .site-footer")
  );
  if (!els.length) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  els.forEach(function (el) { el.classList.add("reveal"); });
  // Reveal anything already on screen synchronously (no enter animation, no
  // flash); observe the rest to fade in on scroll.
  els.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
    else io.observe(el);
  });
})();
