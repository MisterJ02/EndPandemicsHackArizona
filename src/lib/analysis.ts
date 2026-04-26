import {
  GEMMA_MODEL,
  NEARBY_RADIUS_MI,
  RISK_RADIUS_MI,
} from "./config";
import { haversineMi } from "./geo";
import type { Report } from "./api";

export interface AnalysisCtx {
  nearby: Report[];
  allClose: Report[];
  dCount: Record<string, number>;
  sCount: { low: number; medium: number; high: number };
  sorted: [string, number][];
  avgDist: number | null;
  closest: Report | null;
  whoAlerts: unknown[];
}

export function buildContext(
  reports: Report[],
  userLat: number,
  userLng: number,
  whoAlerts: unknown[] = [],
): AnalysisCtx {
  const nearby = reports.filter(
    (r) => haversineMi(userLat, userLng, r.latitude, r.longitude) <= NEARBY_RADIUS_MI,
  );
  const allClose = reports.filter(
    (r) => haversineMi(userLat, userLng, r.latitude, r.longitude) <= RISK_RADIUS_MI,
  );

  const dCount: Record<string, number> = {};
  const sCount = { low: 0, medium: 0, high: 0 };
  for (const r of nearby) {
    dCount[r.disease] = (dCount[r.disease] || 0) + 1;
    sCount[r.severity]++;
  }

  const sorted = Object.entries(dCount).sort((a, b) => b[1] - a[1]);
  const avgDist = nearby.length
    ? nearby.reduce(
        (s, r) => s + haversineMi(userLat, userLng, r.latitude, r.longitude),
        0,
      ) / nearby.length
    : null;

  let closest: Report | null = null;
  if (!nearby.length && reports.length) {
    closest = [...reports].sort(
      (a, b) =>
        haversineMi(userLat, userLng, a.latitude, a.longitude) -
        haversineMi(userLat, userLng, b.latitude, b.longitude),
    )[0];
  }

  return { nearby, allClose, dCount, sCount, sorted, avgDist, closest, whoAlerts };
}

export function fallbackText(ctx: AnalysisCtx, riskScore: number, totalReports: number): string {
  if (!totalReports) {
    return "Click anywhere on the map to add a disease report. The system will analyse nearby clusters and compute your outbreak risk in real-time.";
  }
  if (!ctx.nearby.length && ctx.closest) {
    const d = haversineMi(0, 0, 0, 0); // placeholder, computed below
    const dist = (
      // recompute against same closest
      // use any user coord — caller already filtered; we approximate using closest fields
      Math.round(
        haversineMi(
          ctx.closest.latitude,
          ctx.closest.longitude,
          ctx.closest.latitude,
          ctx.closest.longitude,
        ) * 10,
      ) / 10
    );
    void d;
    void dist;
    return `No reports within ${NEARBY_RADIUS_MI} miles. Nearest case: ${ctx.closest.disease} (${ctx.closest.severity} severity). Overall risk remains low.`;
  }
  if (!ctx.nearby.length) {
    return `No reports within ${NEARBY_RADIUS_MI} miles. Overall risk remains low.`;
  }

  const [topName, topCount] = ctx.sorted[0];
  const n = ctx.nearby.length;
  const hi = ctx.sCount.high;
  const d = (ctx.avgDist ?? 0).toFixed(1);

  if (riskScore >= 75) {
    return (
      `HIGH ALERT: ${n} active report${n > 1 ? "s" : ""} within ${NEARBY_RADIUS_MI} miles. ` +
      (hi
        ? `${hi} high-severity case${hi > 1 ? "s" : ""} detected — significant transmission risk. `
        : "") +
      `${topName} is the primary concern (${topCount} case${topCount > 1 ? "s" : ""}), averaging ${d} mi away. ` +
      `Avoid crowded spaces, wear protection, and consider notifying public health.`
    );
  }
  if (riskScore >= 50) {
    return (
      `Elevated risk: ${topCount} nearby ${topName} report${topCount > 1 ? "s" : ""} within ${d} miles. ` +
      (hi
        ? `${hi} high-severity case${hi > 1 ? "s" : ""} amplifying the score. `
        : "") +
      `${ctx.allClose.length} total reports within ${RISK_RADIUS_MI} miles. Exercise caution and follow preventive hygiene measures.`
    );
  }
  if (riskScore >= 25) {
    return (
      `Moderate risk: ${n} report${n > 1 ? "s" : ""} in your vicinity — mainly ${topName} at ${d} mi avg. ` +
      `Severity is predominantly ${
        ctx.sCount.high > ctx.sCount.low
          ? "high"
          : ctx.sCount.medium >= ctx.sCount.low
            ? "medium"
            : "low"
      }. ` +
      `Standard precautions (handwashing, ventilation) are advised.`
    );
  }
  return (
    `Low risk. ${n} report${n > 1 ? "s" : ""} detected nearby, chiefly ${topName} averaging ${d} miles away. ` +
    `No immediate concern — continue routine health practices.`
  );
}

export function buildPrompt(
  ctx: AnalysisCtx,
  riskScore: number,
  totalReports: number,
): string {
  const diseaseSummary = ctx.sorted.length
    ? ctx.sorted.map(([d, c]) => `${d}: ${c} case${c > 1 ? "s" : ""}`).join(", ")
    : "none";

  return `You are a public health risk analyst. Based on the following outbreak simulation data, write a 2-3 sentence plain-English assessment for a member of the public. Be direct, factual, and concise — no markdown, no bullet points, no headers.

Data:
- Risk score: ${riskScore} / 100
- Reports within ${NEARBY_RADIUS_MI} miles: ${ctx.nearby.length}
- Reports within ${RISK_RADIUS_MI} miles: ${ctx.allClose.length}
- Disease breakdown (nearby): ${diseaseSummary}
- Severity counts (nearby): low=${ctx.sCount.low}, medium=${ctx.sCount.medium}, high=${ctx.sCount.high}
- Average distance to nearby reports: ${ctx.avgDist != null ? ctx.avgDist.toFixed(1) + " miles" : "N/A"}
- Total reports in system: ${totalReports}
- WHO alerts: ${ctx.whoAlerts.length}

Assessment:`;
}

export async function callGemma(apiKey: string, prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
