"use strict";

/**
 * Theme signals computed ONLY from archived daily snapshots in public/data.
 * Nothing here is estimated or invented: every number is a count of real,
 * collected articles, and every link points at one of those articles.
 *
 * A day with no snapshot file is "not collected" (null), which is different
 * from a collected day with zero articles (0). Trends are only reported when
 * there is enough collected history and volume to say something.
 */

const fs = require("fs");
const path = require("path");

const WINDOW_DAYS = 7;
const RECENT_DAYS = 3;           // compared against the earlier days of the window
const MIN_COLLECTED_DAYS = 4;    // need at least this many collected days for a trend
const MIN_WINDOW_ARTICLES = 5;   // below this, volume is too low to call a direction
const RISING_RATIO = 1.25;
const FALLING_RATIO = 0.8;

const THEME_LABELS = {
  violence: "Violence",
  "child-abuse-nudity": "Child Abuse / Nudity",
  "sexual-exploitation": "Sexual Exploitation",
  "human-exploitation": "Human Exploitation",
  "suicide-self-harm": "Suicide / Self-Harm",
  "violent-speech": "Violent Speech",
  tvec: "Terrorist & Violent Extremist Content",
  "illegal-goods": "Illegal Goods",
  "human-trafficking": "Human Trafficking",
  ncii: "Non-Consensual Intimate Imagery",
  "dangerous-organizations": "Criminal & Dangerous Organizations",
  "harassment-bullying": "Harassment & Bullying",
  "dangerous-misinformation": "Dangerous Misinformation",
  "spam-inauthentic": "Spam & Inauthentic Behavior",
  malware: "Malware",
  cybersecurity: "Cybersecurity",
  "fraud-impersonation": "Fraud & Impersonation"
};

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function readItemsForDate(dataDir, date) {
  const file = path.join(dataDir, `live-sources-${date}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return null;
  }
}

function latestSnapshotDate(dataDir) {
  const dates = fs
    .readdirSync(dataDir)
    .map((f) => (f.match(/^live-sources-(\d{4}-\d{2}-\d{2})\.json$/) || [])[1])
    .filter(Boolean)
    .sort();
  return dates[dates.length - 1] || null;
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function describeTrend(daily) {
  const collected = daily.filter((d) => d.count !== null);
  const total = collected.reduce((sum, d) => sum + d.count, 0);

  if (collected.length < MIN_COLLECTED_DAYS) {
    return { trend: "Insufficient history", changePercent: null, reason: `Only ${collected.length} of ${daily.length} days collected.` };
  }
  if (total < MIN_WINDOW_ARTICLES) {
    return { trend: "Low volume", changePercent: null, reason: `${total} article${total === 1 ? "" : "s"} in ${collected.length} collected days.` };
  }

  const recent = daily.slice(-RECENT_DAYS).filter((d) => d.count !== null).map((d) => d.count);
  const earlier = daily.slice(0, -RECENT_DAYS).filter((d) => d.count !== null).map((d) => d.count);
  if (!recent.length || !earlier.length) {
    return { trend: "Insufficient history", changePercent: null, reason: "Need collected days in both halves of the window." };
  }

  const recentAvg = average(recent);
  const earlierAvg = average(earlier);
  if (earlierAvg === 0) {
    return { trend: "New activity", changePercent: null, reason: `No articles in the earlier days; ${recent.reduce((a, b) => a + b, 0)} recently.` };
  }

  const ratio = recentAvg / earlierAvg;
  const changePercent = Math.round((ratio - 1) * 100);
  const trend = ratio >= RISING_RATIO ? "Rising" : ratio <= FALLING_RATIO ? "Falling" : "Stable";
  return {
    trend,
    changePercent,
    reason: `Last ${RECENT_DAYS} days averaged ${recentAvg.toFixed(1)}/day vs ${earlierAvg.toFixed(1)}/day before.`
  };
}

/**
 * Build per-theme signals for the WINDOW_DAYS ending on endDate (IST calendar dates).
 */
function buildThemeSignals(dataDir, endDate = latestSnapshotDate(dataDir), themes = Object.keys(THEME_LABELS)) {
  const generatedAt = new Date().toISOString();
  if (!endDate) {
    return { generatedAt, windowDays: WINDOW_DAYS, endDate: null, collectedDays: 0, data: [] };
  }

  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) => shiftDate(endDate, i - (WINDOW_DAYS - 1)));
  const itemsByDate = Object.fromEntries(dates.map((d) => [d, readItemsForDate(dataDir, d)]));
  const collectedDays = dates.filter((d) => itemsByDate[d] !== null).length;

  const data = themes.map((theme) => {
    const daily = dates.map((date) => {
      const items = itemsByDate[date];
      return { date, count: items === null ? null : items.filter((i) => i.theme === theme).length };
    });

    const themeItems = dates.flatMap((d) => (itemsByDate[d] || []).filter((i) => i.theme === theme));
    const totalArticles = themeItems.length;
    const sources = new Set(themeItems.map((i) => i.source).filter(Boolean));
    const highRisk = themeItems.filter((i) => (i.riskScore || 0) >= 70).length;
    const topArticles = [...themeItems]
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0) || new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 8)
      .map(({ title, link, source, publishedAt, riskScore, corroboratedBy }) => ({ title, link, source, publishedAt, riskScore, corroboratedBy }));

    return {
      theme,
      label: THEME_LABELS[theme] || theme,
      totalArticles,
      distinctSources: sources.size,
      highRiskArticles: highRisk,
      ...describeTrend(daily),
      daily,
      topArticles
    };
  });

  data.sort((a, b) => b.totalArticles - a.totalArticles || a.label.localeCompare(b.label));
  return { generatedAt, windowDays: WINDOW_DAYS, endDate, collectedDays, data };
}

module.exports = { buildThemeSignals, describeTrend, latestSnapshotDate, THEME_LABELS, WINDOW_DAYS };
