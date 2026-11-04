// Page light.
// The background follows the photo on screen, so it changes with the section, the
// gallery photo, and the chosen preset. hero.js fades the layer in.
//
// The images are small and baked ahead by scripts/bake-light.py, so there is no image
// work to do on the phone and nothing to re-blur while scrolling.
//
// Progressive: hidden without JS or with reduced motion, leaving the page black.
var OqraLight = (function () {
  "use strict";

  var layer = document.querySelector(".page-light");
  if (!layer || !window.IntersectionObserver) return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  // Slower than a tap's crossfade, so colour doesn't flash past while scrolling.
  var SECTION_MS = 800;
  var fader = OqraScroll.crossfader(layer.querySelector("img"));
  var active = null, warmed = {};

  function url(name) { return "/assets/img/light/" + name + ".webp"; }

  function warm(name) {
    if (warmed[name]) return;
    warmed[name] = true;
    new Image().src = url(name);
  }

  // Remembers the section's photo, and gets it ready if that section is on screen.
  function prepare(section, name) {
    section.setAttribute("data-light", name);
    return section === active ? fader.load(url(name)) : Promise.resolve(false);
  }

  // The zero-height band at mid-screen means one section is active at a time. Sections
  // with no data-light, like Support, keep the colour of the one before.
  var sections = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      active = entry.target;
      prepare(active, active.getAttribute("data-light")).then(function (ok) {
        if (ok) fader.reveal(SECTION_MS);
      });
    });
  }, { rootMargin: "-50% 0px -50% 0px" });

  document.querySelectorAll("[data-light]").forEach(function (section) {
    sections.observe(section);
  });

  return { warm: warm, prepare: prepare, reveal: fader.reveal };
})();
