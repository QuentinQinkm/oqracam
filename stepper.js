/* ============================================================
   Oqra — film build-up (#develop), DRAG-to-develop vertical WIPE
   ============================================================
   N stacked stills; a horizontal dragger (.develop__scrub) under the image
   scrubs through them. Each next stage is wiped in VERTICALLY (top→down) over
   the stage below it, led by a hard BLACK BAR — the #compare slider's reveal,
   turned vertical and black. Image 0 is the always-on base; image i is
   clip-path revealed from the top, so a solid frame is always under the wipe
   edge (never flashes black).

   The dragger maps linearly to fractional stage 0..N-1. The first appearance
   auto-develops once, after the images are decoded; dragging then takes over.
   Keyboard: arrows / Home / End. Vanilla, no deps, CSP-safe (script-src 'self').
   ============================================================ */

/* Shared helpers live in scroll.js (loaded first); alias the two used here. */
var pad = OqraScroll.pad, clamp = OqraScroll.clamp;

(function () {
  "use strict";
  var root = document.getElementById("develop");
  if (!root) return;
  var imgs = Array.prototype.slice.call(root.querySelectorAll(".develop__img"));
  var N = imgs.length;
  if (!N) return;
  var bar = root.querySelector(".develop__bar");
  var scrub = root.querySelector(".develop__scrub");
  var frame = root.querySelector(".develop__frame");
  var caption = OqraScroll.captioner(
    imgs,
    document.getElementById("buildName"),
    document.getElementById("buildSub"),
    document.getElementById("buildCount")
  );

  function clipFor(f) {
    if (f <= 0) return "inset(0 0 100% 0)";   // hidden
    if (f >= 1) return "none";                 // full
    return "inset(0 0 " + ((1 - f) * 100).toFixed(2) + "% 0)";
  }
  var lastClips = [], lastBarTop, lastBarOpacity;

  // Paint the stacked wipe for a fractional stage 0..N-1: image 0 is the
  // always-on base, each later image is clip-revealed from the top, with a hard
  // black bar riding the seam mid-transition.
  function render(stage) {
    for (var i = 0; i < N; i++) {
      var clip = (i === 0) ? "none" : clipFor(clamp(stage - (i - 1), 0, 1));
      if (clip !== lastClips[i]) {
        imgs[i].style.clipPath = clip;
        lastClips[i] = clip;
      }
    }
    if (bar) {
      var frac = stage - Math.floor(stage);
      var opacity = "0";
      if (stage > 0 && stage < N - 1 && frac > 0.0015) {
        var top = (frac * 100).toFixed(2) + "%";
        if (top !== lastBarTop) { bar.style.top = top; lastBarTop = top; }
        opacity = "1";
      }
      if (opacity !== lastBarOpacity) { bar.style.opacity = opacity; lastBarOpacity = opacity; }
    }
    caption(clamp(Math.round(stage), 0, N - 1), N);
  }

  // Drag-to-develop: the horizontal scrubber drives the build. On first
  // appearance the stack starts at stage 1 (raw) and AUTO-DEVELOPS to the final
  // stage over 1.75s (ease-out), once per page load; after that it's manual.
  // Reduced motion: show the finished frame, no animation.
  var motionOK = !(window.matchMedia &&
                   window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var pos = motionOK ? 0 : 1;                   // 0..1 along the scrubber
  var autoplayed = false, sliding = false;
  var animId = 0, autoRaf = 0, lastScrub, lastStage = -1;
  var dragging = false, pointerId = null, dragBounds = null;
  var pendingX = null, dragRaf = 0;
  function apply() {
    var stage = clamp(pos * (N - 1), 0, N - 1);
    if (scrub) {
      var value = pos.toFixed(4), index = clamp(Math.round(stage), 0, N - 1);
      if (value !== lastScrub) {
        scrub.style.setProperty("--scrub", value);  // unitless 0..1; CSS insets the travel
        lastScrub = value;
      }
      if (index !== lastStage) {
        scrub.setAttribute("aria-valuenow", String(index));
        // Voice the stage by name, not a bare index.
        var nm = imgs[index].getAttribute("data-name");
        if (nm) scrub.setAttribute("aria-valuetext", nm);
        lastStage = index;
      }
    }
    render(stage);
  }
  function setFromX(clientX) {
    if (!dragBounds) return;
    var half = 17;   // = --handle / 2 in CSS — handle centre travels [half .. width-half]
    pos = clamp((clientX - dragBounds.left - half) / Math.max(1, dragBounds.width - 2 * half), 0, 1);
    apply();
  }
  function stopAuto() {
    autoplayed = true; sliding = false; animId++;
    if (autoRaf) cancelAnimationFrame(autoRaf);
    autoRaf = 0;
  }
  function flushDrag() {
    dragRaf = 0;
    if (pendingX === null) return;
    var x = pendingX; pendingX = null;
    setFromX(x);
  }
  function finishDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    if (e.type === "pointerup") pendingX = e.clientX;
    if (dragRaf) cancelAnimationFrame(dragRaf);
    flushDrag();
    dragging = false; pointerId = null; dragBounds = null;
    scrub.classList.remove("is-grabbing");
    if (scrub.releasePointerCapture) { try { scrub.releasePointerCapture(e.pointerId); } catch (_) {} }
  }

  if (scrub) {
    scrub.addEventListener("pointerdown", function (e) {
      if (dragging || e.button !== 0 || e.isPrimary === false) return;
      dragging = true; pointerId = e.pointerId;
      dragBounds = scrub.getBoundingClientRect();  // read once per gesture, before writes
      scrub.classList.add("is-grabbing");
      stopAuto();
      prepareImages();
      if (scrub.setPointerCapture) { try { scrub.setPointerCapture(e.pointerId); } catch (_) {} }
      setFromX(e.clientX);
      e.preventDefault();
    });
    scrub.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pointerId) return;
      pendingX = e.clientX;
      if (!dragRaf) dragRaf = requestAnimationFrame(flushDrag);
      e.preventDefault();
    });
    scrub.addEventListener("pointerup", finishDrag);
    scrub.addEventListener("pointercancel", finishDrag);
    scrub.addEventListener("lostpointercapture", finishDrag);
    scrub.addEventListener("keydown", function (e) {
      if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].indexOf(e.key) < 0) return;
      stopAuto(); prepareImages();
      if (dragRaf) cancelAnimationFrame(dragRaf);
      flushDrag();
      var step = 1 / Math.max(1, N - 1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowDown") { pos = clamp(pos - step, 0, 1); apply(); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") { pos = clamp(pos + step, 0, 1); apply(); e.preventDefault(); }
      else if (e.key === "Home") { pos = 0; apply(); e.preventDefault(); }
      else if (e.key === "End")  { pos = 1; apply(); e.preventDefault(); }
    });
  }

  // Auto-develop: played once when the stack first scrolls into view, and again
  // whenever Replay is pressed. easeOutCubic — fast start, a pronounced slow
  // settle onto the finished frame. animId lets a fresh run supersede one still
  // in flight (e.g. rapid Replay taps) so two ticks never fight.
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  var imagesReady;
  function prepareImages() {
    if (imagesReady) return imagesReady;
    imagesReady = Promise.all(imgs.map(function (img) {
      img.loading = "eager";
      if (img.decode) {
        return img.decode().then(function () { return true; }, function () { return false; });
      }
      if (img.complete) return Promise.resolve(img.naturalWidth > 0);
      return new Promise(function (resolve) {
        function done() {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve(img.naturalWidth > 0);
        }
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    })).then(function (ready) {
      var complete = ready.every(function (ok) { return ok; });
      // A transient fetch/decode failure must not disable later Replay attempts.
      if (!complete) imagesReady = null;
      return complete;
    });
    return imagesReady;
  }
  function autoDevelop() {
    stopAuto();
    var myId = animId;
    prepareImages().then(function (ready) {
      if (!ready || myId !== animId || dragging) return;
      sliding = true; pos = 0; apply();       // snap to raw only when every frame is ready
      var start = null;
      function tick(ts) {
        autoRaf = 0;
        if (myId !== animId || !sliding) return;
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / 1750);
        pos = easeOut(t); apply();
        if (t < 1) autoRaf = requestAnimationFrame(tick); else sliding = false;
      }
      autoRaf = requestAnimationFrame(tick);
    });
  }
  // Wake lazy images shortly before the section arrives, without competing
  // with the hero's image downloads at page load.
  if (frame && "IntersectionObserver" in window) {
    var warmup = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        warmup.disconnect(); prepareImages();
      }
    }, { rootMargin: "400px 0px", threshold: 0 });
    warmup.observe(frame);
  }
  if (motionOK && frame && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !autoplayed) {
          autoplayed = true; io.disconnect();
          autoDevelop();
        }
      });
    }, { threshold: 0.55 });
    io.observe(frame);
  }

  // Replay button — re-runs the develop animation on demand. Works regardless of
  // reduced-motion since it's an explicit, user-initiated action.
  var replayBtn = document.getElementById("developReplay");
  if (replayBtn) replayBtn.addEventListener("click", autoDevelop);

  apply();   // initial paint
})();
