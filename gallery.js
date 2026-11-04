/* Native gallery paging: the browser owns touch tracking, momentum and snapping.
   Only nearby photos are warmed. Arrow navigation waits for a decoded frame;
   a new gesture or arrow request cancels any older pending navigation. */
(function () {
  "use strict";

  var gallery = document.querySelector(".gallery");
  if (!gallery) return;
  var imgs = Array.prototype.slice.call(gallery.querySelectorAll(".gallery__img"));
  var stage = gallery.querySelector(".gallery__stage");
  if (!stage || imgs.length < 2) return;
  var counter = gallery.querySelector(".gallery__counter");
  var navs = gallery.querySelectorAll(".gallery__nav");
  var total = imgs.length;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var shown = Math.max(0, imgs.findIndex(function (img) { return img.classList.contains("is-active"); }));
  var wanted = shown, pending = null, request = 0, near = false;
  var ready = {}, failed = {}, settleTimer = 0, scrollFrame = 0, width = stage.clientWidth;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function wrap(n) { return (n + total) % total; }
  function nearest() {
    return Math.max(0, Math.min(total - 1, Math.round(stage.scrollLeft / Math.max(1, width))));
  }

  function preload(n) {
    n = wrap(n);
    if (ready[n]) return ready[n];
    var img = imgs[n];
    var src = img.getAttribute("data-src") || img.getAttribute("src");
    img.loading = "eager";
    if (src && (failed[n] || img.getAttribute("src") !== src)) img.src = src;
    delete failed[n];
    ready[n] = (img.decode ? img.decode() : new Promise(function (resolve, reject) {
      if (img.complete) {
        if (img.naturalWidth) resolve(); else reject(new Error("Image unavailable"));
        return;
      }
      function loaded() { cleanup(); resolve(); }
      function error() { cleanup(); reject(new Error("Image unavailable")); }
      function cleanup() {
        img.removeEventListener("load", loaded);
        img.removeEventListener("error", error);
      }
      img.addEventListener("load", loaded);
      img.addEventListener("error", error);
    })).then(function () { return true; }, function () {
      delete ready[n]; failed[n] = true;
      return false;
    });
    return ready[n];
  }

  function warmAround(n) {
    if (!near) return;
    preload(n); preload(n - 1); preload(n + 1);
  }
  function select(n) {
    shown = n;
    imgs.forEach(function (img, index) {
      img.classList.toggle("is-active", index === n);
      img.setAttribute("aria-hidden", index === n ? "false" : "true");
    });
    var text = pad(n + 1) + " / " + pad(total);
    if (counter && counter.textContent !== text) counter.textContent = text;
    warmAround(n);
    if (window.OqraLight) {
      var name = (imgs[n].getAttribute("data-src") || imgs[n].getAttribute("src"))
        .split("/").pop().replace(".webp", "");
      OqraLight.prepare(gallery, name).then(function (ok) { if (ok) OqraLight.reveal(320); });
    }
  }
  function settle() {
    clearTimeout(settleTimer);
    select(nearest());
    if (pending === shown) pending = null;
    if (pending === null) wanted = shown;
  }

  function go(dir) {
    var raw = (pending === null ? nearest() : wanted) + dir, target = wrap(raw), token = ++request;
    var wrapping = raw < 0 || raw >= total;
    wanted = target; pending = target; near = true;
    preload(target).then(function (loaded) {
      if (token !== request) return;
      if (!loaded) { pending = null; wanted = nearest(); return; }
      // Native gesture edges stay finite. Wrapping or rapid multi-page jumps
      // skip unloaded intermediates instead of adding clones or warming all.
      var instant = reduced.matches || wrapping || Math.abs(target - nearest()) > 1;
      stage.scrollTo({ left: target * width, behavior: instant ? "auto" : "smooth" });
      warmAround(target);
      if (Math.abs(stage.scrollLeft - target * width) < 1) settle();
    });
  }

  Array.prototype.forEach.call(navs, function (btn) {
    btn.addEventListener("click", function () { go(parseInt(btn.getAttribute("data-dir"), 10) || 1); });
  });
  gallery.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
  });

  function takeOver() {
    ++request; pending = null; wanted = nearest(); near = true;
    warmAround(wanted);
    // Do not preventDefault, capture pointers or synthesize a drag: vertical
    // scrolling, horizontal momentum and pinch zoom remain browser gestures.
  }
  stage.addEventListener("pointerdown", takeOver, { passive: true });
  if (!("PointerEvent" in window)) stage.addEventListener("touchstart", takeOver, { passive: true });
  stage.addEventListener("wheel", takeOver, { passive: true });
  stage.addEventListener("scroll", function () {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(function () {
      scrollFrame = 0; warmAround(nearest());
    });
    // scrollend is used when available; debounce also covers older Safari.
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 180);
  }, { passive: true });
  stage.addEventListener("scrollend", settle);

  gallery.classList.add("is-scrollable");
  width = stage.clientWidth;
  if (shown) stage.scrollTo({ left: shown * width, behavior: "auto" });
  select(shown);

  function resize() {
    var nextWidth = stage.clientWidth;
    if (!nextWidth || Math.abs(nextWidth - width) < 0.5) return;
    // Preserve the selected photo on rotation. Cancel pending navigation so
    // an old decode/animation cannot jump to coordinates from the old width.
    ++request; pending = null; wanted = shown;
    width = nextWidth;
    stage.scrollTo({ left: shown * width, behavior: "auto" });
    select(shown);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pageshow", resize);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      near = true; io.disconnect(); warmAround(shown);
    }, { rootMargin: (window.innerHeight || 800) + "px 0px" });
    io.observe(gallery);
  } else {
    near = true; warmAround(shown);
  }
})();
