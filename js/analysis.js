// ── Data summariser ───────────────────────────────────────────────────────────
// Returns a plain-object snapshot of current conditions used by both the
// rule-based fallback and the Gemma prompt builder.
function _buildContext() {
  const nearby   = reports.filter(r => haversineMi(userLat, userLng, r.lat, r.lng) <= NEARBY_RADIUS_MI);
  const allClose = reports.filter(r => haversineMi(userLat, userLng, r.lat, r.lng) <= RISK_RADIUS_MI);

  const dCount = {};
  const sCount = { low: 0, medium: 0, high: 0 };
  for (const r of nearby) {
    dCount[r.disease] = (dCount[r.disease] || 0) + 1;
    sCount[r.severity]++;
  }

  const sorted = Object.entries(dCount).sort((a, b) => b[1] - a[1]);
  const avgDist = nearby.length
    ? nearby.reduce((s, r) => s + haversineMi(userLat, userLng, r.lat, r.lng), 0) / nearby.length
    : null;

  let closest = null;
  if (!nearby.length && reports.length) {
    closest = [...reports].sort((a, b) =>
      haversineMi(userLat, userLng, a.lat, a.lng) - haversineMi(userLat, userLng, b.lat, b.lng)
    )[0];
  }
  const cdcAlerts = window.cdcData || [];
  const relevantCDC = getRelevantCDCAlerts(cdcAlerts);
  const whoAlerts = window.whoData || [];

  return { nearby, allClose, dCount, sCount, sorted, avgDist, closest, whoAlerts, cdcAlerts, relevantCDC };
}

function getRelevantCDCAlerts(cdcAlerts) {
  const keywords = [
    'arizona',
    'southwest',
    'united states',
    'u.s.',
    'us',
    'cdc',
    'measles',
    'flu',
    'influenza',
    'covid',
    'tick',
    'mosquito',
    'west nile',
    'salmonella',
    'e. coli',
    'outbreak'
  ];

  return cdcAlerts.filter(item => {
    const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    return keywords.some(word => text.includes(word));
  });
}

// ── Rule-based fallback ───────────────────────────────────────────────────────
function _fallbackText(ctx) {
  if (!reports.length) {
    return 'Click anywhere on the map to add a disease report. The system will analyse nearby clusters and compute your outbreak risk in real-time.';
  }
  if (!ctx.nearby.length) {
    const d = haversineMi(userLat, userLng, ctx.closest.lat, ctx.closest.lng).toFixed(1);
    return `No reports within ${NEARBY_RADIUS_MI} miles. Nearest: ${ctx.closest.disease} ${d} mi away (${ctx.closest.severity} severity). Overall risk remains low.`;
  }

  const [topName, topCount] = ctx.sorted[0];
  const n  = ctx.nearby.length;
  const hi = ctx.sCount.high;
  const d  = ctx.avgDist.toFixed(1);

  if (riskScore >= 75) {
    return `HIGH ALERT: ${n} active report${n > 1 ? 's' : ''} within ${NEARBY_RADIUS_MI} miles. `
         + (hi ? `${hi} high-severity case${hi > 1 ? 's' : ''} detected — significant transmission risk. ` : '')
         + `${topName} is the primary concern (${topCount} case${topCount > 1 ? 's' : ''}), averaging ${d} mi away. `
         + `Avoid crowded spaces, wear protection, and consider notifying public health.`;
  }
  if (riskScore >= 50) {
    return `Elevated risk: ${topCount} nearby ${topName} report${topCount > 1 ? 's' : ''} within ${d} miles. `
         + (hi ? `${hi} high-severity case${hi > 1 ? 's' : ''} amplifying the score. ` : '')
         + `${ctx.allClose.length} total reports within ${RISK_RADIUS_MI} miles. Exercise caution and follow preventive hygiene measures.`;
  }
  if (riskScore >= 25) {
    return `Moderate risk: ${n} report${n > 1 ? 's' : ''} in your vicinity — mainly ${topName} at ${d} mi avg. `
         + `Severity is predominantly ${ctx.sCount.high > ctx.sCount.low ? 'high' : ctx.sCount.medium >= ctx.sCount.low ? 'medium' : 'low'}. `
         + `Standard precautions (handwashing, ventilation) are advised.`;
  }
  return `Low risk. ${n} report${n > 1 ? 's' : ''} detected nearby, chiefly ${topName} averaging ${d} miles away. `
       + `No immediate concern — continue routine health practices.`;
}

// ── Gemma prompt builder ──────────────────────────────────────────────────────
function _buildPrompt(ctx) {
  const diseaseSummary = ctx.sorted.length
    ? ctx.sorted.map(([d, c]) => `${d}: ${c} case${c > 1 ? 's' : ''}`).join(', ')
    : 'none';

  const cdcSummary = ctx.relevantCDC && ctx.relevantCDC.length
    ? ctx.relevantCDC.slice(0, 3).map(a => a.title || 'Untitled CDC update').join(', ')
    : 'none';

  return `You are a public health risk analyst. Based on the following outbreak simulation data, write a 2-3 sentence plain-English assessment for a member of the public. Only mention CDC or WHO alerts if they are relevant to the user's risk context. Be direct, factual, and concise — no markdown, no bullet points, no headers.

Data:
- Risk score: ${riskScore} / 100
- Reports within ${NEARBY_RADIUS_MI} miles: ${ctx.nearby.length}
- Reports within ${RISK_RADIUS_MI} miles: ${ctx.allClose.length}
- Disease breakdown (nearby): ${diseaseSummary}
- Severity counts (nearby): low=${ctx.sCount.low}, medium=${ctx.sCount.medium}, high=${ctx.sCount.high}
- Average distance to nearby reports: ${ctx.avgDist != null ? ctx.avgDist.toFixed(1) + ' miles' : 'N/A'}
- Total reports in system: ${reports.length}
- WHO alerts: ${ctx.whoAlerts.length}
- Relevant CDC updates: ${cdcSummary}
Assessment:`;
}

// ── Gemma API call ────────────────────────────────────────────────────────────
async function _callGemma(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 150, temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

// ── Main entry point ──────────────────────────────────────────────────────────
function genAnalysis() {
  const el     = document.getElementById('ai-text');
  const apiKey = localStorage.getItem('az_risk_gemma_key');
  const ctx    = _buildContext();

  if (!apiKey) {
    el.textContent = _fallbackText(ctx);
    return;
  }

  // Show a brief loading state while the API responds
  el.textContent = '⏳ Analyzing with Gemma…';

  _callGemma(apiKey, _buildPrompt(ctx))
    .then(text => {
      el.textContent = text || _fallbackText(ctx);
    })
    .catch(err => {
      console.warn('Gemma API error:', err.message);
      el.textContent = _fallbackText(ctx);
      _showKeyError(err.message);
    });
}

// ── UI helpers (called by index.html inline handlers) ────────────────────────
function _showKeyError(msg) {
  const status = document.getElementById('ai-key-status');
  if (status) {
    status.textContent = `⚠ ${msg}`;
    status.className   = 'ai-key-status error';
  }
}
