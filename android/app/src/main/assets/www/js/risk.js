// Computes a 0-100 risk score based on proximity and severity of nearby reports.
// Each report contributes: severity_weight * e^(-distance / DECAY_MI)
// The raw sum is compressed via a logistic curve so the score saturates at 100.
function calcRisk() {
  if (!reports.length) return 0;

  let total = 0;
  for (const r of reports) {
    const d = haversineMi(userLat, userLng, r.lat, r.lng);
    if (d > RISK_RADIUS_MI) continue;
    total += SEV_WEIGHT[r.severity] * Math.exp(-d / DECAY_MI);
  }

  return Math.min(100, Math.round(55 * (1 - Math.exp(-total / 6))));
}
