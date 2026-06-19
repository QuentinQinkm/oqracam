/* ============================================================
   Oqra — before/after reveal (#compare)
   ============================================================
   A draggable divider wipes between the original capture (left) and the
   same frame developed through Oqra (right). Scene + film pickers swap the
   image pair. Pure vanilla, no deps; images live in /assets/img/samples/
   as <scene>_<og|look>.jpg.
   ============================================================ */
(function () {
  "use strict";

  var ba = document.getElementById("ba");
  if (!ba) return;

  var before  = document.getElementById("baBefore");
  var after   = document.getElementById("baAfter");
  var labelR  = document.getElementById("baLabelR");
  var note    = document.getElementById("baNote");
  var sceneSeg = document.getElementById("sceneSeg");
  var lookSeg  = document.getElementById("lookSeg");
  var BASE = "/assets/img/samples/";

  var scene = "flower";
  var look  = "amethyst";

  // Each film's one-line identity (shown under the picker — the looks' names
  // gain a character, not just a label).
  var CHARS = {
    amethyst:  "Soft warmth, cool shadows",
    crystal:   "Clean, bright, true colour",
    onyx:      "Deep silver black & white",
    verdigris: "Vivid, sun-faded colour"
  };

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function swap() {
    before.src = BASE + scene + "_og.jpg";
    after.src  = BASE + scene + "_" + look + ".jpg";
    before.alt = cap(scene) + ", original capture";
    after.alt  = cap(scene) + ", developed in Oqra (" + cap(look) + ")";
    labelR.textContent = cap(look);
    if (note) note.textContent = CHARS[look] || "";
  }

  function activate(seg, btn) {
    var bs = seg.querySelectorAll("button");
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i] === btn;
      bs[i].classList.toggle("active", on);
      bs[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  // Sync aria-pressed with the initial .active markup.
  activate(sceneSeg, sceneSeg.querySelector("button.active"));
  activate(lookSeg, lookSeg.querySelector("button.active"));

  sceneSeg.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !b.dataset.scene) return;
    scene = b.dataset.scene; activate(sceneSeg, b); swap();
  });
  lookSeg.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !b.dataset.look) return;
    look = b.dataset.look; activate(lookSeg, b); swap();
  });

  // ---- drag the divider ----
  function setSplit(clientX) {
    var r = ba.getBoundingClientRect();
    var pct = (clientX - r.left) / r.width;
    pct = Math.max(0, Math.min(1, pct));
    var v = (pct * 100).toFixed(2);
    ba.style.setProperty("--split", v + "%");
    ba.setAttribute("aria-valuenow", Math.round(pct * 100));
  }

  var dragging = false;
  function onHandle(e) { return !!(e.target.closest && e.target.closest(".ba__handle")); }
  ba.addEventListener("pointerdown", function (e) {
    // Touch must START on the handle to drag — otherwise let the gesture
    // scroll the page (a swipe over the image must pass through, not snap the
    // divider to the finger). Mouse/pen keep click-anywhere-to-set.
    if (e.pointerType === "touch" && !onHandle(e)) return;
    dragging = true;
    if (ba.setPointerCapture) { try { ba.setPointerCapture(e.pointerId); } catch (_) {} }
    setSplit(e.clientX);
    e.preventDefault();
  });
  ba.addEventListener("pointermove", function (e) { if (dragging) { setSplit(e.clientX); e.preventDefault(); } });
  ba.addEventListener("pointerup",   function () { dragging = false; });
  ba.addEventListener("pointercancel", function () { dragging = false; });

  // ---- keyboard a11y ----
  ba.addEventListener("keydown", function (e) {
    var cur = parseFloat(ba.style.getPropertyValue("--split")) || 50;
    if (e.key === "ArrowLeft")  { ba.style.setProperty("--split", Math.max(0, cur - 4) + "%"); ba.setAttribute("aria-valuenow", Math.round(Math.max(0, cur - 4))); e.preventDefault(); }
    if (e.key === "ArrowRight") { ba.style.setProperty("--split", Math.min(100, cur + 4) + "%"); ba.setAttribute("aria-valuenow", Math.round(Math.min(100, cur + 4))); e.preventDefault(); }
  });
})();
