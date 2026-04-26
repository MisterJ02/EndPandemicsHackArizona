// ── Orchestration ─────────────────────────────────────────────────────────────

function updateAll() {
  riskScore = calcRisk();
  updateGauge(riskScore);
  genAnalysis();
  updateBreakdown();

  document.getElementById('hstat-total').textContent  = reports.length;
  const near = reports.filter(r => haversineMi(userLat, userLng, r.lat, r.lng) <= NEARBY_RADIUS_MI).length;
  document.getElementById('hstat-nearby').textContent = near;
}

// ── UI controls ───────────────────────────────────────────────────────────────

function toggleLocMode() {
  locMode = !locMode;
  const btn  = document.getElementById('loc-btn');
  const hint = document.getElementById('map-hint');
  if (locMode) {
    btn.classList.add('active-loc');
    btn.textContent = '✅ Click map to place';
    hint.textContent = 'Click anywhere to set your location';
    hint.classList.add('loc-mode');
  } else {
    btn.classList.remove('active-loc');
    btn.textContent = '📍 Set My Location';
    hint.textContent = 'Click anywhere on the map to add a report';
    hint.classList.remove('loc-mode');
  }
}

function clearReports() {
  if (!reports.length) return;
  if (!confirm(`Remove all ${reports.length} reports?`)) return;
  for (const m of markers) map.removeLayer(m);
  markers = [];
  reports = [];
  updateAll();
}

window.removeReport = function(id) {
  map.closePopup();
  const rIdx = reports.findIndex(r => r.id === id);
  if (rIdx !== -1) reports.splice(rIdx, 1);
  const mIdx = markers.findIndex(m => m.report.id === id);
  if (mIdx !== -1) {
    map.removeLayer(markers[mIdx]);
    markers.splice(mIdx, 1);
  }
  updateAll();
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function init() {
  initGauge();
  initMap();
  updateAll();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        if (lat >= 31 && lat <= 37 && lng >= -115 && lng <= -109) {
          userLat = lat;
          userLng = lng;
          updateUserMarker();
          map.setView([lat, lng], 10);
        }
      },
      () => {},
      { timeout: 3000 },
    );
  }
}

document.addEventListener('DOMContentLoaded', init);
