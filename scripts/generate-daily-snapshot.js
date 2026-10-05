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
 *   node scripts/generate-daily-snapshot.js --backfill 2026-10-02 # fetch a past date from Google News RSS
 *   node scripts/generate-daily-snapshot.js --backfill-range 2026-01-01 2026-10-06 # fill a date range
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

const { buildThemeSignals } = require("../lib/theme-signals");

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

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function* datesBetween(start, end) {
  for (let date = start; date <= end; date = shiftISTDate(date, 1)) yield date;
}

function monthWindows(start, end) {
  const windows = [];
  for (let cursor = start; cursor <= end;) {
    const current = new Date(`${cursor}T12:00:00.000Z`);
    const monthEnd = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0));
    const lastDay = monthEnd.toISOString().slice(0, 10);
    const windowEnd = lastDay < end ? lastDay : end;
    windows.push([cursor, windowEnd]);
    cursor = shiftISTDate(windowEnd, 1);
  }
  return windows;
}

function mergeSourceStatuses(...groups) {
  const merged = new Map();
  for (const source of groups.flat()) {
    const current = merged.get(source.label);
    if (!current) {
      merged.set(source.label, { ...source });
      continue;
    }
    current.itemCount += source.itemCount;
    if (source.status === "online") current.status = "online";
  }
  return [...merged.values()];
}

async function collectHistoricalWindow(start, end) {
  const result = await collectRiskItems({ includeGdelt: false, date: start, throughDate: end });
  const saturated = result.sourceStatus.some((source) => source.itemCount >= 100);
  if (!saturated || start === end) return result;

  const span = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
  const middle = shiftISTDate(start, Math.floor(span / 2));
  const next = shiftISTDate(middle, 1);
  console.log(`  Source result cap reached for ${start}..${end}; splitting the window`);

  const firstHalf = await collectHistoricalWindow(start, middle);
  const secondHalf = await collectHistoricalWindow(next, end);
  return {
    items: dedupeArticles([...firstHalf.items, ...secondHalf.items]),
    sourceStatus: mergeSourceStatuses(firstHalf.sourceStatus, secondHalf.sourceStatus)
  };
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

/** 7-day per-theme signals, computed from the archived snapshots just written. */
function writeThemeSignals() {
  const signals = buildThemeSignals(DATA_DIR);
  writeJSON(path.join(DATA_DIR, "signals.json"), signals);
  const active = signals.data.filter((s) => s.totalArticles).length;
  console.log(`  Signals: ${signals.collectedDays}/${signals.windowDays} days collected, ${active} themes with articles`);
}

async function main() {
  const args = process.argv.slice(2);
  const generatedAt = new Date().toISOString();

  if (args[0] === "--backfill") {
    const date = args[1];
    if (args.length !== 2 || !isValidDate(date)) {
      console.error("Usage: --backfill YYYY-MM-DD");
      process.exit(1);
    }

    console.log(`Backfilling ${date} from date-filtered Google News RSS (GDELT disabled).`);
    const { items, sourceStatus } = await collectRiskItems({ includeGdelt: false, date });
    const verifiedItems = items.filter((item) =>
      item.title &&
      item.publishedAt &&
      getISTDateString(new Date(item.publishedAt)) === date &&
      isUsableArticleLink(item.link)
    );
    const online = sourceStatus.filter((source) => source.status === "online").length;

    if (online === 0 || verifiedItems.length === 0) {
      console.error(`No verified, source-linked articles found for ${date}; snapshots were not changed.`);
      process.exit(1);
    }

    console.log(`  ${verifiedItems.length} verified articles from ${online}/${sourceStatus.length} Google News feeds`);
    writeDate(date, verifiedItems, { generatedAt, sourceStatus });
    writeThemeSignals();
    return;
  }

  if (args[0] === "--backfill-range") {
    const [start, end] = args.slice(1);
    if (args.length !== 3 || !isValidDate(start) || !isValidDate(end) || start > end) {
      console.error("Usage: --backfill-range YYYY-MM-DD YYYY-MM-DD");
      process.exit(1);
    }

    console.log(`Backfilling ${start} through ${end} from date-filtered Google News RSS (GDELT disabled).`);
    let writtenDays = 0;
    let daysWithArticles = 0;
    let totalArticles = 0;

    for (const [windowStart, windowEnd] of monthWindows(start, end)) {
      const { items, sourceStatus } = await collectHistoricalWindow(windowStart, windowEnd);
      const online = sourceStatus.filter((source) => source.status === "online").length;
      if (online === 0) {
        console.error(`  ${windowStart}..${windowEnd}: all sources failed; leaving this window unchanged.`);
        continue;
      }

      const itemsByDate = new Map();
      for (const item of items) {
        const date = getISTDateString(new Date(item.publishedAt));
        if (!itemsByDate.has(date)) itemsByDate.set(date, []);
        itemsByDate.get(date).push(item);
      }

      for (const date of datesBetween(windowStart, windowEnd)) {
        const dayItems = itemsByDate.get(date) || [];
        const daySourceStatus = sourceStatus.map((source) => ({
          ...source,
          itemCount: dayItems.filter((item) => item.source === source.label).length
        }));
        writeDate(date, dayItems, { generatedAt, sourceStatus: daySourceStatus });
        writtenDays += 1;
        if (dayItems.length) daysWithArticles += 1;
        totalArticles += dayItems.length;
      }
    }

    if (writtenDays === 0) {
      console.error("No snapshots written because every historical source failed.");
      process.exit(1);
    }

    writeThemeSignals();
    console.log(`Backfill complete: ${writtenDays} days written, ${daysWithArticles} with articles, ${totalArticles} fetched articles.`);
    return;
  }

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
    writeThemeSignals();
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
  writeThemeSignals();
  await writeAIPulse(today, generatedAt);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
