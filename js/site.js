/* KRONOS public site: renders entirely from the one-way feed. No calls to
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

const sign = v => v == null ? "n/a" : (v >= 0 ? "+" : "") + Number(v).toFixed(2) + "%";

function renderHero(feed) {
  const hb = (feed.verdict || {}).high_band || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("st-beat", hb.beat_market_rate_pct != null ? hb.beat_market_rate_pct.toFixed(1) + "%" : "n/a");
  set("st-alpha", hb.avg_alpha_7d_pct != null ? sign(hb.avg_alpha_7d_pct) : "n/a");
  set("st-n", hb.sample_size != null ? Number(hb.sample_size).toLocaleString() : "n/a");
  set("as-of", "Ledger regenerated " + String(feed.generated_at || "").slice(0, 10) +
    " · every number on this page is recomputed nightly from raw outcomes");
  const tr = (feed.verdict || {}).trend;
  const trEl = document.getElementById("hero-trend");
  if (trEl && tr && tr.early_pct != null && tr.recent_pct != null) {
    const word = tr.direction === "improving" ? "improving"
      : tr.direction === "declining" ? "declining" : "holding steady";
    trEl.textContent = "Trend: earlier picks beat the market " + tr.early_pct +
      "% of the time, the most recent half " + tr.recent_pct + "% (" + word +
      "). We publish this because a real edge must survive time.";
    trEl.style.display = "";
  }
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
  // The feed already ships cumulative proof-account and S&P returns from the
  // same Track Record source. Do not rebase again in the browser; that creates
  // a second set of growth percentages that no longer matches Kronos.
  const reb = pts.map(p => ({
    d: p.date,
    k: p.kronos_return_pct,
    s: p.sp500_return_pct,
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

function renderRealTrades(feed) {
  const rt = feed.real_trades;
  const stats = document.getElementById("real-trades-stats");
  const note = document.getElementById("rt-note");
  if (!rt || !stats) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("rt-win", rt.win_rate_pct.toFixed(1) + "%");
  set("rt-exp", sign(rt.expectancy_pct));
  set("rt-n", Number(rt.n).toLocaleString());
  stats.style.display = "";
  if (note) { note.textContent = rt.note; note.style.display = ""; }
}

let wallShown = 25;
function renderWall(feed) {
  const tr = feed.track_record || {};
  const row = document.getElementById("bands-row");
  if (row && tr.bands) {
    const label = { high: "Top rated", medium: "Middle band", low: "Low rated" };
    row.innerHTML = ["high", "medium", "low"].filter(b => tr.bands[b]).map(b => {
      const d = tr.bands[b];
      // Lead with the risk-adjusted rate: it is the number the hero publishes
      // and the "harder question" the How-it-works section promises. Raw
      // beat-the-S&P stays visible underneath, clearly labelled.
      const lead = d.beat_risk_adjusted_pct != null ? d.beat_risk_adjusted_pct : d.beat_spy_rate_pct;
      const leadAvg = d.beat_risk_adjusted_pct != null ? d.avg_alpha_7d_pct : d.avg_excess_7d_pct;
      const col = lead >= 55 ? GREEN : lead >= 48 ? AMBER : "#e05252";
      const leadLabel = d.beat_risk_adjusted_pct != null
        ? "beat the market, risk-adjusted, over 7 days" : "beat the S&amp;P over 7 days";
      const rawLine = d.beat_risk_adjusted_pct != null
        ? `<div class="bs bs-raw">raw, before risk adjustment: ${d.beat_spy_rate_pct}% beat the S&amp;P</div>` : "";
      return `<div class="bandcard"><div class="bn">${label[b] || b}</div>
        <div class="bv" style="color:${col}">${lead}%</div>
        <div class="bs">${leadLabel} · avg ${sign(leadAvg)} · n=${d.n.toLocaleString()}</div>
        ${rawLine}</div>`;
    }).join("") + `<div class="bandcard"><div class="bn">Why show all three?</div>
      <div class="bs" style="margin-top:8px">Because a real signal must separate good from bad.
      If every band beat the market equally, the scoring would mean nothing.</div></div>`;
  }
  const caveat = document.getElementById("wall-30d-caveat");
  const high = tr.bands && tr.bands.high;
  if (caveat && high && high.avg_excess_30d_pct != null && high.avg_excess_30d_pct < 0) {
    caveat.textContent = " One honest wrinkle: held out to 30 days, the top band's edge currently " +
      "fades and goes slightly negative (" + sign(high.avg_excess_30d_pct) +
      " vs the S&P). The edge we have measured so far lives in the first one to two weeks.";
  }
  const tbody = document.querySelector("#wall tbody");
  if (!tbody) return;
  const hasPages = !!feed.ticker_pages;
  const picks = tr.recent_picks || [];
  tbody.innerHTML = picks.slice(0, wallShown).map(p => {
    const c7 = p.return_7d_pct == null ? "dim" : p.return_7d_pct >= 0 ? "pos" : "neg";
    const cs = p.vs_spy_7d_pct == null ? "dim" : p.vs_spy_7d_pct >= 0 ? "pos" : "neg";
    const ca = p.risk_adjusted_alpha_7d_pct == null ? "dim" : p.risk_adjusted_alpha_7d_pct >= 0 ? "pos" : "neg";
    const name = hasPages
      ? `<a class="wall-link" href="ticker.html?t=${encodeURIComponent(p.ticker)}">${p.ticker}<span class="wall-link-hint">research &rarr;</span></a>`
      : p.ticker;
    return `<tr><td>${name}</td><td class="dim">${p.scored_on}</td>
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
  // The feed only ever ships a count + a 2-name teaser. The actionable list
  // (and all reference levels) lives behind the members login, never here.
  const pt = feed.picks_today || {};
  const shown = pt.preview || [];
  const locked = Math.max(0, Math.min((pt.count || 0) - shown.length, 10));
  const hasPages = !!feed.ticker_pages;
  grid.innerHTML =
    shown.map(p => {
      const inner = `<b>${p.ticker}</b>
        <div class="sc">score ${p.score}</div><div class="dt">entered ${p.entered_on}</div>`;
      return hasPages
        ? `<a class="pick pick-link" href="ticker.html?t=${encodeURIComponent(p.ticker)}">${inner}
            <div class="dt" style="color:var(--green-hi)">see the research &rarr;</div></a>`
        : `<div class="pick">${inner}</div>`;
    }).join("") +
    Array.from({ length: locked }, () => `<div class="pick locked"><b>XXXX</b>
      <div class="sc">score 00.0</div><div class="dt">members only</div></div>`).join("");
}

// Waitlist -> Web3Forms (free, no account, unlimited; each signup emails Tom).
// GET A KEY: go to https://web3forms.com, enter your email, they send an
// access key in seconds. Paste it below in place of the placeholder.
// Until then the form still works: it stores the email locally and thanks
// the user, so nothing looks broken before the key is set.
const WAITLIST_ENDPOINT = "https://api.web3forms.com/submit";
const WAITLIST_ACCESS_KEY = "f8324d6f-7ea7-4979-81ed-fc0044117dce";

function _wlMsg(text, warn) {
  const done = document.getElementById("wl-done");
  if (!done) return;
  done.textContent = text;
  done.style.color = warn ? "#e0a33e" : "";
}

async function joinWaitlist(ev) {
  ev.preventDefault();
  const form = ev.target;
  const input = document.getElementById("wl-email");
  const btn = form.querySelector("button");
  const email = (input.value || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    _wlMsg("That doesn't look like an email. Try again.", true);
    return false;
  }
  const bot = form.querySelector('[name="botcheck"]');
  if (bot && bot.checked) return false;   // honeypot tripped
  try { localStorage.setItem("kronos-waitlist", email); } catch (e) {}
  btn.disabled = true; btn.textContent = "Adding you...";

  const keySet = WAITLIST_ACCESS_KEY && !WAITLIST_ACCESS_KEY.startsWith("PASTE_");
  if (keySet) {
    try {
      const r = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WAITLIST_ACCESS_KEY,
          subject: "New Kronos waitlist signup",
          from_name: "Kronos site",
          email: email,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) throw new Error("submit failed");
    } catch (e) {
      _wlMsg("Saved. If it doesn't come through, email tomcjturner@gmail.com and we'll add you.", true);
      form.style.display = "none";
      return false;
    }
  }
  _wlMsg("You're on the list. We'll email you when the live picks open.");
  form.style.display = "none";
  return false;
}

loadFeed().then(feed => {
  if (!feed) return;
  window.KRONOS_FEED = feed;   // engine-room reads real tickers from here
  document.dispatchEvent(new CustomEvent("kronos-feed", { detail: feed }));
  renderHero(feed);
  renderRace(feed);
  renderRealTrades(feed);
  renderWall(feed);
  renderPicks(feed);
});
