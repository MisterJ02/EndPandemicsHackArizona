async function loadCDCData() {
  const panel = document.getElementById('cdc-panel');
  if (!panel) return;

  try {
    const rssUrl = encodeURIComponent(
      'https://tools.cdc.gov/api/v2/resources/media/132608.rss'
    );

    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`
    );

    const data = await res.json();

    const items = (data.items || [])
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    window.cdcData = items;

    if (!items.length) {
      panel.innerHTML = '<div style="color:var(--muted);font-size:13px;">No CDC news found.</div>';
      return;
    }

    panel.innerHTML = items.slice(0, 5).map(item => {
      const title = item.title || 'Untitled CDC update';
      const date = item.pubDate
        ? new Date(item.pubDate).toLocaleDateString()
        : 'Date unavailable';

      const summary = stripHtml(item.description || 'No summary available.');
      const link = item.link || 'https://www.cdc.gov/media/';

      return `
        <details class="cdc-item">
          <summary>
            <span class="cdc-title">${escapeHtml(title)}</span>
            <span class="cdc-date">${escapeHtml(date)}</span>
          </summary>

          <div class="cdc-report">
            <p>${escapeHtml(summary)}</p>
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
              Read full CDC update →
            </a>
          </div>
        </details>
      `;
    }).join('');

  } catch (err) {
    panel.innerHTML = '<div style="color:#ef4444;font-size:13px;">Failed to load CDC news.</div>';
    console.error(err);
  }
}