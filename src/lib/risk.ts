import { DECAY_MI, RISK_RADIUS_MI, SEV_WEIGHT } from "./config";
import { haversineMi } from "./geo";
import type { Report } from "./api";

export function calcRisk(reports: Report[], userLat: number, userLng: number): number {
  if (!reports.length) return 0;
  let total = 0;
  for (const r of reports) {
    const d = haversineMi(userLat, userLng, r.latitude, r.longitude);
    if (d > RISK_RADIUS_MI) continue;
    total += SEV_WEIGHT[r.severity] * Math.exp(-d / DECAY_MI);
  }
  return Math.min(100, Math.round(55 * (1 - Math.exp(-total / 6))));
}
