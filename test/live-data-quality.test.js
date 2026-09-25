const test = require('node:test');
const assert = require('node:assert/strict');
const { isRelevantLiveItem, dedupeArticles, rankLiveItems, isUsableArticleLink, buildNoResultsMessage, buildProvenanceBadge, sortRiskItems, filterRiskItems, filterVerifiedItems } = require('../server');

test('keeps relevant risk articles for the selected theme', () => {
  const item = {
    title: 'India misinformation campaign spreads false medical claims online',
    snippet: 'deepfake video and fake safety advice triggered viral spread',
    source: 'GDELT Public News API',
    theme: 'dangerous-misinformation',
    type: 'News'
  };

  assert.equal(isRelevantLiveItem(item, 'dangerous-misinformation'), true);
  assert.equal(
    isRelevantLiveItem(
      {
        title: 'Assignment help discounted tutoring',
        snippet: 'promo sale for homework help',
        source: 'Low signal',
        theme: 'dangerous-misinformation',
        type: 'News'
      },
      'dangerous-misinformation'
    ),
    false
  );
});

test('deduplicates repeated article links and preserves the most recent item', () => {
  const items = [
    {
      title: 'Old article',
      link: 'https://source-a.test/story',
      publishedAt: '2026-01-01T00:00:00.000Z',
      source: 'A'
    },
    {
      title: 'New article',
      link: 'https://source-a.test/story',
      publishedAt: '2026-03-01T00:00:00.000Z',
      source: 'B'
    },
    {
      title: 'Unique article',
      link: 'https://source-b.test/other',
      publishedAt: '2026-03-02T00:00:00.000Z',
      source: 'C'
    }
  ];

  const result = dedupeArticles(items);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'Unique article');
  assert.equal(result[1].title, 'New article');
});

test('raises corroboration metadata when independent sources cover the same story', () => {
  const result = rankLiveItems([
    {
      title: 'Officials investigate dangerous misinformation campaign',
      link: 'https://reuters.example/story',
      publishedAt: '2026-09-24T08:00:00.000Z',
      source: 'Reuters',
      snippet: 'Officials investigate false safety information'
    },
    {
      title: 'Officials investigate dangerous misinformation campaign',
      link: 'https://bbc.example/story',
      publishedAt: '2026-09-24T08:05:00.000Z',
      source: 'BBC',
      snippet: 'Officials investigate false safety information'
    }
  ], 'dangerous-misinformation', 2);

  assert.equal(result[0].corroboratedBy, 2);
  assert.equal(result[1].corroboratedBy, 2);
  assert.ok(result[0].riskScore >= result[1].riskScore);
});

test('rejects placeholder article links', () => {
  assert.equal(isUsableArticleLink('https://news.example.com/human-trafficking/1771093338458-42'), false);
  assert.equal(isUsableArticleLink('https://news.google.com/search?q=human%20trafficking'), true);
});

test('creates explicit historical no-source messaging when the date has records but no verified links', () => {
  const message = buildNoResultsMessage({ date: '2026-03-20', theme: 'human-trafficking', hasHistoricalRecords: true });

  assert.match(message, /Historical reports exist/i);
  assert.match(message, /no verified source links are available/i);
});

test('labels each result with a clear provenance status', () => {
  assert.equal(buildProvenanceBadge({ provenance: 'live-feed' }), 'Live feed');
  assert.equal(buildProvenanceBadge({ provenance: 'historical-archive' }), 'Historical archive');
  assert.equal(buildProvenanceBadge({ provenance: 'unverified' }), 'Unverified');
});

test('sorts the stream by highest risk before recency when the user prioritizes risk', () => {
  const items = [
    { title: 'Recent low-risk update', riskScore: 25, publishedAt: '2026-09-24T12:00:00.000Z' },
    { title: 'Older high-risk alert', riskScore: 88, publishedAt: '2026-09-21T12:00:00.000Z' },
    { title: 'Newest medium alert', riskScore: 60, publishedAt: '2026-09-24T14:00:00.000Z' }
  ];

  const sorted = sortRiskItems(items, 'risk');
  assert.equal(sorted[0].title, 'Older high-risk alert');
  assert.equal(sorted[1].title, 'Newest medium alert');
  assert.equal(sorted[2].title, 'Recent low-risk update');
});

test('filters stream items by keyword across the headline and summary', () => {
  const items = [
    { title: 'Trafficking ring disrupted in border checkpoint', snippet: 'Large operation by local authorities', riskScore: 80 },
    { title: 'Market movement update', snippet: 'Retail prices rise slightly', riskScore: 35 }
  ];

  const filtered = filterRiskItems(items, 'trafficking');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Trafficking ring disrupted in border checkpoint');
});

test('filters out unverified items when the user wants only trusted coverage', () => {
  const items = [
    { title: 'Verified live story', provenance: 'live-feed' },
    { title: 'Historical but trusted', provenance: 'historical-archive' },
    { title: 'Fallback notice', provenance: 'unverified' }
  ];

  const filtered = filterVerifiedItems(items);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].title, 'Verified live story');
  assert.equal(filtered[1].title, 'Historical but trusted');
});
