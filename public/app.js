let selectedTheme = 'all';
let streamItems = [];
let streamCurrentPage = 1;
const streamPageSize = 5;
const apiBase = (window.TRUTHPULSE_API_BASE || '').replace(/\/$/, '');
let activeDataMode = 'live';
let lastDataTimestamp = null;

const riskBaselineByTheme = {
  violence: 'high',
  'child-abuse-nudity': 'high',
  'sexual-exploitation': 'high',
  'human-exploitation': 'high',
  'human-trafficking': 'high',
  ncii: 'high',
  'dangerous-organizations': 'high',
  'dangerous-misinformation': 'high',
  malware: 'high',
  cybersecurity: 'high',
  'fraud-impersonation': 'high',
  tvec: 'high',
  'harassment-bullying': 'medium',
  'violent-speech': 'medium',
  'illegal-goods': 'medium',
  'spam-inauthentic': 'medium',
  'suicide-self-harm': 'medium'
};

const highRiskEscalationTerms = [
  'terror', 'extrem', 'child sexual abuse', 'csam', 'sextortion', 'ncii', 'human trafficking',
  'ransomware', 'phishing', 'account takeover', 'coercion', 'forced labor', 'violent attack'
];

const mediumRiskTerms = [
  'harassment', 'bullying', 'threat', 'violent speech', 'illegal goods', 'spam', 'inauthentic'
];

const confidenceHighSources = [
  'pib', 'boom', 'reuters', 'associated press', 'ap news', 'bbc', 'the hindu',
  'indian express', 'ndtv', 'who', 'un ', 'unodc', 'gov'
];

const confidenceMediumSources = [
  'google news', 'gdelt', 'hindustan times', 'times of india', 'the week', 'india today'
];

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function apiUrl(path) {
  return `${apiBase}${path}`;
}

async function fetchJson(primaryUrl, fallbackUrl) {
  try {
    const response = await fetch(primaryUrl);
    if (!response.ok) {
      throw new Error('Primary request failed');
    }
    return { payload: await response.json(), mode: 'live' };
  } catch (error) {
    if (!fallbackUrl) {
      throw error;
    }

    const fallbackResponse = await fetch(fallbackUrl);
    if (!fallbackResponse.ok) {
      throw error;
    }
    return { payload: await fallbackResponse.json(), mode: 'snapshot' };
  }
}

function setDataMode(mode) {
  if (mode === 'snapshot') {
    activeDataMode = 'snapshot';
  } else if (activeDataMode !== 'snapshot') {
    activeDataMode = 'live';
  }

  const status = document.getElementById('dataModeStatus');
  if (!status) {
    return;
  }

  const isSnapshot = activeDataMode === 'snapshot';
  status.textContent = isSnapshot ? 'Data Mode: Snapshot Data' : 'Data Mode: Live API';
  status.classList.toggle('snapshot', isSnapshot);
  status.classList.toggle('live', !isSnapshot);
}

function setDataFreshness(timestamp) {
  if (timestamp) {
    lastDataTimestamp = timestamp;
  }

  const freshnessTargets = ['dataFreshness', 'topDataFreshness'];

  freshnessTargets.forEach((elementId) => {
    const target = document.getElementById(elementId);
    if (!target) {
      return;
    }

    if (!lastDataTimestamp) {
      target.textContent = 'Last Updated: —';
      return;
    }

    target.textContent = `Last Updated: ${new Date(lastDataTimestamp).toLocaleString()}`;
  });
}

function getRiskMeta(item) {
  const theme = (item.theme || '').toLowerCase();
  const text = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
  const baseline = riskBaselineByTheme[theme] || 'low';

  if (baseline === 'high' || containsAny(text, highRiskEscalationTerms)) {
    return { label: 'Risk: High', className: 'high' };
  }

  if (baseline === 'medium' || containsAny(text, mediumRiskTerms)) {
    return { label: 'Risk: Medium', className: 'medium' };
  }

  return { label: 'Risk: Low', className: 'low' };
}

function getConfidenceMeta(item) {
  const source = (item.source || '').toLowerCase();
  const text = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();

  if (containsAny(source, confidenceHighSources)) {
    return { label: 'Confidence: High', className: 'high' };
  }

  if (containsAny(source, confidenceMediumSources)) {
    return { label: 'Confidence: Medium', className: 'medium' };
  }

  if (text.includes('live source feed is temporarily unavailable')) {
    return { label: 'Confidence: Low', className: 'low' };
  }

  return { label: 'Confidence: Low', className: 'low' };
}

function showBackendBannerIfNeeded() {
  const banner = document.getElementById('backendBanner');
  if (!banner) {
    return;
  }

  banner.hidden = true;
}

showBackendBannerIfNeeded();

const themeDisplayNames = {
  all: 'Risk Signals',
  violence: 'Violence',
  'child-abuse-nudity': 'Child Abuse/Nudity',
  'sexual-exploitation': 'Sexual Exploitation',
  'human-exploitation': 'Human Exploitation',
  'suicide-self-harm': 'Suicide/Self-Harm',
  'violent-speech': 'Violent Speech',
  tvec: 'TVEC',
  'illegal-goods': 'Illegal Goods',
  'human-trafficking': 'Human Trafficking',
  ncii: 'NCII',
  'dangerous-organizations': 'Criminal Orgs',
  'harassment-bullying': 'Harassment',
  'dangerous-misinformation': 'Dangerous Misinfo',
  'spam-inauthentic': 'Spam/Inauthentic',
  malware: 'Malware',
  cybersecurity: 'Cybersecurity',
  'fraud-impersonation': 'Fraud/Impersonation'
};

async function loadSignals() {
  const list = document.getElementById('signalsList');

  if (selectedTheme === 'all') {
    list.innerHTML = '<p class="signals-empty">Select a label to view article links in this section.</p>';
    return;
  }

  const selectedThemeLabel = themeDisplayNames[selectedTheme] || 'Risk Signals';

  try {
    const { payload, mode } = await fetchJson(
      apiUrl(`/api/live-sources?theme=${encodeURIComponent(selectedTheme)}&type=news&limit=18`),
      `./data/live-sources-theme-${selectedTheme}.json`
    );
    setDataMode(mode);
    setDataFreshness(payload.generatedAt);
    const items = Array.isArray(payload.data) ? payload.data : [];

    const uniqueItems = [];
    const seenLinks = new Set();

    items.forEach((item) => {
      if (item.link && !seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        uniqueItems.push(item);
      }
    });

    list.innerHTML = '';

    if (!uniqueItems.length) {
      list.innerHTML = `<p class="signals-empty">No article links available for ${selectedThemeLabel} right now.</p>`;
      return;
    }

    uniqueItems.slice(0, 12).forEach((item) => {
      const row = document.createElement('article');
      row.className = 'signal-item link-only';
      row.innerHTML = `
        <p class="signal-link-title"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></p>
        <p class="signal-link-meta">${item.source} • ${new Date(item.publishedAt).toLocaleString()}</p>
      `;
      list.appendChild(row);
    });
  } catch (error) {
    list.innerHTML = '<p class="signals-empty">Unable to load article links right now.</p>';
  }
}

loadSignals();

function calculateHeatLevel(count) {
  if (count >= 12) {
    return 'high';
  }
  if (count >= 6) {
    return 'medium';
  }
  return 'low';
}

async function loadRegionalAndIncidentInsights() {
  const geoUpdated = document.getElementById('geoUpdated');
  const geoHeatmapList = document.getElementById('geoHeatmapList');

  const regionRules = {
    India: ['india', 'delhi', 'mumbai', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad'],
    APAC: ['apac', 'asia-pacific', 'india', 'indonesia', 'philippines', 'singapore', 'japan', 'korea', 'australia', 'new zealand', 'malaysia', 'thailand', 'vietnam', 'hong kong', 'taiwan'],
    'South Asia': ['south asia', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'bhutan', 'maldives', 'afghanistan'],
    'Southeast Asia': ['southeast asia', 'indonesia', 'philippines', 'thailand', 'vietnam', 'malaysia', 'singapore', 'myanmar', 'cambodia', 'laos'],
    'Middle East': ['middle east', 'uae', 'saudi', 'qatar', 'oman', 'kuwait', 'bahrain', 'iran', 'iraq', 'israel', 'jordan', 'lebanon', 'yemen', 'syria'],
    Europe: ['europe', 'uk', 'united kingdom', 'france', 'germany', 'italy', 'spain', 'netherlands', 'sweden', 'poland', 'ukraine'],
    Africa: ['africa', 'nigeria', 'kenya', 'south africa', 'ghana', 'ethiopia', 'egypt', 'morocco', 'tanzania', 'uganda'],
    'Latin America': ['latin america', 'brazil', 'argentina', 'mexico', 'colombia', 'chile', 'peru', 'ecuador', 'venezuela'],
    'North America': ['north america', 'united states', 'usa', 'us ', 'canada', 'mexico', 'california', 'new york', 'washington']
  };

  const regionSearchLinks = {
    India: 'https://news.google.com/search?q=India%20digital%20risk%20misinformation',
    APAC: 'https://news.google.com/search?q=APAC%20digital%20risk%20misinformation',
    'South Asia': 'https://news.google.com/search?q=South%20Asia%20digital%20risk%20misinformation',
    'Southeast Asia': 'https://news.google.com/search?q=Southeast%20Asia%20digital%20risk%20misinformation',
    'Middle East': 'https://news.google.com/search?q=Middle%20East%20digital%20risk%20misinformation',
    Europe: 'https://news.google.com/search?q=Europe%20digital%20risk%20misinformation',
    Africa: 'https://news.google.com/search?q=Africa%20digital%20risk%20misinformation',
    'Latin America': 'https://news.google.com/search?q=Latin%20America%20digital%20risk%20misinformation',
    'North America': 'https://news.google.com/search?q=North%20America%20digital%20risk%20misinformation'
  };

  try {
    const { payload, mode } = await fetchJson(
      apiUrl('/api/live-sources?type=news&limit=90'),
      './data/live-sources-all.json'
    );
    setDataMode(mode);
    setDataFreshness(payload.generatedAt);
    const items = Array.isArray(payload.data) ? payload.data : [];

    const regionCounts = Object.entries(regionRules).map(([region, keywords]) => {
      const uniqueByLink = [];
      const seenLinks = new Set();
      items
        .filter((item) => {
          const text = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
          return keywords.some((keyword) => text.includes(keyword));
        })
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .forEach((entry) => {
          if (!seenLinks.has(entry.link)) {
            seenLinks.add(entry.link);
            uniqueByLink.push(entry);
          }
        });

      const count = uniqueByLink.length;

      return { region, count, level: calculateHeatLevel(count), links: uniqueByLink.slice(0, 3) };
    });

    geoHeatmapList.innerHTML = '';
    regionCounts.forEach((entry) => {
      const row = document.createElement('article');
      row.className = `geo-heatmap-item ${entry.level}`;

      const articleLinksMarkup = entry.links.length
        ? entry.links
            .map(
              (article) => `<li><a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a></li>`
            )
            .join('')
        : '<li>No matched articles in the latest scan.</li>';

      row.innerHTML = `
        <div>
          <p class="geo-region">${entry.region}</p>
          <p class="geo-count">${entry.count} relevant articles</p>
          <ul class="geo-article-links">${articleLinksMarkup}</ul>
          <p class="geo-more-link"><a href="${regionSearchLinks[entry.region]}" target="_blank" rel="noopener noreferrer">Open full ${entry.region} news search</a></p>
        </div>
        <span class="geo-level ${entry.level}">${entry.level}</span>
      `;
      geoHeatmapList.appendChild(row);
    });

    const updatedAt = new Date(payload.generatedAt).toLocaleTimeString();
    geoUpdated.textContent = `Live article scan updated ${updatedAt}`;
  } catch (error) {
    geoUpdated.textContent = 'Unable to load regional heatmap right now.';
    geoHeatmapList.innerHTML = '';
  }
}

loadRegionalAndIncidentInsights();

async function loadStreamStatus() {
  const misinfoNewsList = document.getElementById('misinfoNewsList');
  const streamPanelTitle = document.getElementById('streamPanelTitle');
  streamPanelTitle.textContent = 'Live Trending News';

  try {
    const { payload, mode } = await fetchJson(
      apiUrl('/api/live-sources?type=news&limit=30'),
      './data/live-sources-all.json'
    );
    setDataMode(mode);

    setDataFreshness(payload.generatedAt);
    const uniqueItems = [];
    const seenLinks = new Set();
    (Array.isArray(payload.data) ? payload.data : []).forEach((item) => {
      if (item.link && !seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        uniqueItems.push(item);
      }
    });

    streamItems = uniqueItems;
    streamCurrentPage = 1;
    renderStreamPage();
  } catch (error) {
    streamItems = [];
    streamCurrentPage = 1;
    renderStreamPage();
  }
}

loadStreamStatus();

function renderStreamPage() {
  const misinfoNewsList = document.getElementById('misinfoNewsList');
  const streamPrevBtn = document.getElementById('streamPrevBtn');
  const streamNextBtn = document.getElementById('streamNextBtn');
  const streamPageInfo = document.getElementById('streamPageInfo');

  if (!misinfoNewsList || !streamPrevBtn || !streamNextBtn || !streamPageInfo) {
    return;
  }

  const totalPages = Math.max(1, Math.ceil(streamItems.length / streamPageSize));
  streamCurrentPage = Math.min(Math.max(streamCurrentPage, 1), totalPages);
  const start = (streamCurrentPage - 1) * streamPageSize;
  const pageItems = streamItems.slice(start, start + streamPageSize);

  misinfoNewsList.innerHTML = '';

  if (!pageItems.length) {
    misinfoNewsList.innerHTML = '<p class="signals-empty">No live trending articles right now.</p>';
  } else {
    pageItems.forEach((item) => {
      const riskMeta = getRiskMeta(item);
      const confidenceMeta = getConfidenceMeta(item);
      const factCheckQuery = encodeURIComponent(item.title || item.snippet || 'misinformation fact check');
      const factCheckUrl = `https://toolbox.google.com/factcheck/explorer/search/${factCheckQuery}`;
      const row = document.createElement('article');
      row.className = 'live-source-item';
      row.innerHTML = `
        <p class="live-source-title"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></p>
        <p class="live-source-meta">${item.source} • ${new Date(item.publishedAt).toLocaleString()}</p>
        <div class="live-source-badges">
          <span class="risk-badge ${riskMeta.className}">${riskMeta.label}</span>
          <span class="confidence-badge ${confidenceMeta.className}">${confidenceMeta.label}</span>
          <a class="fact-check-link" href="${factCheckUrl}" target="_blank" rel="noopener noreferrer">Fact-check</a>
        </div>
      `;
      misinfoNewsList.appendChild(row);
    });
  }

  streamPageInfo.textContent = `Page ${streamCurrentPage} of ${totalPages}`;
  streamPrevBtn.disabled = streamCurrentPage <= 1;
  streamNextBtn.disabled = streamCurrentPage >= totalPages;
}

function initStreamPagination() {
  const streamPrevBtn = document.getElementById('streamPrevBtn');
  const streamNextBtn = document.getElementById('streamNextBtn');

  if (!streamPrevBtn || !streamNextBtn) {
    return;
  }

  streamPrevBtn.addEventListener('click', () => {
    if (streamCurrentPage > 1) {
      streamCurrentPage -= 1;
      renderStreamPage();
    }
  });

  streamNextBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(streamItems.length / streamPageSize));
    if (streamCurrentPage < totalPages) {
      streamCurrentPage += 1;
      renderStreamPage();
    }
  });
}

initStreamPagination();

function initThemeFilterBar() {
  const filterBar = document.getElementById('themeFilterBar');

  if (!filterBar) {
    return;
  }

  const buttons = Array.from(filterBar.querySelectorAll('.theme-filter-btn'));

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const theme = button.dataset.theme || 'all';
      if (theme === selectedTheme) {
        return;
      }

      selectedTheme = theme;
      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      loadSignals();
      loadStreamStatus();
    });
  });
}

initThemeFilterBar();
