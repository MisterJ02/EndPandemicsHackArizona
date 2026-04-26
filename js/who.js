async function loadWHOData() {
  const panel = document.getElementById('who-panel');
  if (!panel) return;

  try {
    const res = await fetch('https://www.who.int/api/emergencies/diseaseoutbreaknews');
    const data = await res.json();
    const items = data.value || data.Items || [];
    window.whoData = items;

    if (!items.length) {
      panel.innerHTML = '<div style="color:var(--muted);font-size:13px;">No WHO reports found.</div>';
      return;
    }

    panel.innerHTML = items.slice(0, 6).map(item => {
      const title = item.Title || item.title || 'Untitled report';

      const rawDate =
        item.PublicationDate ||
        item.DatePublished ||
        item.LastModified ||
        item.Date ||
        '';

      const date = rawDate
        ? new Date(rawDate).toLocaleDateString()
        : 'Date unavailable';

      const summary =
        stripHtml(
          item.Summary ||
          item.Excerpt ||
          item.Overview ||
          item.Description ||
          'No summary available.'
        );

        

      const link =
        item.Url ||
        item.Link ||
        item.AbsoluteUrl ||
        `https://www.who.int/emergencies/disease-outbreak-news`;

      return `
        <details class="who-item">
          <summary>
            <span class="who-title">${escapeHtml(title)}</span>
            <span class="who-date">${escapeHtml(date)}</span>
          </summary>

          <div class="who-report">
            <p>${escapeHtml(summary)}</p>
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
              Read full WHO report →
            </a>
          </div>
        </details>
      `;
    }).join('');

  } catch (err) {
    panel.innerHTML = '<div style="color:#ef4444;font-size:13px;">Failed to load WHO data.</div>';
    console.error(err);
  }
}

function stripHtml(value) {
  const div = document.createElement('div');
  div.innerHTML = value || '';
  return div.textContent || div.innerText || '';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}