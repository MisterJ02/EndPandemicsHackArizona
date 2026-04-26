// ── Marker icons ──────────────────────────────────────────────────────────────

function makeIcon(report) {
  const col = SEV_COLOR[report.severity];
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:16px;height:16px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:${col};border:2.5px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.22);z-index:2;
      "></div>
      <div style="
        position:absolute;inset:-3px;border-radius:50%;
        border:2px solid ${col};opacity:0;
        animation:ripple 2.4s infinite;
      "></div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function makePopupHtml(report) {
  const dist = haversineMi(userLat, userLng, report.lat, report.lng).toFixed(1);
  const col  = D_COLOR[report.disease];
  const sCol = SEV_COLOR[report.severity];
  return `
    <div style="padding:12px 14px;min-width:190px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:11px;height:11px;border-radius:50%;background:${col};flex-shrink:0"></div>
        <strong style="font-size:14px;color:#0f172a;">${report.disease}</strong>
      </div>
      <div style="font-size:12px;color:#64748b;line-height:2;">
        <div>Severity: <span style="color:${sCol};font-weight:700;">${report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}</span></div>
        <div>Distance from you: <strong style="color:#0f172a">${dist} miles</strong></div>
        <div>Reported: ${timeAgo(report.ts)}</div>
      </div>
      <button onclick="removeReport('${report.id}')" style="
        margin-top:10px;width:100%;padding:7px;
        background:white;color:#ef4444;
        border:1.5px solid #fca5a5;border-radius:7px;
        font-size:12px;font-weight:600;cursor:pointer;
      " onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background='white'">
        Remove Report
      </button>
    </div>`;
}

// ── Marker management ─────────────────────────────────────────────────────────

function addReportMarker(report) {
  const m = L.marker([report.lat, report.lng], { icon: makeIcon(report) });
  m.bindPopup(makePopupHtml(report), { maxWidth: 240 });
  m.report = report;
  m.addTo(map);
  markers.push(m);
  return m;
}

function refreshMarkerPopups() {
  for (const m of markers) {
    m.setIcon(makeIcon(m.report));
    m.setPopupContent(makePopupHtml(m.report));
  }
}

function updateUserMarker() {
  if (userMarker) map.removeLayer(userMarker);
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#3b82f6;border:3px solid white;
      animation:userpulse 2s infinite;
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  userMarker = L.marker([userLat, userLng], { icon, zIndexOffset: 2000 });
  userMarker.bindPopup('<div style="padding:10px;"><strong>Your Location</strong><br><small style="color:#64748b">Simulated position</small></div>');
  userMarker.addTo(map);
}

// ── Add-report popup form ─────────────────────────────────────────────────────

function showAddPopup(lat, lng) {
  pendingLat  = lat;
  pendingLng  = lng;
  selDisease  = DISEASES[0];
  selSeverity = 'medium';

  if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }

  tempMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;border-radius:50%;background:#94a3b8;border:2px solid white;opacity:0.7;"></div>`,
      iconSize: [12, 12], iconAnchor: [6, 6],
    }),
  }).addTo(map);

  const opts = DISEASES.map(d => `<option value="${d}">${d}</option>`).join('');
  L.popup({ closeButton: true, autoClose: false })
    .setLatLng([lat, lng])
    .setContent(`
      <div class="pf">
        <div class="pf-title">Add Disease Report</div>
        <div class="pf-group">
          <label class="pf-lbl">Disease Type</label>
          <select class="pf-select" id="pf-disease" onchange="selDisease=this.value">${opts}</select>
        </div>
        <div class="pf-group">
          <label class="pf-lbl">Symptom Severity</label>
          <div class="sev-row">
            <button class="sev-btn"            id="sb-low"    onclick="_sv('low')">Low</button>
            <button class="sev-btn sel-medium" id="sb-medium" onclick="_sv('medium')">Medium</button>
            <button class="sev-btn"            id="sb-high"   onclick="_sv('high')">High</button>
          </div>
        </div>
        <button class="pf-submit" onclick="_sub()">Add Report</button>
      </div>`)
    .openOn(map);

  map.once('popupclose', () => {
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
  });
}

// Exposed as globals so inline onclick handlers in popup HTML can reach them.
window._sv = function(sev) {
  selSeverity = sev;
  for (const s of ['low', 'medium', 'high']) {
    const b = document.getElementById(`sb-${s}`);
    if (b) b.className = `sev-btn${s === sev ? ` sel-${s}` : ''}`;
  }
};

window._sub = function() {
  const dEl    = document.getElementById('pf-disease');
  const disease = dEl ? dEl.value : selDisease;
  const report  = { id: String(_nextId++), lat: pendingLat, lng: pendingLng, disease, severity: selSeverity, ts: Date.now() };

  reports.push(report);
  map.closePopup();
  if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }

  const m = addReportMarker(report);
  updateAll();

  setTimeout(() => { m.openPopup(); setTimeout(() => m.closePopup(), 2200); }, 100);
};

// ── Map initialisation ────────────────────────────────────────────────────────

function initMap() {
  map = L.map('map', { center: [33.85, -111.9], zoom: 7, zoomControl: true });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  }).addTo(map);

  updateUserMarker();

  map.on('click', (e) => {
    if (locMode) {
      userLat = e.latlng.lat;
      userLng = e.latlng.lng;
      updateUserMarker();
      refreshMarkerPopups();
      updateAll();
      toggleLocMode();
    } else {
      showAddPopup(e.latlng.lat, e.latlng.lng);
    }
  });
}
