/* ============================================================
   Oqra — sideways sections: scroll down, the row moves left
   ============================================================
   Pins a section and moves its row 1:1 with scroll, so it feels like ordinary
   scrolling turned sideways, with a hold at each end. Used by build + share (.flows,
   on every screen) and Built for iPhone (.native-run, taller than square).
   prefers-reduced-motion keeps the CSS fallbacks (no pin, no scroll bind).
   ============================================================ */
(function () {
  "use strict";
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var clamp = OqraScroll.clamp;

  // Clipped off to the right, lazy images wouldn't load until they slid into view,
  // so ask for them once the section is near.
  function loadAhead(root) {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      Array.prototype.forEach.call(root.querySelectorAll("img"), function (img) {
        img.loading = "eager";
      });
    }, { rootMargin: "100% 0px" });
    io.observe(root);
  }

  // Sizes the section to its travel and moves the row; returns the px moved so far.
  function drive(root, pin, win, track, hold) {
    // Measured, not vh: on phones CSS vh and innerHeight disagree with the URL bar showing.
    var x = Math.max(0, track.offsetWidth + 2 * track.offsetLeft - win.clientWidth);
    var travel = hold + x + hold;
    var height = pin.offsetHeight + travel + "px";
    if (root.style.height !== height) root.style.height = height;
    var moved = clamp(-root.getBoundingClientRect().top - hold, 0, x);
    track.style.transform = "translate3d(" + (-moved) + "px,0,0)";
    return moved;
  }

  var flows = document.querySelector(".flows");
  if (flows) {
    var flowsPin = flows.querySelector(".flows__pin");
    var flowsWin = flows.querySelector(".flows__window");
    var flowsTrack = flows.querySelector(".flows__track");
    var pairs = flows.querySelectorAll(".flows__pair");
    var caps = flows.querySelectorAll(".flow__cap");
    flows.classList.add("is-pinned");
    loadAhead(flows);

    OqraScroll.onScroll(function () {
      // A long hold first: the second group stays out of sight while the first is read.
      var moved = drive(flows, flowsPin, flowsWin, flowsTrack, flowsPin.offsetHeight * 0.3);
      var origin = flowsTrack.getBoundingClientRect().left;
      var a = pairs[0].getBoundingClientRect(), b = pairs[1].getBoundingClientRect();
      var pad = a.left - origin;
      // The hand-over runs from the first group fully in view to the second settled.
      var from = Math.max(0, a.right - origin + pad - flowsWin.clientWidth);
      var t = clamp((moved - from) / (b.left - origin - pad - from), 0, 1);
      // The first group holds a moment in full view, which on phones is only now complete.
      pairs[0].style.opacity = clamp((0.65 - t) / 0.5, 0, 1);
      pairs[1].style.opacity = clamp((t - 0.45) / 0.55, 0, 1);
      // Text can't overlap, so the first intro clears before the second arrives.
      caps[0].style.opacity = clamp((0.5 - t) / 0.2, 0, 1);
      caps[1].style.opacity = clamp((t - 0.5) / 0.2, 0, 1);
    });
  }

  var run = document.querySelector(".native-run");
  if (run) {
    var runPin = run.querySelector(".native-run__pin");
    var runWin = run.querySelector(".native-run__window");
    var runTrack = run.querySelector(".features");
    // Matches the shape threshold in styles.css and hero.js.
    var wide = window.matchMedia("(min-aspect-ratio: 1/1)");
    var pinned = false;
    loadAhead(run);

    OqraScroll.onScroll(function () {
      if (pinned === wide.matches) {
        pinned = !wide.matches;
        run.classList.toggle("is-pinned", pinned);
        if (!pinned) run.style.height = runTrack.style.transform = "";
      }
      if (!pinned) return;
      var pinH = runPin.offsetHeight + "px";
      if (runPin.style.getPropertyValue("--pin-h") !== pinH) runPin.style.setProperty("--pin-h", pinH);
      drive(run, runPin, runWin, runTrack, 120);
    });
  }
})();
