/* ============================================================
   Oqra — smooth expand/collapse for the FAQ (#support <details>)
   ============================================================
   Native <details> snaps open/closed. This animates each item's HEIGHT both
   ways via the Web Animations API (the web.dev "animating details" pattern), so
   opening and closing glide instead of jumping. It reads the live height on each
   click, so a tap mid-animation reverses cleanly rather than popping.

   Progressive: with no JS the native toggle still works; prefers-reduced-motion
   opts out entirely; browsers without WAAPI keep the instant native behavior.
   Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */
(function () {
  "use strict";
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof Element.prototype.animate !== "function") return;

  var DUR = 260, EASE = "cubic-bezier(0.4, 0, 0.2, 1)";   // standard ease, matches the chrome

  function setup(el) {
    var summary = el.querySelector("summary");
    var content = el.querySelector(".faq__a");
    if (!summary || !content) return;
    var animation = null, closing = false, expanding = false;

    function finish(open) {
      el.open = open;
      animation = null; closing = false; expanding = false;
      el.style.height = ""; el.style.overflow = "";   // hand height back to layout (auto)
    }
    // Animate the <details> box height from its CURRENT rendered height (so a
    // reversed mid-flight toggle starts where it is) to the target.
    function animateTo(endPx, open) {
      if (animation) animation.cancel();
      animation = el.animate({ height: [el.offsetHeight + "px", endPx] },
                             { duration: DUR, easing: EASE });
      animation.onfinish = function () { finish(open); };
      animation.oncancel = function () { closing = false; expanding = false; };
    }
    function shrink() { closing = true; animateTo(summary.offsetHeight + "px", false); }
    function expand() { expanding = true; animateTo((summary.offsetHeight + content.offsetHeight) + "px", true); }
    function open() {
      el.style.height = el.offsetHeight + "px";   // pin height so opening doesn't jump
      el.open = true;                              // render content (height stays pinned)
      requestAnimationFrame(expand);
    }

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      el.style.overflow = "hidden";
      if (closing || !el.open) open();
      else if (expanding || el.open) shrink();
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".faq__item"), setup);
})();
