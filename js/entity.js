/* The Kronos entity: a living point-cloud mind that watches the market.
   Adapted from the Money Engine's proof entity. 1000 points morph between
   an eye (it watches), a sphere (the whole market), and a ring (it focuses),
   breathing and rotating, depth-shaded. This is the face of the machine. */

(function () {
  const cv = document.getElementById("entity");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function size() {
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, r.width * dpr);
    cv.height = Math.max(1, r.height * dpr);
  }
  size();
  window.addEventListener("resize", size);

  const N = window.matchMedia("(max-width: 760px)").matches ? 620 : 1000;
  const P = [];
  for (let i = 0; i < N; i++) {
    P.push({
      x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2,
      u: (i + 0.5) / N, v: Math.random(), w: Math.random(),
      sp: 0.6 + Math.random() * 0.9, seed: Math.random() * 6.283,
    });
  }

  const FORMS = ["eye", "sphere", "ring"];
  let form = "eye";
  let next = performance.now() / 1000 + 10;
  const HUE = 158;   // brand green-cyan

  const target = (p, f, t) => {
    if (f === "eye") {
      const ring = Math.floor(p.u * 7);
      const rr = 0.34 + ring * 0.095 + 0.02 * Math.sin(t * 1.2 + p.seed);
      const ang = p.v * 6.283 + t * p.sp * (1.5 - ring * 0.16);
      return [Math.cos(ang) * rr, Math.sin(ang) * rr, (p.w - 0.5) * 0.1];
    }
    if (f === "ring") {
      const ang = p.v * 6.283 + t * p.sp * 0.9;
      const rr = 0.82 + 0.10 * Math.sin(p.u * 12.56 + t * 1.4);
      return [Math.cos(ang) * rr, Math.sin(ang) * rr, (p.w - 0.5) * 0.35];
    }
    const th = p.u * 6.283 * 13.09;
    const ph = Math.acos(2 * p.v - 1);
    const rr = 0.92 + 0.05 * Math.sin(t * 1.1 + p.seed);
    return [rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th)];
  };

  let raf = null;
  const draw = () => {
    raf = requestAnimationFrame(draw);
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    const t = performance.now() / 1000;
    if (t > next) {
      const others = FORMS.filter((x) => x !== form);
      form = others[Math.floor(Math.random() * others.length)];
      next = t + 9 + Math.random() * 7;
    }
    // fade trail
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const rotAmt = form === "eye" ? 0.25 : 1;
    const ry = t * 0.16 * rotAmt, rx = Math.sin(t * 0.1) * 0.42 * rotAmt;
    const cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
    const baseR = Math.min(W, H) * 0.4;
    // slow scan pulse: a brightness wave sweeping through depth
    const scan = 0.5 + 0.5 * Math.sin(t * 0.6);

    for (let i = 0; i < N; i++) {
      const p = P[i];
      const tgt = target(p, form, t);
      const k = 0.05 * p.sp;
      p.x += (tgt[0] - p.x) * k + Math.sin(t * 2 + p.seed * 7) * 0.0015;
      p.y += (tgt[1] - p.y) * k + Math.cos(t * 1.7 + p.seed * 9) * 0.0015;
      p.z += (tgt[2] - p.z) * k;
      let X = p.x * cyr + p.z * syr;
      let Z = -p.x * syr + p.z * cyr;
      const Y = p.y * cxr - Z * sxr;
      Z = p.y * sxr + Z * cxr;
      const sc = 3.2 / (3.2 - Z);
      const depth = Math.max(0.08, Math.min(1, (sc - 0.72) * 1.5));
      const glow = depth * (0.7 + 0.3 * scan);
      ctx.fillStyle = `hsla(${HUE}, 55%, ${58 + depth * 34}%, ${0.10 + glow * 0.42})`;
      const s = 1.5 * sc * dpr;
      ctx.fillRect(cx + X * baseR * sc, cy + Y * baseR * sc, s, s);
    }
    ctx.globalCompositeOperation = "source-over";
  };

  // Respect reduced-motion: draw one static sphere frame and stop.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    form = "sphere";
    for (let step = 0; step < 60; step++) {
      for (let i = 0; i < N; i++) {
        const p = P[i], tgt = target(p, "sphere", 0);
        p.x += (tgt[0] - p.x) * 0.3; p.y += (tgt[1] - p.y) * 0.3; p.z += (tgt[2] - p.z) * 0.3;
      }
    }
    draw();
    cancelAnimationFrame(raf);
    return;
  }

  raf = requestAnimationFrame(draw);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (!raf) raf = requestAnimationFrame(draw);
  });
})();
