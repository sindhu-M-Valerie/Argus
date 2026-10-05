#!/usr/bin/env node
"use strict";

/**
 * scripts/generate-daily-snapshot.js
 *
 * Builds the static JSON files the GitHub Pages dashboard reads (Pages has no
 * server, so these files ARE the data). Every item written here:
 *   - came from a real feed or GDELT fetch (no generated or placeholder articles),
 *   - has a real publishedAt that falls on the snapshot's IST calendar date,
 *   - was assigned a theme from its own title/snippet (classifyArticle), and
 *   - matched at least one harm theme; everything else is dropped.
 *
 * Usage:
 *   node scripts/generate-daily-snapshot.js                 # fetch now, update today + yesterday (IST)
 *   node scripts/generate-daily-snapshot.js --no-gdelt      # skip GDELT (faster local runs)
 *   node scripts/generate-daily-snapshot.js --rebuild 2026-09-24 2026-09-25
 *        # no fetching: re-clean existing dated files with the current classifier
 */

const fs = require("fs");
const path = require("path");
const {
  DASHBOARD_THEMES,
  classifyItems,
  collectRiskItems,
  collectAIPulseItems,
  buildAIPulseCards,
  buildNoResultsMessage,
  dedupeArticles,
  rankLiveItems,
  getISTDateString,
  isUsableArticleLink
} = require("../server");

const DATA_DIR = path.resolve(__dirname, "..", "public", "data");
const PULSE_WINDOW_DAYS = 7;

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function shiftISTDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + days);
  return getISTDateString(d);
}

/** Items already archived for a date, so repeated runs accumulate instead of overwrite. */
function loadArchivedItems(date) {
  const existing = readJSON(path.join(DATA_DIR, `live-sources-${date}.json`));
  return existing && Array.isArray(existing.data) ? existing.data : [];
}

function itemsForDate(items, date) {
  return items.filter((item) => item.publishedAt && getISTDateString(new Date(item.publishedAt)) === date);
}

function buildPayload({ date, theme, items, generatedAt, sourceStatus }) {
  const ranked = rankLiveItems(items, theme === "all" ? undefined : theme, Number.MAX_SAFE_INTEGER);
  return {
    generatedAt,
    snapshot: true,
    date,
    filters: { theme: theme === "all" ? null : theme, type: "news" },
    stats: { total: ranked.length },
    message: ranked.length ? null : buildNoResultsMessage({ date, theme }),
    sourceStatus: sourceStatus || [],
    data: ranked
  };
}

function writeDate(date, freshItems, { generatedAt, sourceStatus }) {
  // Old snapshot items may carry legacy themes; re-classify everything together.
  const merged = classifyItems(
    dedupeArticles([...loadArchivedItems(date), ...freshItems]).filter(
      (item) => item.title && isUsableArticleLink(item.link)
    )
  );
  const dayItems = itemsForDate(merged, date);

  const allPayload = buildPayload({ date, theme: "all", items: dayItems, generatedAt, sourceStatus });
  writeJSON(path.join(DATA_DIR, `live-sources-${date}.json`), allPayload);
  writeJSON(path.join(DATA_DIR, `live-sources-all-${date}.json`), allPayload);

  // Write every theme file, even when empty. A missing theme file makes the
  // dashboard fall back to the all-themes file and show unrelated articles.
  const counts = {};
  for (const theme of DASHBOARD_THEMES) {
    const themeItems = dayItems.filter((item) => item.theme === theme);
    counts[theme] = themeItems.length;
    writeJSON(
      path.join(DATA_DIR, `live-sources-theme-${theme}-${date}.json`),
      buildPayload({ date, theme, items: themeItems, generatedAt, sourceStatus })
    );
  }

  const nonEmpty = Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${t}:${n}`).join(", ");
  console.log(`  ${date}: ${dayItems.length} articles${nonEmpty ? ` (${nonEmpty})` : ""}`);
}

async function writeAIPulse(date, generatedAt) {
  const items = await collectAIPulseItems();
  const windowStart = shiftISTDate(date, -(PULSE_WINDOW_DAYS - 1));
  const recent = items.filter((item) => {
    const d = getISTDateString(new Date(item.publishedAt));
    return d >= windowStart && d <= date;
  });
  const cards = buildAIPulseCards(recent, generatedAt);
  const payload = {
    generatedAt,
    snapshot: true,
    date,
    windowDays: PULSE_WINDOW_DAYS,
    stats: { totalItems: recent.length, cardsWithLinks: cards.filter((c) => c.sourceLink).length },
    data: cards
  };
  writeJSON(path.join(DATA_DIR, `ai-safety-pulse-${date}.json`), payload);
  writeJSON(path.join(DATA_DIR, "ai-safety-pulse.json"), payload);
  console.log(`  AI pulse: ${recent.length} items in last ${PULSE_WINDOW_DAYS} days, ${payload.stats.cardsWithLinks}/${cards.length} cards with a source`);
}

async function main() {
  const args = process.argv.slice(2);
  const generatedAt = new Date().toISOString();

  if (args[0] === "--rebuild") {
    const dates = args.slice(1);
    if (!dates.length || dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
      console.error("Usage: --rebuild YYYY-MM-DD [YYYY-MM-DD ...]");
      process.exit(1);
    }
    console.log("Rebuilding existing snapshots (no fetch):");
    for (const date of dates) {
      const previous = readJSON(path.join(DATA_DIR, `live-sources-${date}.json`));
      writeDate(date, [], { generatedAt: (previous && previous.generatedAt) || generatedAt });
    }
    return;
  }

  const today = getISTDateString();
  const yesterday = shiftISTDate(today, -1);
  console.log(`Fetching live sources (IST today: ${today})...`);

  const { items, sourceStatus } = await collectRiskItems({ includeGdelt: !args.includes("--no-gdelt") });
  const online = sourceStatus.filter((s) => s.status === "online").length;
  console.log(`  ${items.length} on-topic items from ${online}/${sourceStatus.length} sources`);

  if (online === 0) {
    console.error("Every source failed; leaving existing snapshots untouched.");
    process.exit(1);
  }

  // Late-published items from yesterday arrive after midnight, so refresh both days.
  writeDate(yesterday, items, { generatedAt, sourceStatus });
  writeDate(today, items, { generatedAt, sourceStatus });
  await writeAIPulse(today, generatedAt);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
