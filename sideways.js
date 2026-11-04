/* Pinned horizontal sections. Geometry changes on resize, not on every scroll.
   The shared scheduler measures every section before applying any transforms. */
(function () {
  "use strict";
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var clamp = OqraScroll.clamp;

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

  function watchSizes(elements, invalidate) {
    window.addEventListener("resize", invalidate, { passive: true });
    window.addEventListener("pageshow", invalidate);
    if ("ResizeObserver" in window) {
      var observer = new ResizeObserver(invalidate);
      elements.forEach(function (element) { observer.observe(element); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(invalidate);
  }

  var written = new WeakMap();
  function style(element, property, value) {
    value = String(value);
    var values = written.get(element);
    if (!values) { values = {}; written.set(element, values); }
    if (values[property] === value) return false;
    element.style[property] = value;
    values[property] = value;
    return true;
  }

  var flows = document.querySelector(".flows");
  if (flows) {
    var flowsPin = flows.querySelector(".flows__pin");
    var flowsWin = flows.querySelector(".flows__window");
    var flowsTrack = flows.querySelector(".flows__track");
    var pairs = flows.querySelectorAll(".flows__pair");
    var caps = flows.querySelectorAll(".flow__cap");
    var flowSize, flowDirty = true;
    flows.classList.add("is-pinned");
    loadAhead(flows);

    watchSizes([flowsPin, flowsWin, flowsTrack, pairs[0], pairs[1]], function () {
      flowDirty = true;
      OqraScroll.refresh();
    });
    OqraScroll.onScroll(function () {
      if (flowDirty) {
        var width = flowsWin.clientWidth;
        var pinHeight = flowsPin.offsetHeight;
        var distance = Math.max(0, flowsTrack.offsetWidth + 2 * flowsTrack.offsetLeft - width);
        var origin = flowsTrack.getBoundingClientRect().left;
        var a = pairs[0].getBoundingClientRect(), b = pairs[1].getBoundingClientRect();
        var pad = a.left - origin;
        var from = Math.max(0, a.right - origin + pad - width);
        flowSize = {
          distance: distance, hold: pinHeight * 0.3,
          height: pinHeight * 1.6 + distance + "px",
          edge: Math.min(120, pinHeight * 0.16),
          from: from, fade: Math.max(1, b.left - origin - pad - from)
        };
        flowDirty = false;
      }
      var turn = OqraScroll.turnAt(-flows.getBoundingClientRect().top,
        flowSize.distance, flowSize.hold, flowSize.edge);
      return { moved: turn.x, vertical: turn.y, fade: clamp((turn.x - flowSize.from) / flowSize.fade, 0, 1) };
    }, function (state) {
      if (style(flows, "height", flowSize.height)) {
        OqraScroll.refresh(); // sections below moved; measure them next frame
      }
      style(flowsPin, "transform", "translate3d(0," + state.vertical + "px,0)");
      style(flowsTrack, "transform", "translate3d(" + (-state.moved) + "px,0,0)");
      style(pairs[0], "opacity", clamp((0.65 - state.fade) / 0.5, 0, 1));
      style(pairs[1], "opacity", clamp((state.fade - 0.45) / 0.55, 0, 1));
      style(caps[0], "opacity", clamp((0.5 - state.fade) / 0.2, 0, 1));
      style(caps[1], "opacity", clamp((state.fade - 0.5) / 0.2, 0, 1));
    });
  }

  var run = document.querySelector(".native-run");
  if (run) {
    var runPin = run.querySelector(".native-run__pin");
    var runWin = run.querySelector(".native-run__window");
    var runTrack = run.querySelector(".features");
    var wide = window.matchMedia("(min-aspect-ratio: 1/1)");
    var pinned, runSize, runDirty = true;
    loadAhead(run);

    function configure() {
      var next = !wide.matches;
      if (pinned !== next) {
        pinned = next;
        run.classList.toggle("is-pinned", pinned);
        if (!pinned) {
          style(run, "height", "");
          style(runTrack, "transform", "");
          style(runPin, "transform", "");
          runPin.style.removeProperty("--pin-h");
        }
      }
      runDirty = true;
      OqraScroll.refresh();
    }
    configure();
    if (wide.addEventListener) wide.addEventListener("change", configure);
    else wide.addListener(configure);
    watchSizes([runPin, runWin, runTrack], configure);

    OqraScroll.onScroll(function () {
      if (!pinned) return null;
      if (runDirty) {
        var pinHeight = runPin.offsetHeight;
        var distance = Math.max(0, runTrack.offsetWidth + 2 * runTrack.offsetLeft - runWin.clientWidth);
        runSize = {
          distance: distance, pinHeight: pinHeight + "px", height: pinHeight + 240 + distance + "px",
          edge: Math.min(120, (window.innerHeight || pinHeight) * 0.16),
          stickyTop: parseFloat(getComputedStyle(runPin).top) || 0
        };
        runDirty = false;
      }
      return OqraScroll.turnAt(runSize.stickyTop - run.getBoundingClientRect().top,
        runSize.distance, 120, runSize.edge);
    }, function (turn) {
      if (turn === null) return;
      if (runPin.style.getPropertyValue("--pin-h") !== runSize.pinHeight) {
        runPin.style.setProperty("--pin-h", runSize.pinHeight);
        runDirty = true; // resolved sticky top now reflects the new height
        OqraScroll.refresh();
      }
      if (style(run, "height", runSize.height)) {
        OqraScroll.refresh();
      }
      style(runPin, "transform", "translate3d(0," + turn.y + "px,0)");
      style(runTrack, "transform", "translate3d(" + (-turn.x) + "px,0,0)");
    });
  }
})();
