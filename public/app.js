let selectedTheme = 'all';
let streamItems = [];
let streamCurrentPage = 1;
const streamPageSize = 5;
const apiBase = (window.TRUTHPULSE_API_BASE || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${apiBase}${path}`;
}

async function fetchJson(primaryUrl, fallbackUrl) {
  try {
    const response = await fetch(primaryUrl);
    if (!response.ok) {
      throw new Error('Primary request failed');
    }
    return await response.json();
  } catch (error) {
    if (!fallbackUrl) {
      throw error;
    }

    const fallbackResponse = await fetch(fallbackUrl);
    if (!fallbackResponse.ok) {
      throw error;
    }
    return await fallbackResponse.json();
  }
}

function showBackendBannerIfNeeded() {
  const banner = document.getElementById('backendBanner');
  if (!banner) {
    return;
  }

  const isGitHubPages = window.location.hostname.endsWith('github.io');
  banner.hidden = !(isGitHubPages && !apiBase);
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
    const payload = await fetchJson(
      apiUrl(`/api/live-sources?theme=${encodeURIComponent(selectedTheme)}&type=news&limit=18`),
      `./data/live-sources-theme-${selectedTheme}.json`
    );
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
    APAC: ['apac', 'asia-pacific', 'india', 'indonesia', 'philippines', 'singapore', 'japan', 'korea', 'australia', 'new zealand', 'malaysia', 'thailand', 'vietnam', 'hong kong', 'taiwan'],
    'South Asia': ['south asia', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'bhutan', 'maldives', 'afghanistan'],
    'North America': ['north america', 'united states', 'usa', 'us ', 'canada', 'mexico', 'california', 'new york', 'washington']
  };

  const regionSearchLinks = {
    APAC: 'https://news.google.com/search?q=APAC%20digital%20risk%20misinformation',
    'South Asia': 'https://news.google.com/search?q=South%20Asia%20digital%20risk%20misinformation',
    'North America': 'https://news.google.com/search?q=North%20America%20digital%20risk%20misinformation'
  };

  try {
    const payload = await fetchJson(
      apiUrl('/api/live-sources?type=news&limit=90'),
      './data/live-sources-all.json'
    );
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
    const payload = await fetchJson(
      apiUrl('/api/live-sources?type=news&limit=30'),
      './data/live-sources-all.json'
    );

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
      const row = document.createElement('article');
      row.className = 'live-source-item';
      row.innerHTML = `
        <p class="live-source-title"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></p>
        <p class="live-source-meta">${item.source} • ${new Date(item.publishedAt).toLocaleString()}</p>
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
