// ── Geometry helpers ──────────────────────────────────────────────────────────

// Convert polar coords (standard math angles, degrees) to SVG x/y.
// SVG y-axis is inverted, so sin is negated.
function polar(cx, cy, r, deg) {
  const rad = deg * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

// Build the SVG path for a donut-ring arc segment between two angles.
// a1 > a2: sweeps counter-clockwise on screen (left → top → right).
function arcBand(cx, cy, r1, r2, a1, a2) {
  const [x1o, y1o] = polar(cx, cy, r1, a1);
  const [x2o, y2o] = polar(cx, cy, r1, a2);
  const [x1i, y1i] = polar(cx, cy, r2, a1);
  const [x2i, y2i] = polar(cx, cy, r2, a2);
  const lg = (a1 - a2) > 180 ? 1 : 0;
  const f  = v => v.toFixed(2);
  return [
    `M ${f(x1o)} ${f(y1o)}`,
    `A ${r1} ${r1} 0 ${lg} 0 ${f(x2o)} ${f(y2o)}`,
    `L ${f(x2i)} ${f(y2i)}`,
    `A ${r2} ${r2} 0 ${lg} 1 ${f(x1i)} ${f(y1i)} Z`,
  ].join(' ');
}

// ── Build gauge SVG ───────────────────────────────────────────────────────────

function initGauge() {
  const bandsG = document.getElementById('g-bands');
  const ticksG = document.getElementById('g-ticks');
  const cx = 150, cy = 150, ro = 115, ri = 78;

  // Grey background track (slightly wider than colour bands)
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bg.setAttribute('d', arcBand(cx, cy, ro + 2, ri - 2, 180, 0));
  bg.setAttribute('fill', '#e2e8f0');
  bandsG.appendChild(bg);

  // Four colour bands: green / yellow / orange / red
  for (const { a1, a2, fill } of [
    { a1: 180, a2: 135, fill: '#22c55e' },
    { a1: 135, a2: 90,  fill: '#eab308' },
    { a1: 90,  a2: 45,  fill: '#f97316' },
    { a1: 45,  a2: 0,   fill: '#ef4444' },
  ]) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', arcBand(cx, cy, ro, ri, a1, a2));
    el.setAttribute('fill', fill);
    el.setAttribute('opacity', '0.88');
    bandsG.appendChild(el);
  }

  // Tick marks (minor every 9°, major every 45°)
  for (let i = 0; i <= 20; i++) {
    const angle  = 180 - (i * 9);
    const isMain = i % 5 === 0;
    const [x1, y1] = polar(cx, cy, ro + 2, angle);
    const [x2, y2] = polar(cx, cy, ro + (isMain ? 8 : 5), angle);
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', x1.toFixed(2)); tick.setAttribute('y1', y1.toFixed(2));
    tick.setAttribute('x2', x2.toFixed(2)); tick.setAttribute('y2', y2.toFixed(2));
    tick.setAttribute('stroke', 'white');
    tick.setAttribute('stroke-width', isMain ? '2.5' : '1.5');
    tick.setAttribute('opacity', '0.85');
    ticksG.appendChild(tick);
  }

  // Score labels at 0 / 25 / 50 / 75 / 100
  for (const score of [0, 25, 50, 75, 100]) {
    const angle  = 180 - (score / 100 * 180);
    const [x, y] = polar(cx, cy, ro + 18, angle);
    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', x.toFixed(2));
    lbl.setAttribute('y', (y + 3.5).toFixed(2));
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('font-size', '9');
    lbl.setAttribute('fill', '#94a3b8');
    lbl.setAttribute('font-weight', '700');
    lbl.setAttribute('font-family', 'system-ui');
    lbl.textContent = score;
    ticksG.appendChild(lbl);
  }
}

// ── Needle animation ──────────────────────────────────────────────────────────

function animateNeedle() {
  const diff = needleTarget - needleCurrent;
  if (Math.abs(diff) < 0.3) {
    needleCurrent = needleTarget;
    needleRAF = null;
  } else {
    needleCurrent += diff * 0.11;
    needleRAF = requestAnimationFrame(animateNeedle);
  }
  document.getElementById('g-needle')
    .setAttribute('transform', `rotate(${needleCurrent.toFixed(2)}, 150, 150)`);
}

function setNeedle(score) {
  // Needle rotates from -90° (score 0, left) to +90° (score 100, right)
  needleTarget = -90 + (score / 100) * 180;
  if (!needleRAF) {
    needleRAF = requestAnimationFrame(animateNeedle);
  }
}

// ── Update gauge UI ───────────────────────────────────────────────────────────

function updateGauge(score) {
  const { label, color, zone } = riskMeta(score);
  setNeedle(score);

  document.getElementById('g-score').textContent = score;
  document.getElementById('g-score').setAttribute('fill', color);
  document.getElementById('g-label').textContent = label.toUpperCase();
  document.getElementById('g-label').setAttribute('fill', color);

  for (const id of ['z-low', 'z-mod', 'z-elev', 'z-high']) {
    document.getElementById(id).classList.toggle('active', id === zone);
  }

  const lvlEl = document.getElementById('hstat-level');
  lvlEl.textContent = label.split(' ')[0].toUpperCase();
  lvlEl.style.color = color;
}
