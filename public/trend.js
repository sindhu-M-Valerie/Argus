async function loadTrendDetail() {
  if (window.location.hash !== '#📡') {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#📡`);
  }

  const title = document.getElementById('detailTitle');
  const meta = document.getElementById('detailMeta');
  const highlights = document.getElementById('detailHighlights');
  const banner = document.getElementById('backendBanner');

  const apiBase = (window.ARGUS_API_BASE || '').replace(/\/$/, '');
  if (banner) {
    banner.hidden = true;
  }

  const parts = window.location.pathname.split('/').filter(Boolean);
  const signalId = parts[1];
  const slug = parts[2];

  if (!signalId || !slug) {
    title.textContent = 'Trend detail not found';
    meta.textContent = 'Missing trend identifier in URL.';
    return;
  }

  try {
    const response = await fetch(`${apiBase}/api/trend/${signalId}/${slug}`);

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const detail = await response.json();

    title.textContent = detail.title;
    meta.textContent = `Signal #${detail.signalId} • ${detail.sourceType} • Updated ${new Date(detail.updatedAt).toLocaleString()}`;

    highlights.innerHTML = '';
    detail.highlights.forEach((point) => {
      const item = document.createElement('li');
      item.textContent = point;
      highlights.appendChild(item);
    });
  } catch (error) {
    title.textContent = 'Trend detail unavailable';
    meta.textContent = 'This trend report could not be loaded right now.';
    highlights.innerHTML = '';
  }
}

loadTrendDetail();
