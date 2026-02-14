/* ================================
   ARGUS — Clean Date-Scoped Build
   ================================ */

let selectedTheme = "all";
let selectedDate = getTodayIST();

let streamItems = [];
let filteredStreamItems = [];
let streamCurrentPage = 1;
const streamPageSize = 5;

let selectedStreamCategory = "all";
let selectedStreamRegion = "all";

/* ================================
   UTILITIES
================================ */

function getTodayIST() {
  const now = new Date();
  const IST_OFFSET = 330;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + IST_OFFSET * 60000);
  return ist.toISOString().split("T")[0];
}

async function fetchSnapshot(filePath) {
  const res = await fetch(`${filePath}?_cb=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Missing file: ${filePath}`);
  return await res.json();
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setFreshness(generatedAt) {
  if (!generatedAt) return;
  const stamp = new Date(generatedAt).toLocaleString();
  safeSetText("dataFreshness", `Last Updated: ${stamp}`);
  safeSetText("topDataFreshness", `Last Updated: ${stamp}`);

  const editionStamp = document.getElementById("editionStamp");
  if (editionStamp) {
    editionStamp.textContent = `Edition Stamp: ${new Date(generatedAt).toLocaleDateString()} • Daily 06:00 IST Edition`;
  }
}

/* ================================
   THEME DISPLAY MAP
================================ */

const themeDisplayNames = {
  all: "Risk Signals",
  violence: "Violence",
  "child-abuse-nudity": "Child Abuse/Nudity",
  "sexual-exploitation": "Sexual Exploitation",
  "human-exploitation": "Human Exploitation",
  "suicide-self-harm": "Suicide/Self-Harm",
  "violent-speech": "Violent Speech",
  tvec: "TVEC",
  "illegal-goods": "Illegal Goods",
  "human-trafficking": "Human Trafficking",
  ncii: "NCII",
  "dangerous-organizations": "Criminal Orgs",
  "harassment-bullying": "Harassment",
  "dangerous-misinformation": "Dangerous Misinfo",
  "spam-inauthentic": "Spam/Inauthentic",
  malware: "Malware",
  cybersecurity: "Cybersecurity",
  "fraud-impersonation": "Fraud/Impersonation",
};

/* ================================
   RISK & CONFIDENCE HELPERS
================================ */

const riskBaselineByTheme = {
  violence: "high",
  "child-abuse-nudity": "high",
  "sexual-exploitation": "high",
  "human-exploitation": "high",
  "human-trafficking": "high",
  ncii: "high",
  "dangerous-organizations": "high",
  "dangerous-misinformation": "high",
  malware: "high",
  cybersecurity: "high",
  "fraud-impersonation": "high",
  tvec: "high",
  "harassment-bullying": "medium",
  "violent-speech": "medium",
  "illegal-goods": "medium",
  "spam-inauthentic": "medium",
  "suicide-self-harm": "medium",
};

const highRiskTerms = [
  "terror", "extrem", "child sexual abuse", "csam", "sextortion", "ncii",
  "human trafficking", "ransomware", "phishing", "account takeover",
  "coercion", "forced labor", "violent attack",
];

const mediumRiskTerms = [
  "harassment", "bullying", "threat", "violent speech",
  "illegal goods", "spam", "inauthentic",
];

const highConfidenceSources = [
  "pib", "boom", "reuters", "associated press", "ap news", "bbc", "the hindu",
  "indian express", "ndtv", "who", "un ", "unodc", "gov",
];

const mediumConfidenceSources = [
  "google news", "gdelt", "hindustan times", "times of india",
  "the week", "india today",
];

function containsAny(text, terms) {
  return terms.some((t) => text.includes(t));
}

function getRiskMeta(item) {
  const theme = (item.theme || "").toLowerCase();
  const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
  const baseline = riskBaselineByTheme[theme] || "low";
  if (baseline === "high" || containsAny(text, highRiskTerms))
    return { label: "Risk: High", className: "high" };
  if (baseline === "medium" || containsAny(text, mediumRiskTerms))
    return { label: "Risk: Medium", className: "medium" };
  return { label: "Risk: Low", className: "low" };
}

function getConfidenceMeta(item) {
  const source = (item.source || "").toLowerCase();
  if (containsAny(source, highConfidenceSources))
    return { label: "Confidence: High", className: "high" };
  if (containsAny(source, mediumConfidenceSources))
    return { label: "Confidence: Medium", className: "medium" };
  return { label: "Confidence: Low", className: "low" };
}

/* ================================
   REGION RULES
================================ */

const regionRules = {
  India: ["india", "indian", "delhi", "mumbai", "bengaluru", "bangalore", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad", "jaipur", "lucknow", "bhopal", "modi", "pradhan", "lok sabha", "rajya sabha", "niti aayog", "aadhaar", "upi"],
  APAC: ["apac", "asia-pacific", "asia pacific", "indonesia", "indonesian", "philippines", "filipino", "singapore", "japan", "japanese", "korea", "korean", "australia", "australian", "new zealand", "malaysia", "malaysian", "thailand", "thai", "vietnam", "vietnamese", "hong kong", "taiwan", "chinese", "china", "beijing", "shanghai"],
  "South Asia": ["south asia", "pakistan", "pakistani", "bangladesh", "bangladeshi", "sri lanka", "sri lankan", "nepal", "nepali", "bhutan", "maldives", "afghan"],
  "Southeast Asia": ["southeast asia", "south-east asia", "asean", "indonesia", "philippines", "thailand", "vietnam", "malaysia", "singapore", "myanmar", "cambodia", "laos"],
  "Middle East": ["middle east", "mideast", "uae", "saudi", "qatar", "oman", "kuwait", "bahrain", "iran", "iranian", "iraq", "iraqi", "israel", "israeli", "jordan", "lebanon", "yemen", "syria", "syrian", "dubai", "abu dhabi"],
  Europe: ["europe", "european", "uk", "united kingdom", "britain", "british", "france", "french", "germany", "german", "italy", "italian", "spain", "spanish", "netherlands", "dutch", "sweden", "swedish", "poland", "polish", "ukraine", "ukrainian", "eu ", "brussels", "london", "paris", "berlin"],
  Africa: ["africa", "african", "nigeria", "nigerian", "kenya", "kenyan", "south africa", "ghana", "ghanaian", "ethiopia", "ethiopian", "egypt", "egyptian", "morocco", "moroccan", "tanzania", "uganda", "congo", "sahel"],
  "Latin America": ["latin america", "south america", "brazil", "brazilian", "argentina", "argentine", "mexico", "mexican", "colombia", "colombian", "chile", "chilean", "peru", "peruvian", "ecuador", "venezuela", "venezuelan"],
  "North America": ["north america", "united states", "american", "usa", "u.s.", "canada", "canadian", "california", "new york", "washington", "congress", "white house", "pentagon", "fbi", "cia", "nsa", "silicon valley", "texas", "florida"],
  Global: ["global", "worldwide", "international", "world", "united nations", "un ", "who ", "nato", "g7", "g20", "imf", "world bank", "interpol", "cyber", "online", "internet", "social media", "platform", "digital", "ai ", "artificial intelligence", "deepfake", "misinformation", "disinformation", "fact-check", "fact check"],
};

const regionSearchLinks = {
  India: "https://news.google.com/search?q=India%20digital%20risk%20misinformation",
  APAC: "https://news.google.com/search?q=APAC%20digital%20risk%20misinformation",
  "South Asia": "https://news.google.com/search?q=South%20Asia%20digital%20risk%20misinformation",
  "Southeast Asia": "https://news.google.com/search?q=Southeast%20Asia%20digital%20risk%20misinformation",
  "Middle East": "https://news.google.com/search?q=Middle%20East%20digital%20risk%20misinformation",
  Europe: "https://news.google.com/search?q=Europe%20digital%20risk%20misinformation",
  Africa: "https://news.google.com/search?q=Africa%20digital%20risk%20misinformation",
  "Latin America": "https://news.google.com/search?q=Latin%20America%20digital%20risk%20misinformation",
  "North America": "https://news.google.com/search?q=North%20America%20digital%20risk%20misinformation",
  Global: "https://news.google.com/search?q=global%20digital%20risk%20misinformation",
};

function calculateHeatLevel(count) {
  if (count >= 12) return "high";
  if (count >= 6) return "medium";
  return "low";
}

function getStreamRegion(item) {
  const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
  for (const [region, terms] of Object.entries(regionRules)) {
    if (terms.some((t) => text.includes(t))) return region;
  }
  return "Global";
}

function getStreamCategory(item) {
  const key = (item.theme || "").toLowerCase();
  return themeDisplayNames[key] || "Uncategorized";
}

/* ================================
   LOAD RISK SIGNALS
================================ */

async function loadSignals() {
  const list = document.getElementById("signalsList");
  if (!list) return;

  if (selectedTheme === "all") {
    list.innerHTML = '<p class="signals-empty">Select a label to view article links in this section.</p>';
    return;
  }

  const label = themeDisplayNames[selectedTheme] || "Risk Signals";

  try {
    const data = await fetchSnapshot(
      `./data/live-sources-theme-${selectedTheme}-${selectedDate}.json`
    );

    const items = (data.data || []).filter((a, i, arr) =>
      arr.findIndex((b) => b.link === a.link) === i
    );
    setFreshness(data.generatedAt);
    renderMiniTrend(items, data.generatedAt);

    list.innerHTML = "";

    if (!items.length) {
      list.innerHTML = `<p class="signals-empty">No article links available for ${label} on ${selectedDate}.</p>`;
      return;
    }

    items.slice(0, 12).forEach((item) => {
      const row = document.createElement("article");
      row.className = "signal-item link-only";
      row.innerHTML = `
        <p class="signal-link-title"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></p>
        <p class="signal-link-meta">${item.source} • ${new Date(item.publishedAt).toLocaleString()}</p>
      `;
      list.appendChild(row);
    });
  } catch {
    list.innerHTML = '<p class="signals-empty">Snapshot missing for this theme/date.</p>';
  }
}

/* ================================
   MINI TREND
================================ */

function renderMiniTrend(items, generatedAt) {
  const chart = document.getElementById("miniTrendChart");
  const updated = document.getElementById("miniTrendUpdated");
  if (!chart || !updated) return;

  if (!items.length) {
    chart.innerHTML = '<p class="signals-empty">No trend data available.</p>';
    updated.textContent = "24h signal trend unavailable";
    return;
  }

  const counts = new Map();
  items.forEach((i) => {
    const label = themeDisplayNames[(i.theme || "").toLowerCase()] || "Other";
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = rows[0] ? rows[0][1] : 1;

  chart.innerHTML = rows
    .map(([label, count]) => {
      const width = Math.max(6, Math.round((count / max) * 100));
      return `
        <div class="mini-trend-row">
          <span class="mini-trend-label">${label}</span>
          <div class="mini-trend-bar-track"><div class="mini-trend-bar" style="width:${width}%"></div></div>
          <span class="mini-trend-value">${count}</span>
        </div>
      `;
    })
    .join("");

  const stamp = generatedAt ? new Date(generatedAt).toLocaleTimeString() : "";
  updated.textContent = `24h signal trend updated ${stamp}`;
}

/* ================================
   LOAD HEATMAP
================================ */

async function loadHeatmap() {
  const container = document.getElementById("geoHeatmapList");
  const geoUpdated = document.getElementById("geoUpdated");
  if (!container) return;

  try {
    const data = await fetchSnapshot(
      `./data/live-sources-all-${selectedDate}.json`
    );

    const items = data.data || [];
    setFreshness(data.generatedAt);
    container.innerHTML = "";

    // Build region → articles map using forgiving matching
    const regionMap = {};
    for (const region of Object.keys(regionRules)) regionMap[region] = [];

    const seenByRegion = {};
    for (const region of Object.keys(regionRules)) seenByRegion[region] = new Set();

    items.forEach((item) => {
      const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
      for (const [region, keywords] of Object.entries(regionRules)) {
        if (keywords.some((kw) => text.includes(kw))) {
          if (!seenByRegion[region].has(item.link)) {
            seenByRegion[region].add(item.link);
            regionMap[region].push(item);
          }
        }
      }
    });

    const regionCounts = Object.entries(regionMap)
      .map(([region, matched]) => {
        matched.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        return {
          region,
          count: matched.length,
          level: calculateHeatLevel(matched.length),
          links: matched.slice(0, 3),
        };
      })
      .filter((entry) => entry.count > 0);

    regionCounts.forEach((entry) => {
      const row = document.createElement("article");
      row.className = `geo-heatmap-item ${entry.level}`;

      const articleLinks = entry.links.length
        ? entry.links.map((a) => `<li><a href="${a.link}" target="_blank" rel="noopener noreferrer">${a.title}</a></li>`).join("")
        : "<li>No matched articles in the latest scan.</li>";

      row.innerHTML = `
        <div>
          <p class="geo-region">${entry.region}</p>
          <p class="geo-count">${entry.count} relevant articles</p>
          <ul class="geo-article-links">${articleLinks}</ul>
          <p class="geo-more-link"><a href="${regionSearchLinks[entry.region]}" target="_blank" rel="noopener noreferrer">Open full ${entry.region} news search</a></p>
        </div>
        <span class="geo-level ${entry.level}">${entry.level}</span>
      `;
      container.appendChild(row);
    });

    if (geoUpdated) {
      geoUpdated.textContent = `Live article scan updated ${new Date(data.generatedAt).toLocaleTimeString()}`;
    }
  } catch {
    if (geoUpdated) geoUpdated.textContent = "Unable to load regional heatmap.";
    if (container) container.innerHTML = '<p class="signals-empty">Heatmap snapshot missing for this date.</p>';
  }
}

/* ================================
   LOAD AI SAFETY PULSE
================================ */

async function loadAIWatch() {
  const updated = document.getElementById("aiWatchUpdated");
  const list = document.getElementById("aiWatchList");
  if (!updated || !list) return;

  function renderCards(cards) {
    list.innerHTML = cards
      .map((card) => {
        const sourceMarkup = card.sourceLink
          ? `<a href="${card.sourceLink}" target="_blank" rel="noopener noreferrer">${card.sourceTitle}</a>`
          : card.sourceTitle;
        return `
          <article class="ai-watch-item">
            <p class="ai-watch-title">${card.title}</p>
            <p class="ai-watch-meta">Date: ${card.dateLabel} • Category: ${card.category}</p>
            <p class="ai-watch-summary">${card.summary}</p>
            <p class="ai-watch-source">Source: ${sourceMarkup}</p>
          </article>
        `;
      })
      .join("");
  }

  function placeholderCards() {
    const dateLabel = selectedDate;
    return [
      { title: "📰 New Tool Launch", category: "New AI Moderation Tools" },
      { title: "💰 Startup Funding", category: "Trust & Safety Startups" },
      { title: "📄 Research Paper Release", category: "Adversarial & Red-Team Research" },
      { title: "🤖 New Agent Deployment", category: "New AI Agents" },
      { title: "📊 Transparency Report", category: "Platform Transparency Reports" },
    ].map((t) => ({
      ...t,
      dateLabel,
      summary: "Feed is temporarily unavailable. Check back shortly.",
      sourceTitle: "No direct source available",
      sourceLink: null,
    }));
  }

  try {
    const data = await fetchSnapshot(
      `./data/ai-safety-pulse-${selectedDate}.json`
    );

    const cards = data.data || [];
    setFreshness(data.generatedAt);
    renderCards(cards.length > 0 ? cards : placeholderCards());
    updated.textContent = `AI safety pulse updated ${new Date(data.generatedAt).toLocaleString()}`;
  } catch {
    renderCards(placeholderCards());
    updated.textContent = "AI safety pulse snapshot missing for this date.";
  }
}

/* ================================
   LOAD STREAM
================================ */

async function loadStream() {
  const list = document.getElementById("misinfoNewsList");
  const title = document.getElementById("streamPanelTitle");
  if (!list) return;

  // Clear old state
  list.innerHTML = "";
  streamItems = [];
  filteredStreamItems = [];
  streamCurrentPage = 1;

  const formattedDate = new Date(selectedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (title) title.textContent = `Articles from ${formattedDate}`;

  list.innerHTML = `
    <div class="stream-loading">
      <span class="loading-spinner"></span>
      <p>Fetching articles from ${selectedDate}...</p>
    </div>
  `;

  try {
    const data = await fetchSnapshot(
      `./data/live-sources-${selectedDate}.json`
    );

    setFreshness(data.generatedAt);
    safeSetText("dataModeStatus", "Data Mode: Snapshot Data");

    // Dedupe by link
    const seen = new Set();
    const unique = (data.data || []).filter((a) => {
      if (!a.link || seen.has(a.link)) return false;
      seen.add(a.link);
      return true;
    });

    unique.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    streamItems = unique;
    refreshStreamFilterOptions();
    renderStreamPage();
  } catch {
    list.innerHTML = `
      <div class="stream-error-message">
        <p><strong>⚠ Unable to fetch articles</strong></p>
        <p>Could not load articles for ${selectedDate}.</p>
        <p style="font-size:0.9em;margin-top:8px;color:#999;">Try selecting a different date.</p>
      </div>
    `;
  }
}

/* ================================
   STREAM FILTERS & PAGINATION
================================ */

function refreshStreamFilterOptions() {
  const catSelect = document.getElementById("streamCategoryFilter");
  const regSelect = document.getElementById("streamRegionFilter");
  if (!catSelect || !regSelect) return;

  const categories = [...new Set(streamItems.map(getStreamCategory))].sort();
  const regions = [...new Set(streamItems.map(getStreamRegion))].sort();

  const buildOpts = (select, values, selected) => {
    select.innerHTML =
      '<option value="all">All</option>' +
      values.map((v) => `<option value="${v}">${v}</option>`).join("");
    select.value = values.includes(selected) ? selected : "all";
  };

  buildOpts(catSelect, categories, selectedStreamCategory);
  buildOpts(regSelect, regions, selectedStreamRegion);
  selectedStreamCategory = catSelect.value;
  selectedStreamRegion = regSelect.value;
}

function applyStreamFilters() {
  filteredStreamItems = streamItems.filter((item) => {
    const cat = getStreamCategory(item);
    const reg = getStreamRegion(item);
    return (selectedStreamCategory === "all" || cat === selectedStreamCategory) &&
           (selectedStreamRegion === "all" || reg === selectedStreamRegion);
  });
}

function renderStreamPage() {
  const list = document.getElementById("misinfoNewsList");
  const prevBtn = document.getElementById("streamPrevBtn");
  const nextBtn = document.getElementById("streamNextBtn");
  const pageInfo = document.getElementById("streamPageInfo");
  if (!list || !prevBtn || !nextBtn || !pageInfo) return;

  applyStreamFilters();

  const totalPages = Math.max(1, Math.ceil(filteredStreamItems.length / streamPageSize));
  streamCurrentPage = Math.min(Math.max(streamCurrentPage, 1), totalPages);
  const start = (streamCurrentPage - 1) * streamPageSize;
  const page = filteredStreamItems.slice(start, start + streamPageSize);

  list.innerHTML = "";

  if (!page.length) {
    list.innerHTML = '<p class="signals-empty">No live trending articles right now.</p>';
  } else {
    page.forEach((item) => {
      const risk = getRiskMeta(item);
      const conf = getConfidenceMeta(item);
      const fcQuery = encodeURIComponent(item.title || "misinformation fact check");
      const fcUrl = `https://toolbox.google.com/factcheck/explorer/search/${fcQuery}`;

      const row = document.createElement("article");
      row.className = "live-source-item";
      row.innerHTML = `
        <p class="live-source-title"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></p>
        <p class="live-source-meta">${item.source} • ${new Date(item.publishedAt).toLocaleString()}</p>
        <div class="live-source-badges">
          <span class="risk-badge ${risk.className}">${risk.label}</span>
          <span class="confidence-badge ${conf.className}">${conf.label}</span>
          <a class="fact-check-link" href="${fcUrl}" target="_blank" rel="noopener noreferrer">Fact-check</a>
        </div>
      `;
      list.appendChild(row);
    });
  }

  pageInfo.textContent = `Page ${streamCurrentPage} of ${totalPages}`;
  prevBtn.disabled = streamCurrentPage <= 1;
  nextBtn.disabled = streamCurrentPage >= totalPages;
}

/* ================================
   DATE SELECTOR
================================ */

function initDateSelector() {
  const picker = document.getElementById("dateSelector");
  if (!picker) return;

  picker.min = "2025-11-14";
  picker.max = selectedDate;
  picker.value = selectedDate;

  picker.addEventListener("change", (e) => {
    const val = e.target.value;
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      picker.value = selectedDate;
      return;
    }
    selectedDate = val;
    loadAll();
  });
}

/* ================================
   INIT
================================ */

function initThemeBar() {
  const bar = document.getElementById("themeFilterBar");
  if (!bar) return;

  const buttons = Array.from(bar.querySelectorAll(".theme-filter-btn"));
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme || "all";
      if (theme === selectedTheme) return;
      selectedTheme = theme;
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadSignals();
    });
  });
}

function initStreamPagination() {
  const prev = document.getElementById("streamPrevBtn");
  const next = document.getElementById("streamNextBtn");
  const catFilter = document.getElementById("streamCategoryFilter");
  const regFilter = document.getElementById("streamRegionFilter");

  if (prev) prev.addEventListener("click", () => { if (streamCurrentPage > 1) { streamCurrentPage--; renderStreamPage(); } });
  if (next) next.addEventListener("click", () => {
    const total = Math.max(1, Math.ceil(filteredStreamItems.length / streamPageSize));
    if (streamCurrentPage < total) { streamCurrentPage++; renderStreamPage(); }
  });
  if (catFilter) catFilter.addEventListener("change", () => { selectedStreamCategory = catFilter.value; streamCurrentPage = 1; renderStreamPage(); });
  if (regFilter) regFilter.addEventListener("change", () => { selectedStreamRegion = regFilter.value; streamCurrentPage = 1; renderStreamPage(); });
}

function loadAll() {
  loadStream();
  loadHeatmap();
  loadSignals();
  loadAIWatch();
}

function initApp() {
  initDateSelector();
  initThemeBar();
  initStreamPagination();
  loadAll();
}

initApp();
