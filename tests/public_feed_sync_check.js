const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const kronosRoot = path.resolve(root, "..", "kronos");

const publicFeed = JSON.parse(fs.readFileSync(path.join(root, "feed", "public_feed.json"), "utf8"));
const sourceFeed = JSON.parse(fs.readFileSync(path.join(kronosRoot, "data", "public_feed.json"), "utf8"));
const siteJs = fs.readFileSync(path.join(root, "js", "site.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

function lastRacePoint(feed) {
  const race = feed.equity_race || [];
  return race[race.length - 1] || null;
}

assert.equal(
  publicFeed.generated_at,
  sourceFeed.generated_at,
  "public feed must be refreshed from the current Kronos export before deploy",
);
assert.deepEqual(
  lastRacePoint(publicFeed),
  lastRacePoint(sourceFeed),
  "public race chart data must match the current Kronos export",
);
assert.equal(
  publicFeed.verdict?.high_band?.beat_market_rate_pct,
  sourceFeed.verdict?.high_band?.beat_market_rate_pct,
  "public high-band headline must match the current Kronos export",
);

assert.match(
  siteJs,
  /k: p\.kronos_return_pct,\s+s: p\.sp500_return_pct,/,
  "race chart must render the feed's Track Record percentages directly",
);
assert.doesNotMatch(
  siteJs,
  /bK = pts\.find\(p => p\.kronos_return_pct != null\)/,
  "race chart must not independently rebase Kronos from a different date",
);
assert.doesNotMatch(
  siteJs,
  /p\.kronos_return_pct - /,
  "race chart must not subtract a second frontend baseline from Track Record data",
);
assert.match(indexHtml, /js\/site\.js\?v=6/, "site.js cache-buster must be bumped");

console.log("public feed sync check passed", {
  generated_at: publicFeed.generated_at,
  race_last: lastRacePoint(publicFeed),
  high_band: publicFeed.verdict?.high_band,
});
