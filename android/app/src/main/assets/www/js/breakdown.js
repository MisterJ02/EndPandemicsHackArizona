function updateBreakdown() {
  const el = document.getElementById('breakdown-panel');

  if (!reports.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:18px 0;">No reports yet. Add reports to see breakdown.</div>';
    return;
  }

  const stats = {};
  for (const d of DISEASES) stats[d] = { count: 0, totalDist: 0, contrib: 0 };

  for (const r of reports) {
    const dist = haversineMi(userLat, userLng, r.lat, r.lng);
    stats[r.disease].count++;
    stats[r.disease].totalDist += dist;
    if (dist <= RISK_RADIUS_MI) {
      stats[r.disease].contrib += SEV_WEIGHT[r.severity] * Math.exp(-dist / DECAY_MI);
    }
  }

  const active = DISEASES
    .filter(d => stats[d].count > 0)
    .sort((a, b) => stats[b].contrib - stats[a].contrib);

  const maxC = Math.max(...active.map(d => stats[d].contrib), 0.0001);

  el.innerHTML = active.map(d => {
    const s    = stats[d];
    const avgD = (s.totalDist / s.count).toFixed(1);
    const barW = Math.round((s.contrib / maxC) * 100);
    const pct  = Math.round((s.contrib / maxC) * 100);
    const col  = D_COLOR[d];
    return `
      <div class="d-item">
        <div class="d-row">
          <div class="d-name">
            <div class="d-dot" style="background:${col}"></div>
            ${d}
          </div>
          <div class="d-meta">${s.count} case${s.count !== 1 ? 's' : ''} &bull; ${avgD} mi avg</div>
        </div>
        <div class="d-bar-bg">
          <div class="d-bar" style="width:${barW}%;background:${col}"></div>
        </div>
        <div class="d-contrib">Risk contribution: ${pct}%</div>
      </div>`;
  }).join('');
}
