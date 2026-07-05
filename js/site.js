/* KRONOS public site — renders entirely from the one-way feed. No calls to
   any private system; feed/public_feed.json is pushed here nightly. */

const GREEN = "#2fcf96", AMBER = "#e0a33e", INK = "rgba(159,176,194,.8)",
      GRID = "rgba(151,173,196,.09)";

async function loadFeed() {
  for (const path of ["feed/public_feed.json", "feed/public_feed.sample.json"]) {
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (e) { /* try next */ }
  }
  return null;
}

const sign = v => v == null ? "—" : (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%";

function renderHero(feed) {
  const hb = (feed.verdict || {}).high_band || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("st-beat", hb.beat_market_rate_pct != null ? hb.beat_market_rate_pct.toFixed(1) + "%" : "—");
  set("st-alpha", hb.avg_alpha_7d_pct != null ? sign(hb.avg_alpha_7d_pct) : "—");
  set("st-n", hb.sample_size != null ? Number(hb.sample_size).toLocaleString() : "—");
  set("as-of", "Ledger regenerated " + String(feed.generated_at || "").slice(0, 10) +
    " · every number on this page is recomputed nightly from raw outcomes");
  if (feed.disclaimer) set("disclaimer", feed.disclaimer);
}

function renderRace(feed) {
  const pts = feed.equity_race || [];
  const canvas = document.getElementById("race-chart");
  const head = document.getElementById("race-verdict");
  if (!canvas || pts.length < 2) {
    if (head) head.textContent = "The proof account's race chart appears here once enough history has aged in.";
    if (canvas) canvas.parentElement.style.display = "none";
    return;
  }
  const bK = pts.find(p => p.kronos_return_pct != null),
        bS = pts.find(p => p.sp500_return_pct != null);
  const reb = pts.map(p => ({
    d: p.date,
    k: p.kronos_return_pct != null && bK ? p.kronos_return_pct - bK.kronos_return_pct : null,
    s: p.sp500_return_pct != null && bS ? p.sp500_return_pct - bS.sp500_return_pct : null,
  }));
  const lastK = [...reb].reverse().find(p => p.k != null) || {},
        lastS = [...reb].reverse().find(p => p.s != null) || {};
  if (head && lastK.k != null) {
    const d = lastS.s == null ? null : lastK.k - lastS.s;
    head.innerHTML =
      `<span style="color:${GREEN};font-weight:700">Kronos ${sign(lastK.k)}</span>` +
      `<span style="color:${AMBER}">S&amp;P 500 ${sign(lastS.s)}</span>` +
      (d == null ? "" : `<span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "ahead" : "behind"} by ${Math.abs(d).toFixed(1)} pts</span>`);
  }
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.getBoundingClientRect().width - 28, H = 340;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 48, r: 70, t: 16, b: 30 };
  const vals = [];
  reb.forEach(p => { if (p.k != null) vals.push(p.k); if (p.s != null) vals.push(p.s); });
  let minY = Math.min(0, ...vals), maxY = Math.max(0, ...vals);
  const span = Math.max(maxY - minY, 2); minY -= span * .08; maxY += span * .08;
  const xAt = i => pad.l + i / (reb.length - 1) * (W - pad.l - pad.r);
  const yAt = v => pad.t + (1 - (v - minY) / (maxY - minY)) * (H - pad.t - pad.b);
  ctx.font = "11px JetBrains Mono, monospace";
  for (let i = 0; i <= 4; i++) {
    const v = maxY - (maxY - minY) / 4 * i, y = yAt(v);
    ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(sign(v).replace(".00", ""), 4, y + 4);
  }
  ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(159,176,194,.3)";
  ctx.beginPath(); ctx.moveTo(pad.l, yAt(0)); ctx.lineTo(W - pad.r, yAt(0)); ctx.stroke();
  ctx.setLineDash([]);
  const line = (f, color, lbl) => {
    const use = reb.map((p, i) => ({ v: p[f], i })).filter(x => x.v != null);
    if (!use.length) return;
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = "round";
    ctx.beginPath();
    use.forEach((x, n) => n ? ctx.lineTo(xAt(x.i), yAt(x.v)) : ctx.moveTo(xAt(x.i), yAt(x.v)));
    ctx.stroke();
    const last = use[use.length - 1];
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(xAt(last.i), yAt(last.v), 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(lbl, W - pad.r + 8, yAt(last.v) + 4);
  };
  line("s", AMBER, "S&P");
  line("k", GREEN, "Kronos");
  ctx.fillStyle = INK;
  ctx.fillText(reb[0].d || "", pad.l, H - 8);
  const e = reb[reb.length - 1].d || "";
  ctx.fillText(e, W - pad.r - ctx.measureText(e).width, H - 8);
}

let wallShown = 25;
function renderWall(feed) {
  const tr = feed.track_record || {};
  const row = document.getElementById("bands-row");
  if (row && tr.bands) {
    const label = { high: "Top rated", medium: "Middle band", low: "Low rated" };
    row.innerHTML = ["high", "medium", "low"].filter(b => tr.bands[b]).map(b => {
      const d = tr.bands[b];
      const col = d.beat_spy_rate_pct >= 55 ? GREEN : d.beat_spy_rate_pct >= 48 ? AMBER : "#e05252";
      return `<div class="bandcard"><div class="bn">${label[b] || b}</div>
        <div class="bv" style="color:${col}">${d.beat_spy_rate_pct}%</div>
        <div class="bs">beat the S&amp;P over 7 days · avg ${sign(d.avg_excess_7d_pct)} · n=${d.n.toLocaleString()}</div></div>`;
    }).join("") + `<div class="bandcard"><div class="bn">Why show all three?</div>
      <div class="bs" style="margin-top:8px">Because a real signal must separate good from bad.
      If every band beat the market equally, the scoring would mean nothing.</div></div>`;
  }
  const tbody = document.querySelector("#wall tbody");
  if (!tbody) return;
  const picks = tr.recent_picks || [];
  tbody.innerHTML = picks.slice(0, wallShown).map(p => {
    const c7 = p.return_7d_pct == null ? "dim" : p.return_7d_pct >= 0 ? "pos" : "neg";
    const cs = p.vs_spy_7d_pct == null ? "dim" : p.vs_spy_7d_pct >= 0 ? "pos" : "neg";
    const ca = p.risk_adjusted_alpha_7d_pct == null ? "dim" : p.risk_adjusted_alpha_7d_pct >= 0 ? "pos" : "neg";
    return `<tr><td>${p.ticker}</td><td class="dim">${p.scored_on}</td>
      <td class="${c7}">${sign(p.return_7d_pct)}</td>
      <td class="${cs}">${sign(p.vs_spy_7d_pct)}</td>
      <td class="${ca}">${sign(p.risk_adjusted_alpha_7d_pct)}</td></tr>`;
  }).join("");
  const more = document.getElementById("wall-more");
  if (more) {
    more.style.display = wallShown >= picks.length ? "none" : "";
    more.onclick = () => { wallShown += 50; renderWall(feed); };
  }
}

function renderPicks(feed) {
  const grid = document.getElementById("picks-grid");
  if (!grid) return;
  const picks = feed.current_picks || [];
  // Preview policy: the two OLDEST current picks visible, the rest locked —
  // proves the list is real without giving the product away.
  const shown = picks.slice(-2);
  const locked = Math.min(picks.length - shown.length, 10);
  grid.innerHTML =
    shown.map(p => `<div class="pick"><b>${p.ticker}</b>
      <div class="sc">score ${p.score}</div><div class="dt">entered ${p.entered_on}</div></div>`).join("") +
    Array.from({ length: locked }, () => `<div class="pick locked"><b>XXXX</b>
      <div class="sc">score 00.0</div><div class="dt">members only</div></div>`).join("");
}

function joinWaitlist(ev) {
  ev.preventDefault();
  // v1: store locally + mailto fallback. Swap for a real endpoint at launch.
  const email = document.getElementById("wl-email").value;
  try { localStorage.setItem("kronos-waitlist", email); } catch (e) {}
  document.getElementById("wl-done").textContent =
    "You're on the list — we'll email you when the live picks open.";
  ev.target.style.display = "none";
  return false;
}

loadFeed().then(feed => {
  if (!feed) return;
  renderHero(feed);
  renderRace(feed);
  renderWall(feed);
  renderPicks(feed);
});
