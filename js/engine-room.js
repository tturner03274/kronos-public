/* THE ENGINE ROOM: a sky-view of the line. Real tickers (from the public
   feed) enter at Intake, pass a lens desk, get fused at the Scorer, are
   frozen and checked at the Ledger, then sort into band lanes.

   SECURITY: this shows ROLES only, never the real internal systems or bot
   names. The only live data used is tickers the engine already publishes.
   Abstracted on purpose. */

(function () {
  const room = document.getElementById("engine-room");
  const canvas = document.getElementById("er-canvas");
  const openBtn = document.getElementById("entity-open");
  const closeBtn = document.getElementById("er-close");
  const statsEl = document.getElementById("er-stats");
  if (!room || !canvas || !openBtn) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const FALLBACK = ["AAPL","NVDA","MSFT","AMD","TSLA","AVGO","CRWD","NET","SOFI","PLTR",
    "SHOP","ABNB","UBER","SNOW","DDOG","MELI","ASML","LLY","NOW","PANW"];
  let feed = window.KRONOS_FEED || null;
  document.addEventListener("kronos-feed", (e) => { feed = e.detail; });

  function tickerPool() {
    // ONLY aged, already-published names (the track record) flow through the
    // room. The fresh actionable picks are the paid product and never appear
    // here, so watching all day just recycles names already on the honesty
    // wall, never the current live list.
    const out = [];
    if (feed) {
      ((feed.track_record || {}).recent_picks || []).forEach((p) => p.ticker && out.push(p.ticker));
    }
    return out.length ? out : FALLBACK;
  }
  function totalScored() {
    return feed && feed.verdict && feed.verdict.high_band ? feed.verdict.high_band.sample_size : null;
  }

  // Stations in normalized coords. Roles only.
  const S = {
    intake:  { x: 0.06, y: 0.50, label: "INTAKE",       sub: "reads thousands" },
    price:   { x: 0.30, y: 0.16, label: "PRICE DESK",   sub: "momentum" },
    fund:    { x: 0.30, y: 0.39, label: "FUNDAMENTALS", sub: "business health" },
    cat:     { x: 0.30, y: 0.62, label: "CATALYST",     sub: "events ahead" },
    risk:    { x: 0.30, y: 0.85, label: "RISK DESK",    sub: "how it swings" },
    scorer:  { x: 0.57, y: 0.50, label: "SCORER",       sub: "fuses to conviction" },
    ledger:  { x: 0.78, y: 0.50, label: "LEDGER",       sub: "freeze · check · publish" },
    bTop:    { x: 0.955, y: 0.28, label: "TOP BAND",    sub: "" },
    bMid:    { x: 0.955, y: 0.50, label: "MID BAND",    sub: "" },
    bLow:    { x: 0.955, y: 0.72, label: "LOW BAND",    sub: "" },
  };
  const LENSES = ["price", "fund", "cat", "risk"];
  const BAND_COL = { top: "#2fcf96", mid: "#e0a33e", low: "#e05252" };
  const BAND_STA = { top: "bTop", mid: "bMid", low: "bLow" };

  // ambient path pulses along the main arteries
  const ARTERIES = [
    ["intake","price"],["intake","fund"],["intake","cat"],["intake","risk"],
    ["price","scorer"],["fund","scorer"],["cat","scorer"],["risk","scorer"],
    ["scorer","ledger"],["ledger","bTop"],["ledger","bMid"],["ledger","bLow"],
  ];

  let W = 0, H = 0, PAD = 40;
  function size() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    W = canvas.width; H = canvas.height; PAD = Math.min(W, H) * 0.06;
  }
  const px = (s) => PAD + S[s].x * (W - 2 * PAD);
  const py = (s) => PAD + S[s].y * (H - 2 * PAD);

  // Jobs
  const jobs = [];
  let lastSpawn = 0;
  const MAX_JOBS = 16;
  function pickBand() {
    const r = Math.random();
    return r < 0.16 ? "top" : r < 0.80 ? "mid" : "low";
  }
  function spawn(now) {
    const pool = tickerPool();
    const band = pickBand();
    const lens = LENSES[(Math.random() * LENSES.length) | 0];
    jobs.push({
      ticker: pool[(Math.random() * pool.length) | 0],
      band, lens,
      path: ["intake", lens, "scorer", "ledger", BAND_STA[band]],
      seg: 0, t: 0,
      speed: 0.16 + Math.random() * 0.08,
      born: now, hold: 0, scored: false, score: null,
    });
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  let raf = null, t0 = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - t0) / 1000 || 0); t0 = now;
    const T = now / 1000;

    // background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#080b0f";
    ctx.fillRect(0, 0, W, H);
    // faint floor grid
    ctx.strokeStyle = "rgba(151,173,196,0.05)"; ctx.lineWidth = 1;
    const gs = (W) / 26;
    for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // arteries + ambient pulses
    ctx.lineWidth = 1.2 * dpr;
    ARTERIES.forEach(([a, b], i) => {
      const ax = px(a), ay = py(a), bx = px(b), by = py(b);
      ctx.strokeStyle = "rgba(47,207,150,0.10)";
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const pt = ((T * 0.35 + i * 0.13) % 1);
      const gx = ax + (bx - ax) * pt, gy = ay + (by - ay) * pt;
      ctx.fillStyle = "rgba(47,207,150,0.35)";
      ctx.beginPath(); ctx.arc(gx, gy, 1.6 * dpr, 0, 7); ctx.fill();
    });

    // spawn
    if (now - lastSpawn > 620 && jobs.length < MAX_JOBS) { spawn(now); lastSpawn = now; }

    // jobs
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i];
      const from = j.path[j.seg], to = j.path[j.seg + 1];
      if (!to) { jobs.splice(i, 1); continue; }
      // ledger freeze/check pause
      if (from === "ledger" && j.hold < 1.0) { j.hold += dt; }
      else { j.t += j.speed * dt * 60 * 0.016; }
      if (j.t >= 1) { j.t = 0; j.seg++; if (j.path[j.seg] === "scorer") {} continue; }
      // score reveal once past scorer
      if (from === "scorer" && !j.scored) {
        j.scored = true;
        j.score = j.band === "top" ? (70 + Math.random() * 8) : j.band === "mid" ? (55 + Math.random() * 14) : (30 + Math.random() * 24);
      }
      const e = ease(j.t);
      const x = px(from) + (px(to) - px(from)) * e;
      const y = py(from) + (py(to) - py(from)) * e;
      const col = j.scored ? BAND_COL[j.band] : "#9fb0c2";
      // chip
      const label = j.scored ? `${j.ticker} ${j.score.toFixed(0)}` : j.ticker;
      ctx.font = `${11 * dpr}px "JetBrains Mono", monospace`;
      const wch = ctx.measureText(label).width + 14 * dpr;
      const hch = 18 * dpr;
      ctx.fillStyle = "rgba(10,15,20,0.9)";
      roundRect(x - wch / 2, y - hch / 2, wch, hch, 5 * dpr);
      ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
      ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, x, y + 0.5 * dpr);
      // freeze tick at ledger
      if (from === "ledger" && j.hold < 1.0) {
        ctx.fillStyle = "rgba(47,207,150,0.8)";
        ctx.fillText("✓", x + wch / 2 + 8 * dpr, y);
      }
    }

    // stations on top
    Object.keys(S).forEach((k) => drawStation(k, T));

    // stats
    if (statsEl) {
      const scored = totalScored();
      statsEl.innerHTML =
        `<span><b>${jobs.length}</b> tickers on the line</span>` +
        (scored ? `<span><b>${Number(scored).toLocaleString()}+</b> graded and published</span>` : "") +
        `<span><b>7</b> desks working</span>`;
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStation(k, T) {
    const st = S[k];
    const x = px(k), y = py(k);
    const isBand = k.startsWith("b");
    const col = k === "bTop" ? "#2fcf96" : k === "bMid" ? "#e0a33e" : k === "bLow" ? "#e05252"
      : k === "ledger" ? "#2fcf96" : k === "scorer" ? "#3fd0ff" : "#9fb0c2";
    const R = (isBand ? 7 : 10) * dpr;
    // glow
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34 * dpr);
    g.addColorStop(0, hexA(col, 0.28)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34 * dpr, 0, 7); ctx.fill();
    // orbiting workers (not for band exits)
    if (!isBand) {
      for (let w = 0; w < 3; w++) {
        const a = T * (0.9 + w * 0.4) + w * 2.1;
        const rr = (20 + w * 4) * dpr;
        ctx.fillStyle = hexA(col, 0.55);
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.8 * dpr, 0, 7); ctx.fill();
      }
    }
    // node
    ctx.fillStyle = "#0b0f14"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.6 * dpr; ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, R * 0.42, 0, 7); ctx.fill();
    // labels
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = isBand ? col : "#e8edf3";
    ctx.font = `700 ${10.5 * dpr}px "JetBrains Mono", monospace`;
    ctx.fillText(st.label, x, y + R + 12 * dpr);
    if (st.sub) {
      ctx.fillStyle = "rgba(159,176,194,0.65)";
      ctx.font = `${9 * dpr}px Inter, sans-serif`;
      ctx.fillText(st.sub, x, y + R + 25 * dpr);
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // open / close
  function open() {
    room.classList.add("open"); room.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    size(); jobs.length = 0; lastSpawn = 0; t0 = performance.now();
    for (let i = 0; i < 5; i++) spawn(performance.now() - i * 400);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() {
    room.classList.remove("open"); room.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  openBtn.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  room.addEventListener("click", (e) => { if (e.target === room) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && room.classList.contains("open")) close(); });
  window.addEventListener("resize", () => { if (room.classList.contains("open")) size(); });
})();
