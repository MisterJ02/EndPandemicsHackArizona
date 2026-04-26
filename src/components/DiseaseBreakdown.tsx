import { DECAY_MI, DISEASES, D_COLOR, RISK_RADIUS_MI, SEV_WEIGHT } from "@/lib/config";
import { haversineMi } from "@/lib/geo";
import type { Report } from "@/lib/api";

interface Props {
  reports: Report[];
  userLat: number;
  userLng: number;
}

export function DiseaseBreakdown({ reports, userLat, userLng }: Props) {
  if (!reports.length) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No reports yet. Add reports to see breakdown.
      </div>
    );
  }

  const stats: Record<string, { count: number; totalDist: number; contrib: number }> = {};
  for (const d of DISEASES) stats[d] = { count: 0, totalDist: 0, contrib: 0 };

  for (const r of reports) {
    if (!stats[r.disease]) stats[r.disease] = { count: 0, totalDist: 0, contrib: 0 };
    const dist = haversineMi(userLat, userLng, r.latitude, r.longitude);
    stats[r.disease].count++;
    stats[r.disease].totalDist += dist;
    if (dist <= RISK_RADIUS_MI) {
      stats[r.disease].contrib += SEV_WEIGHT[r.severity] * Math.exp(-dist / DECAY_MI);
    }
  }

  const active = Object.keys(stats)
    .filter((d) => stats[d].count > 0)
    .sort((a, b) => stats[b].contrib - stats[a].contrib);

  const maxC = Math.max(...active.map((d) => stats[d].contrib), 0.0001);

  return (
    <div className="space-y-3">
      {active.map((d) => {
        const s = stats[d];
        const avgD = (s.totalDist / s.count).toFixed(1);
        const pct = Math.round((s.contrib / maxC) * 100);
        const col = D_COLOR[d] ?? "#64748b";
        return (
          <div key={d}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                <span className="text-sm font-medium">{d}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {s.count} case{s.count !== 1 ? "s" : ""} · {avgD} mi avg
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: col }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Risk contribution: {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
