/* =====================================
   ARGUS — FINAL STABLE SINGLE SNAPSHOT
   ===================================== */

let selectedTheme = "all";
let selectedDate = getTodayIST();

let allItems = [];
let streamItems = [];
let filteredStreamItems = [];
let streamCurrentPage = 1;
const streamPageSize = 5;

let selectedStreamCategory = "all";
let selectedStreamRegion = "all";
let selectedStreamSort = "risk";
let streamSearchQuery = "";
let trustedOnly = false;
let lastGeneratedAt = null;
let activeLoadController = null;
let loadSequence = 0;
let refreshTimer = null;
let dataStatusMessage = "";
const liveRefreshIntervalMs = 5 * 60 * 1000;

/* ================================
   UTILITIES
================================ */

function getTodayIST() {
  return getISTDateString(new Date());
}

function getISTDateString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function filterSnapshotToSelectedDate(payload) {
  if (!payload || !Array.isArray(payload.data) || !selectedDate) return payload;

  return {
    ...payload,
    data: payload.data.filter((item) => getISTDateString(item.publishedAt) === selectedDate)
  };
}

async function fetchLiveData(signal) {
  const params = new URLSearchParams({ limit: "60" });

  if (selectedDate) {
    params.set("from", selectedDate);
    params.set("to", selectedDate);
  }

  if (selectedTheme && selectedTheme !== "all") {
    params.set("theme", selectedTheme);
  }

  const apiBase = String(window.ARGUS_API_BASE || "").replace(/\/$/, "");
  const url = `${apiBase}/api/live-sources?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) throw new Error(`Live data request failed: ${res.status}`);
    return await res.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;

    const themeSlug = selectedTheme && selectedTheme !== "all"
      ? `theme-${encodeURIComponent(selectedTheme)}`
      : "";
    const themeSnapshot = `./data/live-sources-${themeSlug ? `${themeSlug}-` : ""}${selectedDate}.json`;
    const fallbackUrls = themeSlug
      ? [themeSnapshot, `./data/live-sources-${selectedDate}.json`]
      : [themeSnapshot];

    for (const fallbackUrl of fallbackUrls) {
      const fallbackRes = await fetch(fallbackUrl, { cache: "no-store", signal });
      if (fallbackRes.ok) return filterSnapshotToSelectedDate(await fallbackRes.json());
    }

    // No snapshot for this date: say so plainly instead of showing an error
    // or borrowing articles from another day.
    return {
      generatedAt: null,
      snapshot: true,
      sourceStatus: [],
      message: selectedDate === getTodayIST()
        ? `Today's snapshot hasn't been collected yet. Argus refreshes every 6 hours.`
        : `No archive exists for ${selectedDate}. Argus only keeps days it actually collected.`,
      data: []
    };
  }
}

// Feed titles and links come from third parties; never inject them as raw HTML.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "#";
  } catch {
    return "#";
  }
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getDataViewTimestamp() {
  if (selectedDate !== getTodayIST()) {
    const archiveDate = new Date(`${selectedDate}T12:00:00`);
    return `Archive date: ${archiveDate.toLocaleDateString()}`;
  }

  return `Checked: ${new Date().toLocaleString()}`;
}

function setFreshness(generatedAt, mode = "Live Feed") {
  if (!generatedAt) {
    safeSetText("dataFreshness", "No data collected for this date");
    safeSetText("topDataFreshness", "No data collected for this date");
    safeSetText("dataModeStatus", `Data Mode: ${mode}`);
    return;
  }
  lastGeneratedAt = generatedAt;
  const stamp = new Date(generatedAt).toLocaleString();
  const isArchive = mode === "Historical Archive";
  const freshnessLabel = isArchive ? getDataViewTimestamp() : `Last Checked: ${stamp}`;
  safeSetText("dataFreshness", freshnessLabel);
  safeSetText("topDataFreshness", freshnessLabel);
  safeSetText("dataModeStatus", `Data Mode: ${mode}`);

  const editionStamp = document.getElementById("editionStamp");
  if (editionStamp) {
    const editionDate = isArchive ? new Date(`${selectedDate}T12:00:00`) : new Date(generatedAt);
    const stampText = isArchive
      ? "Historical Archive"
      : mode === "Live Feed"
        ? "Live Feed; checks every 5 minutes"
        : mode === "Snapshot"
          ? "Snapshot; collected every 6 hours"
          : mode;
    editionStamp.textContent = `Edition Stamp: ${editionDate.toLocaleDateString()} • ${stampText}`;
  }
}

function scheduleLiveRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);

  if (selectedDate !== getTodayIST()) return;

  refreshTimer = setTimeout(async () => {
    await loadAll();
    scheduleLiveRefresh();
  }, liveRefreshIntervalMs);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((a) => {
    if (!a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

function getSourceLabel(item) {
  return item.source;
}

function getProvenanceMeta(item) {
  const provenance = (item && item.provenance) ? String(item.provenance).toLowerCase() : 'unverified';

  const map = {
    'live-feed': { label: 'Live feed', tone: 'live' },
    'live-gdelt': { label: 'Live GDELT', tone: 'live' },
    'historical-archive': { label: 'Historical archive', tone: 'historical' },
    'historical-gdelt': { label: 'Historical archive', tone: 'historical' },
    'historical-record': { label: 'Historical archive', tone: 'historical' },
    fallback: { label: 'Unverified', tone: 'unverified' },
    unverified: { label: 'Unverified', tone: 'unverified' }
  };

  return map[provenance] || { label: 'Unverified', tone: 'unverified' };
}

/* ================================
   THEME MAP
================================ */

const themeDisplayNames = {
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
   LOAD EVERYTHING
================================ */

function renderLoadingState() {
  const loadingMarkup = '<div class="stream-loading"><span class="loading-spinner" aria-hidden="true"></span><p>Loading verified reports...</p></div>';
  const stream = document.getElementById("misinfoNewsList");
  const signals = document.getElementById("signalsList");
  const heatmap = document.getElementById("geoHeatmapList");
  const aiWatch = document.getElementById("aiWatchList");
  const sourceHealth = document.getElementById("sourceHealthSummary");

  if (stream) stream.innerHTML = loadingMarkup;
  if (signals) signals.innerHTML = loadingMarkup;
  if (heatmap) heatmap.innerHTML = loadingMarkup;
  if (aiWatch) aiWatch.innerHTML = '<div class="stream-loading"><span class="loading-spinner" aria-hidden="true"></span><p>Loading AI safety pulse...</p></div>';
  if (sourceHealth) sourceHealth.innerHTML = '<div class="source-health-pill online"><span>Online</span><strong>—</strong></div><div class="source-health-pill offline"><span>Offline</span><strong>—</strong></div>';
  safeSetText("streamPanelTitle", "Live Stream (loading)");
  safeSetText("dataModeStatus", "Data Mode: Loading current edition");
}

function renderSourceHealth(data = []) {
  const container = document.getElementById("sourceHealthSummary");
  if (!container) return;

  const stats = Array.isArray(data) ? data : [];
  const online = stats.filter((item) => item && item.status === "online").length;
  const offline = stats.filter((item) => item && item.status !== "online").length;

  container.innerHTML = `
    <div class="source-health-pill online"><span>Online</span><strong>${online}</strong></div>
    <div class="source-health-pill offline"><span>Offline</span><strong>${offline}</strong></div>
  `;
}

async function loadAll() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (activeLoadController) activeLoadController.abort();

  const controller = new AbortController();
  const requestSequence = ++loadSequence;
  activeLoadController = controller;
  renderLoadingState();

  try {
    const data = await fetchLiveData(controller.signal);
    if (requestSequence !== loadSequence) return;
    dataStatusMessage = data.message || "";
    const mode = selectedDate !== getTodayIST()
      ? "Historical Archive"
      : data && data.snapshot
        ? "Snapshot"
        : data && data.sourceStatus && data.sourceStatus.some((source) => source.status === "online" && source.itemCount > 0)
          ? "Live Feed"
          : "Live Feed Unavailable";
    setFreshness(data.generatedAt, mode);
    renderSourceHealth(data.sourceStatus || []);

    allItems = dedupe(data.data || []);
    allItems.sort((a, b) => {
      const scoreDelta = (b.riskScore || 0) - (a.riskScore || 0);
      return scoreDelta !== 0 ? scoreDelta : new Date(b.publishedAt) - new Date(a.publishedAt);
    });
    streamItems = allItems;

    renderStream();
    renderSignals();
    renderHeatmap();
    renderMiniTrend();
    scheduleLiveRefresh();

  } catch (err) {
    if (err.name === "AbortError" || requestSequence !== loadSequence) return;
    console.error(err.message);

    const list = document.getElementById("misinfoNewsList");
    if (list) {
      list.innerHTML = `
        <div class="stream-error-message">
          <p><strong>⚠ Live Feed Unavailable</strong></p>
          <p>The server could not fetch fresh data for ${selectedDate}.</p>
        </div>
      `;
    }

    safeSetText("signalsList", "");
    safeSetText("geoHeatmapList", "");
  }
}

/* ================================
   STREAM
================================ */

function filterStreamItems(items) {
  const query = streamSearchQuery.trim().toLowerCase();
  let filtered = [...items];

  if (query) {
    filtered = filtered.filter((item) => {
      const haystack = `${item.title || ''} ${item.snippet || ''} ${item.source || ''} ${item.theme || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  if (trustedOnly) {
    filtered = filtered.filter((item) => {
      const provenance = String(item.provenance || '').toLowerCase();
      return ['live-feed', 'live-gdelt', 'historical-archive', 'historical-gdelt', 'historical-record'].includes(provenance);
    });
  }

  return filtered;
}

function sortStreamItems(items) {
  const normalized = [...items];

  return normalized.sort((a, b) => {
    if (selectedStreamSort === 'recent') {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    }

    const riskDelta = (b.riskScore || 0) - (a.riskScore || 0);
    if (riskDelta !== 0) return riskDelta;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });
}

function renderStream() {
  refreshStreamFilterOptions();
  renderStreamPage();
}

function refreshStreamFilterOptions() {
  const catSelect = document.getElementById("streamCategoryFilter");
  const regSelect = document.getElementById("streamRegionFilter");
  if (!catSelect || !regSelect) return;

  const categories = [...new Set(streamItems.map(i => i.theme))].sort();
  const regions = [...new Set(streamItems.map(getRegion))].sort();

  catSelect.innerHTML =
    '<option value="all">All</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join("");

  regSelect.innerHTML =
    '<option value="all">All</option>' +
    regions.map(r => `<option value="${r}">${r}</option>`).join("");
}

function applyStreamFilters() {
  filteredStreamItems = sortStreamItems(
    filterStreamItems(
      streamItems.filter((item) => {
        const matchesTheme =
          selectedStreamCategory === "all" ||
          normalize(item.theme) === normalize(selectedStreamCategory);

        const matchesRegion =
          selectedStreamRegion === "all" ||
          getRegion(item) === selectedStreamRegion;

        return matchesTheme && matchesRegion;
      })
    )
  );
}

function renderStreamPage() {
  const list = document.getElementById("misinfoNewsList");
  if (!list) return;

  applyStreamFilters();

  const totalPages = Math.max(1, Math.ceil(filteredStreamItems.length / streamPageSize));
  streamCurrentPage = Math.min(Math.max(streamCurrentPage, 1), totalPages);

  const start = (streamCurrentPage - 1) * streamPageSize;
  const page = filteredStreamItems.slice(start, start + streamPageSize);

  safeSetText("streamPageInfo", `Page ${streamCurrentPage} of ${totalPages}`);
  safeSetText("streamPanelTitle", `Live Stream (${filteredStreamItems.length} articles)`);

  list.innerHTML = "";

  if (!page.length) {
    const emptyMessage = streamSearchQuery
      ? `No verified news matched "${streamSearchQuery}" for ${selectedDate}.`
      : trustedOnly
        ? `No trusted verified news was found for ${selectedDate}.`
        : (dataStatusMessage || `No verified news was found for ${selectedDate}.`);
    list.innerHTML = `<p class="signals-empty">${emptyMessage}</p>`;
    return;
  }

  page.forEach((item) => {
    const score = item.riskScore || 0;
    const confidence = item.confidence || 'Low';
    const provenance = getProvenanceMeta(item);
    const row = document.createElement("article");
    row.className = "live-source-item";
    row.innerHTML = `
      <p>
        <span class="signal-badge signal-${provenance.tone}">${provenance.label}</span>
        <span class="signal-badge signal-${confidence.toLowerCase()}">${confidence}</span>
        <a href="${safeUrl(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </p>
      <p>${getSourceLabel(item)} • ${new Date(item.publishedAt).toLocaleString()} • Risk ${score}/100 • ${item.corroboratedBy || 1} source${(item.corroboratedBy || 1) === 1 ? '' : 's'}</p>
    `;
    list.appendChild(row);
  });
}

/* ================================
   SIGNALS (BULLETPROOF STRICT MATCH)
================================ */

function renderSignalSummary() {
  const container = document.getElementById("signalSummary");
  if (!container) return;

  const relevant = allItems.filter((item) => {
    if (selectedTheme === 'all') return true;
    return normalize(item.theme) === normalize(selectedTheme);
  });

  const liveCount = relevant.filter((item) => item.provenance === 'live-feed' || item.provenance === 'live-gdelt').length;
  const historicalCount = relevant.filter((item) => item.provenance === 'historical-archive' || item.provenance === 'historical-gdelt' || item.provenance === 'historical-record').length;
  const unverifiedCount = relevant.filter((item) => !item.provenance || item.provenance === 'unverified' || item.provenance === 'fallback').length;
  const highRiskCount = relevant.filter((item) => (item.riskScore || 0) >= 70).length;

  container.innerHTML = `
    <span class="signal-summary-chip live"><strong>${liveCount}</strong> live</span>
    <span class="signal-summary-chip historical"><strong>${historicalCount}</strong> historical</span>
    <span class="signal-summary-chip unverified"><strong>${unverifiedCount}</strong> unverified</span>
    <span class="signal-summary-chip high"><strong>${highRiskCount}</strong> high risk</span>
  `;
}

function renderSignals() {
  renderSignalSummary();
  const list = document.getElementById("signalsList");
  if (!list) return;

  const selected = normalize(selectedTheme);

  const filtered = allItems.filter((item) => {
    if (selectedTheme === "all") return true;
    const itemTheme = normalize(item.theme);
    return itemTheme && itemTheme === selected;
  });

  console.log("Selected Theme:", selectedTheme);
  console.log("Available Themes:", [...new Set(allItems.map(i => i.theme))]);

  list.innerHTML = "";

  if (!filtered.length) {
    list.innerHTML =
      `<p class="signals-empty">${dataStatusMessage || `No verified news was found for ${selectedDate} on ${selectedTheme}.`}</p>`;
    return;
  }

  filtered.slice(0, 12).forEach((item) => {
    const score = item.riskScore || 0;
    const confidence = item.confidence || 'Low';
    const provenance = getProvenanceMeta(item);
    const row = document.createElement("article");
    row.className = "signal-item";
    row.innerHTML = `
      <p>
        <span class="signal-badge signal-${provenance.tone}">${provenance.label}</span>
        <span class="signal-badge signal-${confidence.toLowerCase()}">${confidence}</span>
        <a href="${safeUrl(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </p>
      <p>${getSourceLabel(item)} • ${new Date(item.publishedAt).toLocaleString()} • Risk ${score}/100 • ${item.corroboratedBy || 1} source${(item.corroboratedBy || 1) === 1 ? '' : 's'}</p>
    `;
    list.appendChild(row);
  });
}

/* ================================
   HEATMAP
================================ */

function getRegion(item) {
  const text = normalize(item.title + " " + item.snippet);
  if (text.includes("india")) return "India";
  if (text.includes("usa") || text.includes("united states")) return "North America";
  if (text.includes("europe")) return "Europe";
  return "Global";
}

function renderHeatmap() {
  const container = document.getElementById("geoHeatmapList");
  if (!container) return;

  safeSetText("geoUpdated", getDataViewTimestamp());

  const regionGroups = {};

  allItems.forEach((item) => {
    const region = getRegion(item);
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(item);
  });

  container.innerHTML = "";

  Object.entries(regionGroups).forEach(([region, items]) => {
    const row = document.createElement("article");
    row.className = "geo-heatmap-item";

    const links = items.slice(0, 5).map(
      (i) => `<li><a href="${safeUrl(i.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i.title)}</a></li>`
    ).join("");

    const moreText = items.length > 5 ? `<li class="geo-more-link">+ ${items.length - 5} more articles</li>` : "";

    row.innerHTML = `
      <p class="geo-region">${region}</p>
      <p class="geo-count">${items.length} relevant articles</p>
      <ul class="geo-article-links">${links}${moreText}</ul>
    `;
    container.appendChild(row);
  });
}

/* ================================
   MINI TREND
================================ */

function renderMiniTrend() {
  const chart = document.getElementById("miniTrendChart");
  if (!chart) return;

  const counts = {};
  allItems.forEach((i) => {
    const theme = i.theme || "Other";
    counts[theme] = (counts[theme] || 0) + 1;
  });

  chart.innerHTML = Object.entries(counts)
    .map(([theme, count]) => `<div>${theme}: ${count}</div>`)
    .join("");

  safeSetText("miniTrendUpdated", getDataViewTimestamp());
}

/* ================================
   AI WATCH
================================ */

function renderAIWatch(items = allItems) {
  const list = document.getElementById("aiWatchList");
  if (!list) return;

  const aiItems = items.filter((i) =>
    normalize(i.title + " " + i.snippet).includes("ai")
  );

  list.innerHTML = aiItems.slice(0, 5)
    .map((i) => i.link
      ? `<p><a href="${safeUrl(i.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i.title)}</a></p>`
      : `<p>${escapeHtml(i.title)}</p>`)
    .join("");

  safeSetText("aiWatchUpdated", getDataViewTimestamp());
}

async function loadAIPulseSnapshot() {
  // The undated file is "latest"; only use it for today, never for past dates.
  const snapshotUrls = [`./data/ai-safety-pulse-${selectedDate}.json`];
  if (selectedDate === getTodayIST()) snapshotUrls.push("./data/ai-safety-pulse.json");

  for (const snapshotUrl of snapshotUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(snapshotUrl, { cache: "no-store", signal: controller.signal });
      if (!response.ok) continue;
      const payload = await response.json();
      if (!Array.isArray(payload.data)) continue;

      // Show the actual article behind each card; skip cards with no source.
      const pulseItems = payload.data
        .filter((item) => item.sourceLink)
        .map((item) => ({
          title: `${item.title}: ${item.sourceTitle}`,
          snippet: item.summary,
          link: item.sourceLink
        }));
      if (!pulseItems.length) break;
      renderAIWatch(pulseItems);
      return;
    } catch (error) {
      console.warn(`AI pulse snapshot unavailable: ${snapshotUrl}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  const list = document.getElementById("aiWatchList");
  if (list) list.innerHTML = `<p class="signals-empty">No sourced AI safety items for ${selectedDate}.</p>`;
}

/* ================================
   THEME BAR
================================ */

function initThemeBar() {
  const bar = document.getElementById("themeFilterBar");
  if (!bar) return;
  const buttons = bar.querySelectorAll(".theme-filter-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      selectedTheme = btn.dataset.theme;
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await loadAll();
    });
  });
}

/* ================================
   INIT
================================ */

function initDateSelector() {
  const dateEl = document.getElementById("dateSelector");
  if (!dateEl) return;
  dateEl.value = selectedDate;
  dateEl.addEventListener("change", () => {
    selectedDate = dateEl.value;
    streamCurrentPage = 1;
    Promise.all([loadAll(), loadAIPulseSnapshot()]);
  });
}

function initRefreshButton() {
  const refreshButton = document.getElementById("refreshDataBtn");
  if (!refreshButton) return;

  refreshButton.addEventListener("click", () => {
    loadAll();
  });
}

function initPagination() {
  const prev = document.getElementById("streamPrevBtn");
  const next = document.getElementById("streamNextBtn");
  if (prev) prev.addEventListener("click", () => { streamCurrentPage--; renderStreamPage(); });
  if (next) next.addEventListener("click", () => { streamCurrentPage++; renderStreamPage(); });

  const catSelect = document.getElementById("streamCategoryFilter");
  const regSelect = document.getElementById("streamRegionFilter");
  const sortSelect = document.getElementById("streamSortFilter");
  const searchInput = document.getElementById("streamSearchInput");
  const trustedToggle = document.getElementById("trustedOnlyToggle");

  if (catSelect) catSelect.addEventListener("change", () => { selectedStreamCategory = catSelect.value; streamCurrentPage = 1; renderStreamPage(); });
  if (regSelect) regSelect.addEventListener("change", () => { selectedStreamRegion = regSelect.value; streamCurrentPage = 1; renderStreamPage(); });
  if (sortSelect) sortSelect.addEventListener("change", () => { selectedStreamSort = sortSelect.value; streamCurrentPage = 1; renderStreamPage(); });
  if (searchInput) searchInput.addEventListener("input", () => { streamSearchQuery = searchInput.value; streamCurrentPage = 1; renderStreamPage(); });
  if (trustedToggle) trustedToggle.addEventListener("change", () => { trustedOnly = trustedToggle.checked; streamCurrentPage = 1; renderStreamPage(); });
}

function initApp() {
  initThemeBar();
  initDateSelector();
  initRefreshButton();
  initPagination();
  loadAIPulseSnapshot();
  loadAll();
}

initApp();
