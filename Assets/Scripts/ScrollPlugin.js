/**
 * Standalone Circular Carousel — IMAX + Auto-Spacing (metre-based scrolling)
 * - No engine APIs required (you apply the returned transforms yourself).
 * - Scroll state, impulses, and velocity are in METRES (arc length) to match position units.
 *
 * USAGE:
 *   const carousel = createCarousel();
 *   carousel.rebuild([ [item00, item01, ...], [item10, item11, ...] ]); // rows -> items
 *   // Each frame:
 *   const transforms = carousel.update(dt); // dt in seconds
 *   // Apply transforms: position {m}, rotation {deg}, scale {unitless}, visible {bool}
 *   // transforms is an array of { row, index, item, visible, position:{x,y,z}, rotation:{pitchDeg,yawDeg,rollDeg}, scale }

 */


function createCarousel(userConfig = {}) {
  // ----------------------------- CONFIG -----------------------------------
  const CONFIG = Object.assign({
    // Geometry (metres)
    radius: 1.00,        // smaller = stronger wrap
    fovDeg: 150.0,       // total horizontal FOV

    // Rows
    rowSpacing: 0.42,    // metres between rows

    // Spacing (NO OVERLAP) — angle step derived from width + gap when autoSpacing=true
    autoSpacing: true,
    itemWidthM: 0.50,    // visual width at scale=1 (metres)
    gapM: 0.25,          // metres between neighbours
    itemAngleStep: 0.26, // fallback radians when autoSpacing=false

    // Look & interaction
    baseScale: 1.00,
    hoverScale: 1.25,
    selectScale: 1.65,
    scaleFalloff: 0.30,  // reduce scale toward edges
    hoverZCloser: 0.12,  // m toward viewer on hover
    selectZCloser: 0.28, // m toward viewer on select

    // Motion feel
    friction: 4.5,       // velocity damping per second
    spring: 12.0,        // exponential approach rate
    leanFactor: 0.11,    // radians per (metre/second)
    maxLean: 0.35,       // clamp lean
    snapEnabled: true,

    // Misc
    logs: false
  }, userConfig);

  // --------------------------- INTERNAL STATE -----------------------------
  const State = { SCROLLING: 0, SELECTED: 1 };
  let mode = State.SCROLLING;

  const mainData = { scroll_y: 0, StoreList: [] };
  let rows = mainData.StoreList;

  let selected = { row: -1, index: -1 };
  let hovered  = { row: -1, index: -1 };

  // Optional RAF loop
  let _raf = null, _last = 0, _apply = null;

  // ------------------------------- UTILS -----------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const approach = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
  const wrapDelta = (delta, period) => delta - period * Math.floor((delta + period * 0.5) / period);
  const arcVisibleRad = () => (CONFIG.fovDeg * Math.PI / 180) * 0.5;
  const log = (...args) => { if (CONFIG.logs) console.log("[Carousel]", ...args); };

  // Angle step (radians) that avoids overlap even when enlarged
  function effectiveStep() {
    if (!CONFIG.autoSpacing) return CONFIG.itemAngleStep;
    const maxScale = Math.max(CONFIG.baseScale * CONFIG.hoverScale, CONFIG.selectScale);
    const itemWidthAtMax = CONFIG.itemWidthM * maxScale;           // metres
    const minStep = (itemWidthAtMax + CONFIG.gapM) / Math.max(CONFIG.radius, 0.01); // radians
    return Math.max(CONFIG.itemAngleStep, minStep);
  }

  // Convert angle step to ARC LENGTH (metres) per item at current radius
  function metresPerItem() {
    return CONFIG.radius * effectiveStep(); // s = R * θ
  }

  // ----------------------------- BUILD / REBUILD ---------------------------
  function rebuild(rows2d) {
    mainData.StoreList.length = 0;

    if (!Array.isArray(rows2d)) {
      log("ERROR: rebuild expects a 2D array (rows -> items).");
      rows = mainData.StoreList;
      return;
    }

    for (let r = 0; r < rows2d.length; r++) {
      const rowItems = rows2d[r] || [];
      const list = {
        numverticalitems: rows2d.length,
        scroll_s: 0,     // ✅ arc length in METRES
        v: 0,            // ✅ velocity in METRES/SECOND
        dragging: false,
        rowObj: null,    // free for your use
        items: []
      };

      for (let i = 0; i < rowItems.length; i++) {
        list.items.push({
          item: rowItems[i],
          pos_offs: { x: 0, y: 0, z: 0 }, // metres
          rotation: { x: 0, y: 0 },       // radians (pitch, yaw)
          scale: CONFIG.baseScale,
          visible: true
        });
      }

      if (list.items.length > 0) mainData.StoreList.push(list);
    }

    rows = mainData.StoreList;
    log("Built rows:", rows.length);
  }

  // ------------------------------- LAYOUT ----------------------------------
  function layoutRow(rowIndex, dt, transformsOut) {
    const list = rows[rowIndex]; if (!list) return;
    const items = list.items; const N = items.length; if (N === 0) return;

    // Integrate metre-based motion
    if (mode === State.SCROLLING) {
      list.scroll_s += list.v * dt;                  // m += (m/s)*s
      const drag = Math.exp(-CONFIG.friction * dt);
      list.v *= drag;

      if (CONFIG.snapEnabled && !list.dragging) {
        const sStep = metresPerItem();              // m per item
        const u = list.scroll_s / sStep;            // items
        const target = Math.round(u) * sStep;       // m
        list.scroll_s = approach(list.scroll_s, target, CONFIG.spring * 0.8, dt);
      }
    } else {
      list.v = approach(list.v, 0, 8.0, dt);
    }

    const step = effectiveStep();           // radians per item
    const sStep = metresPerItem();          // metres per item
    const R = CONFIG.radius;
    const visibleArc = arcVisibleRad();
    const uCenter = list.scroll_s / sStep;  // items
    const isSelectedRow = (mode === State.SELECTED && selected.row === rowIndex);

    for (let j = 0; j < N; j++) {
      const it = items[j];
      const delta = wrapDelta(j - uCenter, N); // items
      const theta = delta * step;              // radians

      // Visibility cull
      const visible = Math.abs(theta) <= visibleArc + 0.20;
      it.visible = visible;
      if (!visible) {
        transformsOut.push({ row: rowIndex, index: j, item: it.item, visible: false });
        continue;
      }

      // IMAX concave arc (center closest, edges recede)
      let x = R * Math.sin(theta);
      let z = -R * (1 - Math.cos(theta)); // negative is closer after we flip sign below
      const y = -rowIndex * CONFIG.rowSpacing;

      // Scale falloff toward edges
      const fall = 1 - CONFIG.scaleFalloff * clamp(Math.abs(theta) / visibleArc, 0, 1);
      let targetScale = CONFIG.baseScale * fall;
      let zCloser = 0.0;

      // Hover emphasis
      const isHovered = (hovered.row === rowIndex && hovered.index === j && mode !== State.SELECTED);
      if (isHovered) { targetScale *= CONFIG.hoverScale; zCloser += CONFIG.hoverZCloser; }

      // Selection focus (pull left & closer)
      const isSel = isSelectedRow && selected.index === j;
      if (isSel) {
        targetScale = approach(it.scale, CONFIG.selectScale, CONFIG.spring, dt);
        zCloser += CONFIG.selectZCloser;
        x = approach(x, -R * 0.35, CONFIG.spring, dt);
        z = approach(z, 0.0,       CONFIG.spring, dt);
      }

      // Lean by velocity (v is m/s; leanFactor is rad per (m/s))
      const lean = clamp(-list.v * CONFIG.leanFactor, -CONFIG.maxLean, CONFIG.maxLean);
      const yaw   = -theta + lean;           // radians
      const pitch =  0.08 * Math.sin(theta); // radians

      // Persist smoothed state
      it.rotation.y = approach(it.rotation.y, yaw,   CONFIG.spring, dt);
      it.rotation.x = approach(it.rotation.x, pitch, CONFIG.spring, dt);
      it.scale      = approach(it.scale,      targetScale, CONFIG.spring, dt);

      // Export in metres (negative z => closer in many engines)
      it.pos_offs.x = x;
      it.pos_offs.y = y;
      it.pos_offs.z = -(z + zCloser);

      // Collect transform
      transformsOut.push({
        row: rowIndex,
        index: j,
        item: it.item,
        visible: true,
        position: { x: it.pos_offs.x, y: it.pos_offs.y, z: it.pos_offs.z }, // metres
        rotation: { pitchDeg: it.rotation.x * 180/Math.PI, yawDeg: it.rotation.y * 180/Math.PI, rollDeg: 0 },
        scale: it.scale
      });
    }
  }

  /**
   * Advance simulation & compute transforms for all items.
   * @param {number} dt seconds
   * @returns {Array<TransformRecord>}
   */
  function update(dt) {
    const transforms = [];
    for (let r = 0; r < rows.length; r++) layoutRow(r, dt, transforms);
    return transforms;
  }

  // ---------------------------- PUBLIC API ---------------------------------
  const api = {
    configure(cfg) {
      if (!cfg) return;
      Object.keys(cfg).forEach(k => { if (k in CONFIG) CONFIG[k] = cfg[k]; });
    },

    rebuild, // rebuild(rows2d)
    getData() { return mainData; },

    // ✅ Metre-based control (displacement & velocity)
    scrollBy(rowIndex, deltaMetres) {
      const list = rows[rowIndex]; if (!list) return;
      list.scroll_s += deltaMetres; // m
    },
    setScrollVelocity(rowIndex, metresPerSecond) {
      const list = rows[rowIndex]; if (!list) return;
      list.v = metresPerSecond; // m/s
    },

    // Convenience: item-based wrappers (convert to metres on the fly)
    scrollByItems(rowIndex, deltaItems) {
      const list = rows[rowIndex]; if (!list) return;
      list.scroll_s += deltaItems * metresPerItem(); // m
    },
    setScrollVelocityItems(rowIndex, itemsPerSecond) {
      const list = rows[rowIndex]; if (!list) return;
      list.v = itemsPerSecond * metresPerItem(); // m/s
    },

    hover(rowIndex, itemIndex) { hovered.row = rowIndex; hovered.index = itemIndex; },
    clearHover() { hovered.row = -1; hovered.index = -1; },

    select(rowIndex, itemIndex) {
      selected.row = rowIndex; selected.index = itemIndex; mode = State.SELECTED;
    },
    deselect() { mode = State.SCROLLING; selected.row = -1; selected.index = -1; },

    snapNearest(rowIndex) {
      const list = rows[rowIndex]; if (!list) return;
      const sStep = metresPerItem();
      const u = list.scroll_s / sStep;           // items
      list.scroll_s = Math.round(u) * sStep;     // metres
    },

    update, // call per-frame if you manage your own loop

    // OPTIONAL built-in loop
    startLoop(applyTransformArray) {
      _apply = typeof applyTransformArray === 'function' ? applyTransformArray : null;
      if (_raf) return; // already running
      _last = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame : (cb)=>setTimeout(()=>cb(Date.now()),16);
      const stepFn = (tMs) => {
        const now = (typeof performance !== 'undefined' && performance.now) ? tMs : Date.now();
        const dt = Math.max(0.001, Math.min((now - _last) / 1000, 0.05));
        _last = now;
        const out = update(dt);
        if (_apply) { try { _apply(out); } catch(e) { console.error(e); } }
        _raf = raf(stepFn);
      };
      _raf = raf(stepFn);
    },
    stopLoop() {
      if (!_raf) return;
      const cancel = (typeof cancelAnimationFrame !== 'undefined') ? cancelAnimationFrame : clearTimeout;
      cancel(_raf); _raf = null; _apply = null;
    }
  };

  return api;
}

