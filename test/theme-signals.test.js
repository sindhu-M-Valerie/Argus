const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildThemeSignals, describeTrend } = require('../lib/theme-signals');

function writeDay(dir, date, themeCounts) {
  const data = [];
  for (const [theme, n] of Object.entries(themeCounts)) {
    for (let i = 0; i < n; i += 1) {
      data.push({ title: `${theme} ${date} ${i}`, link: `https://x.test/${theme}/${date}/${i}`, source: `S${i % 2}`, publishedAt: `${date}T06:00:00Z`, theme, riskScore: 50 + i });
    }
  }
  fs.writeFileSync(path.join(dir, `live-sources-${date}.json`), JSON.stringify({ data }));
}

const days = (counts) => counts.map((count, i) => ({ date: `2026-10-0${i + 1}`, count }));

test('does not report a direction without enough collected days', () => {
  const r = describeTrend(days([null, null, null, null, 5, 6, 7]));
  assert.equal(r.trend, 'Insufficient history');
  assert.equal(r.changePercent, null);
});

test('does not report a direction on very low volume', () => {
  assert.equal(describeTrend(days([0, 1, 0, 0, 1, 0, 1])).trend, 'Low volume');
});

test('reports rising, falling and stable from real counts', () => {
  assert.equal(describeTrend(days([2, 2, 2, 2, 5, 5, 5])).trend, 'Rising');
  assert.equal(describeTrend(days([6, 6, 6, 6, 2, 2, 2])).trend, 'Falling');
  assert.equal(describeTrend(days([4, 4, 4, 4, 4, 4, 4])).trend, 'Stable');
});

test('treats missing days as not collected rather than zero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'argus-'));
  writeDay(dir, '2026-10-05', { malware: 3 });
  writeDay(dir, '2026-10-03', { malware: 1 });
  const result = buildThemeSignals(dir, '2026-10-05');
  const malware = result.data.find((s) => s.theme === 'malware');
  assert.equal(result.collectedDays, 2);
  assert.deepEqual(malware.daily.map((d) => d.count), [null, null, null, null, 1, null, 3]);
  assert.equal(malware.totalArticles, 4);
  assert.equal(malware.distinctSources, 2);
  assert.ok(malware.topArticles.every((a) => a.link.startsWith('https://x.test/')));
});

test('every committed signal figure is traceable to snapshot articles', () => {
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  const file = path.join(dataDir, 'signals.json');
  if (!fs.existsSync(file)) return;
  const signals = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const s of signals.data) {
    const summed = s.daily.reduce((n, d) => n + (d.count || 0), 0);
    assert.equal(summed, s.totalArticles, `${s.theme}: daily counts do not add up`);
    assert.ok(!('watchlistMentions' in s) && !('verifiedReports' in s));
  }
});
