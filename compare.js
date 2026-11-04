/* ============================================================
   Oqra — before/after reveal (#compare)
   ============================================================
   A draggable divider wipes between the original capture (left) and the
   same frame developed through Oqra (right). Scene + preset pickers swap the
   image pair. Pure vanilla, no deps; images live in /assets/img/samples/
   as <scene>_<og|look>.webp.
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

  var scene = "street";
  var look  = "golden";

  // Each preset's one-line identity (shown under the picker — the looks' names
  // gain a character, not just a label).
  var CHARS = {
    golden:  "Warm, peach-toned light",
    sunburn: "Amber sun, olive shadows",
    window:  "Cool light, teal shadows",
    monor:   "Black and white, as if through a red filter"
  };
  var NAMES = { golden: "Golden", sunburn: "Sunburn", window: "Window", monor: "Mono R" };

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---- speculative preload: make scene/preset switches instant cuts ----
  var SCENES = ["street", "bay", "river", "pier", "cherry"];
  var LOOKS  = ["golden", "sunburn", "window", "monor"];
  var warmed = {};
  function warm(url) {
    if (warmed[url]) return; warmed[url] = true;
    var im = new Image(); im.decoding = "async"; im.src = url;
  }
  // The "cross" one tap can reach next: this scene in every preset, and this preset
  // across every scene (+ each scene's original).
  function warmCross() {
    var i;
    for (i = 0; i < LOOKS.length; i++)  warm(BASE + scene + "_" + LOOKS[i] + ".webp");
    for (i = 0; i < SCENES.length; i++) { warm(BASE + SCENES[i] + "_" + look + ".webp"); warm(BASE + SCENES[i] + "_og.webp"); }
  }
  // Skip the speculative warm on data-saver / 2g.
  var conn = navigator.connection || {};
  var thrifty = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
  var near = false, warmPending = false;
  function warmSoon() {
    if (!near || thrifty || warmPending) return;
    warmPending = true;
    idle(function () { warmPending = false; warmCross(); });
  }

  // Decode the new frame off-DOM, THEN assign — so a switch is a clean cut, never
  // a half-painted frame. A per-element token guards against out-of-order decodes.
  function swapImg(el, url) {
    el._want = url;
    if (el.getAttribute("src") === url) return;
    warm(url);
    var tmp = new Image(); tmp.decoding = "async"; tmp.src = url;
    function show() { if (el._want === url) el.src = url; }
    if (tmp.decode) tmp.decode().then(show, function () {});
    else if (tmp.complete && tmp.naturalWidth) show();
    else tmp.addEventListener("load", show, { once: true });
  }

  function swap() {
    swapImg(before, BASE + scene + "_og.webp");
    swapImg(after,  BASE + scene + "_" + look + ".webp");
    before.alt = cap(scene) + ", original capture";
    after.alt  = cap(scene) + ", developed in Oqra (" + NAMES[look] + ")";
    labelR.textContent = NAMES[look];
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
  // This demo is several screens down; don't race the hero for its bandwidth.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      near = true; io.disconnect();
      before.loading = after.loading = "eager";
      warmSoon();
    }, { rootMargin: (window.innerHeight || 800) + "px 0px" });
    io.observe(ba);
  }

  sceneSeg.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !b.dataset.scene) return;
    near = true; scene = b.dataset.scene; activate(sceneSeg, b); swap(); warmSoon();
  });
  lookSeg.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !b.dataset.look) return;
    near = true; look = b.dataset.look; activate(lookSeg, b); swap(); warmSoon();
  });

  // ---- drag the divider ----
  // Single writer for the divider position so --split, aria-valuenow, and the
  // spoken aria-valuetext never drift. pct is 0..1.
  function setPct(pct) {
    pct = Math.max(0, Math.min(1, pct));
    var n = Math.round(pct * 100);
    ba.style.setProperty("--split", (pct * 100).toFixed(2) + "%");
    ba.setAttribute("aria-valuenow", n);
    // --split is how much ORIGINAL shows from the left, so developed = 100 - split.
    ba.setAttribute("aria-valuetext", (100 - n) + "% developed");
  }
  function setSplit(clientX) {
    var r = dragBounds || ba.getBoundingClientRect();
    if (!r.width) return;
    setPct((clientX - r.left) / r.width);
  }

  var dragging = false, dragBounds = null, pendingX = null, dragFrame = 0;
  function paintDrag() {
    dragFrame = 0;
    if (pendingX !== null) { setSplit(pendingX); pendingX = null; }
  }
  function endDrag() {
    if (dragFrame) { cancelAnimationFrame(dragFrame); paintDrag(); }
    dragging = false; dragBounds = null;
    ba.classList.remove("is-grabbing");
  }
  function onHandle(e) { return !!(e.target.closest && e.target.closest(".ba__handle")); }
  ba.addEventListener("pointerdown", function (e) {
    // Touch must START on the handle to drag — otherwise let the gesture
    // scroll the page (a swipe over the image must pass through, not snap the
    // divider to the finger). Mouse/pen keep click-anywhere-to-set.
    if (e.pointerType === "touch" && !onHandle(e)) return;
    dragging = true;
    dragBounds = ba.getBoundingClientRect();
    ba.classList.add("is-grabbing");
    if (ba.setPointerCapture) { try { ba.setPointerCapture(e.pointerId); } catch (_) {} }
    setSplit(e.clientX);
    e.preventDefault();
  });
  ba.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    pendingX = e.clientX;
    if (!dragFrame) dragFrame = requestAnimationFrame(paintDrag);
    e.preventDefault();
  });
  ba.addEventListener("pointerup", endDrag);
  ba.addEventListener("pointercancel", endDrag);
  ba.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("resize", function () { dragBounds = null; }, { passive: true });

  // ---- keyboard a11y ----
  ba.addEventListener("keydown", function (e) {
    var cur = parseFloat(ba.style.getPropertyValue("--split"));
    if (!isFinite(cur)) cur = 50;
    if      (e.key === "ArrowLeft")  { setPct((cur - 4) / 100); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setPct((cur + 4) / 100); e.preventDefault(); }
    else if (e.key === "Home")       { setPct(0); e.preventDefault(); }
    else if (e.key === "End")        { setPct(1); e.preventDefault(); }
  });
})();
