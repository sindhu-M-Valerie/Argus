const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  DASHBOARD_THEMES,
  classifyArticle,
  classifyItems,
  isRelevantLiveItem,
  parseGdeltDate,
  rankLiveItems,
  getISTDateString
} = require('../server');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

test('assigns themes from article text, not from the feed it came from', () => {
  assert.equal(
    classifyArticle({ title: 'Canada lists extremist network 764 as terrorists', theme: 'dangerous-organizations' }),
    'tvec'
  );
  assert.equal(
    classifyArticle({ title: 'PIB fact-check unit busts 50 deepfakes', theme: 'dangerous-misinformation' }),
    'dangerous-misinformation'
  );
});

test('drops articles that match no harm theme', () => {
  assert.equal(classifyArticle({ title: 'Accelerating vision-language models with LFM2.5', theme: 'cybersecurity' }), null);
  assert.equal(classifyArticle({ title: 'Glaucoma detection across myopic populations', theme: 'dangerous-misinformation' }), null);
});

test('never lets AI-ecosystem feeds into the harm stream', () => {
  const items = classifyItems([
    { title: 'Speech deepfake detection with wavelet scattering', source: 'arXiv cs.AI Recent Papers', link: 'https://arxiv.org/abs/1', publishedAt: '2026-09-25T00:00:00Z' },
    { title: 'Hugging Face ships a new malware scanner', source: 'Hugging Face Blog', link: 'https://hf.co/blog/x', publishedAt: '2026-09-25T00:00:00Z' }
  ]);
  assert.equal(items.length, 0);
});

test('matches terms at word starts only', () => {
  assert.equal(classifyArticle({ title: 'Farmers sell crops at wholesale markets' }), null);
  assert.equal(classifyArticle({ title: 'Hackers leak voter data in breach' }), 'cybersecurity');
});

test('relevance requires vocabulary for the requested theme', () => {
  const item = { title: 'Ransomware gang hits hospital network', source: 'Reuters' };
  assert.equal(isRelevantLiveItem(item, 'malware'), true);
  assert.equal(isRelevantLiveItem(item, 'suicide-self-harm'), false);
});

test('parses GDELT seendate format', () => {
  assert.equal(parseGdeltDate('20260924T123000Z'), '2026-09-24T12:30:00.000Z');
  assert.equal(parseGdeltDate('not a date'), null);
});

test('risk scores spread out instead of saturating at 100', () => {
  const ranked = rankLiveItems([
    { title: 'Spam bots flood comment sections', source: 'Google News', theme: 'spam-inauthentic', link: 'https://a.test/1', publishedAt: '2026-09-24T00:00:00Z' },
    { title: 'CSAM network: child sexual abuse material seized, child abuse charges', source: 'Reuters', theme: 'child-abuse-nudity', link: 'https://b.test/2', publishedAt: '2026-09-24T00:00:00Z' }
  ], undefined, 10);
  const scores = ranked.map((r) => r.riskScore);
  assert.ok(Math.max(...scores) < 100);
  assert.ok(Math.max(...scores) - Math.min(...scores) >= 15);
});

// ── Guards on the committed data itself ────────────────────────────────────

const datedFiles = fs.readdirSync(DATA_DIR).filter((f) => /^live-sources-\d{4}-\d{2}-\d{2}\.json$/.test(f));

test('committed snapshots contain no placeholder or fabricated links', () => {
  for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
    assert.ok(!raw.includes('example.com'), `${file} contains an example.com link`);
  }
});

test('every article in a dated snapshot was published on that IST date', () => {
  for (const file of datedFiles) {
    const date = file.match(/(\d{4}-\d{2}-\d{2})/)[1];
    const { data } = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    for (const item of data) {
      assert.equal(getISTDateString(new Date(item.publishedAt)), date, `${file}: "${item.title}"`);
    }
  }
});

test('every dated snapshot has a file for every theme', () => {
  for (const file of datedFiles) {
    const date = file.match(/(\d{4}-\d{2}-\d{2})/)[1];
    for (const theme of DASHBOARD_THEMES) {
      assert.ok(fs.existsSync(path.join(DATA_DIR, `live-sources-theme-${theme}-${date}.json`)), `missing ${theme} for ${date}`);
    }
  }
});
