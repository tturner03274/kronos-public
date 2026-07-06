/* Ticker research page: renders one feed/tickers/{T}.json. Read-only, static,
   no calls to any private system. */

const DIM_META = {
  evidence:  ["Evidence",  "how much independent support the thesis has"],
  catalyst:  ["Catalyst",  "is something scheduled that can move the price"],
  quality:   ["Quality",   "do the different sources agree with each other"],
  asymmetry: ["Upside case", "how strong the reward side of the setup is"],
  timing:    ["Timing",    "how fresh the setup is right now"],
  risk:      ["Risk (works in reverse)", "how much this pulled the score DOWN"],
};
const DIM_ORDER = ["evidence", "catalyst", "quality", "asymmetry", "timing", "risk"];

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sign = (v, d = 2) => v == null ? null : (v >= 0 ? "+" : "") + Number(v).toFixed(d) + "%";
const cls = (v) => v == null ? "dim" : v >= 0 ? "pos" : "neg";

function getTicker() {
  const m = /[?&]t=([A-Za-z0-9.\-]{1,12})/.exec(location.search);
  return m ? m[1].toUpperCase() : null;
}

async function load() {
  const tk = getTicker();
  if (!tk) return miss();
  let d = null;
  for (const path of [`feed/tickers/${tk}.json`, `feed/tickers/${tk}.sample.json`]) {
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (r.ok) { d = await r.json(); break; }
    } catch (e) { /* next */ }
  }
  if (!d) return miss();
  render(d);
}

function miss() {
  document.getElementById("tk-missing").style.display = "";
}

function render(d) {
  document.getElementById("tk-page").style.display = "";
  document.title = `${d.ticker} · KRONOS research page`;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("tk-sym", d.ticker);
  set("tk-company", d.company || d.ticker);
  const sc = d.score || {};
  set("tk-composite", sc.composite != null ? Number(sc.composite).toFixed(1) : "n/a");
  set("tk-scored", sc.scored_at ? "scored " + String(sc.scored_at).slice(0, 10) +
    " · page rebuilt nightly from the raw ledger" : "");
  const band = document.getElementById("tk-band");
  if (band && sc.band) {
    band.textContent = sc.band === "high" ? "TOP BAND" : sc.band === "medium" ? "MID BAND" : "LOW BAND";
    band.className = "tk-band " + esc(sc.band);
  }
  set("tk-prompt", d.research_prompt || "");
  if (d.disclaimer) set("tk-disclaimer", d.disclaimer);

  // dimensions
  const dims = sc.dimensions || {};
  document.getElementById("tk-dims").innerHTML = DIM_ORDER.map((k) => {
    const v = dims[k];
    const [name, why] = DIM_META[k];
    const width = v == null ? 0 : Math.max(2, Math.min(100, v));
    return `<div class="tk-dim ${k === "risk" ? "risk" : ""}">
      <div class="tk-dim-top">
        <div class="tk-dim-name">${name}<span>${why}</span></div>
        <div class="tk-dim-val">${v == null ? "n/a" : Number(v).toFixed(0)}</div>
      </div>
      <div class="tk-bar"><i style="width:${width}%"></i></div>
    </div>`;
  }).join("");
  const ex = document.getElementById("tk-explain");
  if (sc.explanation) ex.textContent = sc.explanation; else ex.style.display = "none";

  // premium trade levels (only exist for a CLOSED, already-graded trade;
  // the live paid picks never carry these, blurred or not)
  const pl = d.premium_levels;
  const plSec = document.getElementById("tk-premium-sec");
  if (pl) {
    plSec.style.display = "";
    const rows = [
      [pl.entry_price, "buy price"],
      [pl.stop_price, "stop loss"],
      [pl.target_price, "target"],
      [pl.exit_price, "actual exit"],
    ].filter(([v]) => v != null);
    document.getElementById("tk-premium").innerHTML = `
      <div class="tk-prem-blur">
        ${rows.map(([v, label]) => `<div class="tk-prem-cell">
          <b>${Number(v).toFixed(2)}</b><span>${esc(label)}</span>
        </div>`).join("")}
      </div>
      <div class="tk-prem-lock">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="11" width="16" height="9" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        <span>Premium &middot; join the waitlist to see the exact levels on every call</span>
        <a class="btn-primary tk-prem-cta" href="index.html#join">Reserve your founding spot</a>
      </div>`;
  } else {
    plSec.style.display = "none";
  }

  // outcome
  const o = d.outcome;
  const osec = document.getElementById("tk-outcome-sec");
  if (o && (o.ret_7d_pct != null || o.ret_30d_pct != null)) {
    const cells = [
      [o.ret_7d_pct, "7-day return after scoring"],
      [o.vs_spy_7d_pct, "vs the S&P, same window"],
      [o.risk_adjusted_7d_pct, "risk-adjusted edge (skill after stripping the market)"],
      [o.ret_30d_pct, "30-day return"],
      [o.vs_spy_30d_pct, "vs the S&P over 30 days"],
    ].filter(([v]) => v != null);
    document.getElementById("tk-outcome").innerHTML = cells.map(([v, label]) =>
      `<div class="tk-out-cell"><b class="${cls(v)}">${sign(v)}</b><span>${label}</span></div>`
    ).join("");
  } else if (o) {
    document.getElementById("tk-outcome").innerHTML =
      `<div class="tk-out-cell"><b class="dim">too fresh</b><span>this call hasn't aged 7 days yet; the grade appears automatically when it does</span></div>`;
  } else {
    osec.style.display = "none";
  }

  // news
  const news = d.news || [];
  if (news.length) {
    document.getElementById("tk-news").innerHTML = news.map((a) => {
      const tags =
        (a.sentiment ? `<span class="tk-tag ${esc(a.sentiment)}">${esc(a.sentiment)}</span>` : "") +
        (a.catalyst_type ? `<span class="tk-tag cat">${esc(a.catalyst_type)}</span>` : "");
      return `<a class="tk-art" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
        <div class="tk-art-top">
          <span class="tk-art-src">${esc(a.source || "source")}</span>
          <span class="tk-art-src">${esc(a.published_on || "")}</span>${tags}
        </div>
        <h3>${esc(a.title)}</h3>
        ${a.summary ? `<p>${esc(a.summary)}</p>` : ""}
        <span class="tk-art-link">read the original &rarr;</span>
      </a>`;
    }).join("");
  } else {
    document.getElementById("tk-news-sec").style.display = "none";
  }

  // catalysts
  const cats = d.catalysts || [];
  if (cats.length) {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("tk-cats").innerHTML = cats.map((c) => {
      const future = c.event_date && c.event_date >= today;
      const meta = [];
      if (c.eps_estimate != null) meta.push(`est EPS ${c.eps_estimate}`);
      if (c.reported_eps != null) meta.push(`reported ${c.reported_eps}`);
      if (c.surprise_pct != null) meta.push(`surprise ${sign(c.surprise_pct, 1)}`);
      return `<div class="tk-cat">
        <div class="tk-cat-date ${future ? "future" : ""}">${esc(c.event_date || "tba")}</div>
        <div class="tk-cat-type">${esc(c.event_type || "event")}${future ? " (upcoming)" : ""}</div>
        ${meta.length ? `<div class="tk-cat-meta">${esc(meta.join(" · "))}</div>` : ""}
      </div>`;
    }).join("");
  } else {
    document.getElementById("tk-cat-sec").style.display = "none";
  }

  // fundamentals
  const f = d.fundamentals;
  if (f) {
    const pct = (v) => v == null ? null : (v > 1.5 ? v.toFixed(1) : (v * 100).toFixed(1)) + "%";
    const rows = [
      [f.sector, "sector"], [f.industry, "industry"], [f.market_cap, "market cap"],
      [f.pe_ratio != null ? Number(f.pe_ratio).toFixed(1) : null, "price / earnings"],
      [f.forward_pe != null ? Number(f.forward_pe).toFixed(1) : null, "forward P/E"],
      [pct(f.revenue_growth), "revenue growth"], [pct(f.eps_growth), "earnings growth"],
      [f.beta != null ? Number(f.beta).toFixed(2) : null, "beta (market sensitivity)"],
      [f.analyst_consensus, "analyst consensus"],
      [f.price_target != null ? Number(f.price_target).toFixed(2) : null, "analyst price target"],
      [f.profitability_score != null ? f.profitability_score + "/10" : null, "profitability score"],
      [f.balance_sheet_score != null ? f.balance_sheet_score + "/10" : null, "balance sheet score"],
    ].filter(([v]) => v != null && v !== "");
    document.getElementById("tk-funds").innerHTML = rows.map(([v, label]) =>
      `<div class="tk-fund"><b>${esc(v)}</b><span>${esc(label)}</span></div>`).join("");
  } else {
    document.getElementById("tk-fund-sec").style.display = "none";
  }

  // social
  const s = d.social;
  if (s && (s.top_posts || []).length) {
    document.getElementById("tk-social-sec").style.display = "";
    const mood = s.net_sentiment > 0 ? "leaning bullish" : s.net_sentiment < 0 ? "leaning bearish" : "mixed";
    document.getElementById("tk-social").innerHTML =
      `<div class="tk-soc-head">${esc(s.post_count || 0)} recent posts · crowd ${mood}</div>` +
      s.top_posts.map((p) => `<a class="tk-post" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
        <b>${esc(p.title)}</b>
        <span>r/${esc(p.subreddit || "")} · ${esc(p.score || 0)} upvotes · read on Reddit &rarr;</span>
      </a>`).join("");
  }

  // data sources: from the main feed
  fetch("feed/public_feed.json", { cache: "no-store" })
    .then((r) => r.ok ? r.json() : fetch("feed/public_feed.sample.json").then((r2) => r2.json()))
    .then((feed) => {
      const src = (feed && feed.data_sources) || [];
      if (!src.length) return;
      document.getElementById("tk-sources").innerHTML = src.map((x) =>
        `<div class="tk-src-chip"><b>${esc(x.name)}</b><span>${esc(x.role)}</span></div>`).join("");
    }).catch(() => {});
}

load();
