// Trend page. Reads ./data/signals.json, which the snapshot job computes from
// archived daily snapshots: real collected articles only, no estimated figures.
//   trend.html             -> all themes, 7-day overview
//   trend.html?theme=slug  -> one theme: daily counts + the articles behind them

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

function trendText(signal) {
  if (signal.changePercent === null || signal.changePercent === undefined) return signal.trend;
  const sign = signal.changePercent > 0 ? "+" : "";
  return `${signal.trend} (${sign}${signal.changePercent}%)`;
}

function dayLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function renderOverview(payload, body) {
  const rows = payload.data.map((s) => `
    <tr>
      <td><a href="?theme=${encodeURIComponent(s.theme)}">${escapeHtml(s.label)}</a></td>
      <td class="num">${s.totalArticles}</td>
      <td class="num">${s.distinctSources}</td>
      <td class="num">${s.highRiskArticles}</td>
      <td>${escapeHtml(trendText(s))}</td>
    </tr>`).join("");

  body.innerHTML = `
    <div class="trend-scroll">
      <table class="trend-table">
        <thead><tr><th>Theme</th><th>Articles</th><th>Sources</th><th>High risk</th><th>Direction</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderTheme(signal, body) {
  const max = Math.max(1, ...signal.daily.map((d) => d.count || 0));
  const bars = signal.daily.map((d) => d.count === null
    ? `<div class="day-bar missing" title="Not collected"><span class="bar"></span><span>${dayLabel(d.date)}</span><span>n/a</span></div>`
    : `<div class="day-bar" title="${d.count} articles"><span class="bar" style="height:${Math.round((d.count / max) * 80)}%"></span><span>${dayLabel(d.date)}</span><span>${d.count}</span></div>`
  ).join("");

  const articles = signal.topArticles.length
    ? `<ul class="detail-list">${signal.topArticles.map((a) => `
        <li>
          <a href="${safeUrl(a.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a><br />
          <small>${escapeHtml(a.source)} &bull; ${new Date(a.publishedAt).toLocaleString()} &bull; Risk ${a.riskScore ?? "?"}/100 &bull; ${a.corroboratedBy || 1} source${(a.corroboratedBy || 1) === 1 ? "" : "s"}</small>
        </li>`).join("")}</ul>`
    : `<p class="signals-empty">No articles were collected for this theme in the window.</p>`;

  body.innerHTML = `
    <p class="trend-stats">${signal.totalArticles} articles from ${signal.distinctSources} source${signal.distinctSources === 1 ? "" : "s"}; ${signal.highRiskArticles} scored high risk.</p>
    <div class="day-bars" role="img" aria-label="Articles per day">${bars}</div>
    <h3>Articles behind this trend</h3>
    ${articles}
    <p><a href="trend.html">All themes</a></p>`;
}

async function loadTrendDetail() {
  const title = document.getElementById("detailTitle");
  const meta = document.getElementById("detailMeta");
  const method = document.getElementById("detailMethod");
  const bodyTitle = document.getElementById("detailBodyTitle");
  const body = document.getElementById("detailBody");
  const theme = new URLSearchParams(window.location.search).get("theme");

  try {
    const response = await fetch("./data/signals.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();

    if (!payload.endDate) {
      title.textContent = "No trend data yet";
      meta.textContent = "Trends appear once daily snapshots have been collected.";
      return;
    }

    meta.textContent = `Window: ${payload.windowDays} days ending ${payload.endDate} (IST) • ${payload.collectedDays} of ${payload.windowDays} days collected • Computed ${new Date(payload.generatedAt).toLocaleString()}`;
    method.textContent = "Counts are real articles Argus collected and classified. Direction compares the last 3 days with the days before; it is only shown with at least 4 collected days and 5 articles.";

    if (theme) {
      const signal = payload.data.find((s) => s.theme === theme);
      if (!signal) {
        title.textContent = "Unknown theme";
        body.innerHTML = '<p><a href="trend.html">All themes</a></p>';
        return;
      }
      title.textContent = `${signal.label}: ${trendText(signal)}`;
      bodyTitle.textContent = "Daily article count";
      if (signal.reason) method.textContent = `${signal.reason} ${method.textContent}`;
      renderTheme(signal, body);
    } else {
      title.textContent = "7-Day Theme Activity";
      bodyTitle.textContent = "All themes";
      renderOverview(payload, body);
    }
  } catch (error) {
    title.textContent = "Trend data unavailable";
    meta.textContent = "The trend file could not be loaded right now.";
    body.innerHTML = "";
  }
}

loadTrendDetail();
