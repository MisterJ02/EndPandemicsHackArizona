import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReport, deleteReport, listReports, type NewReport } from "@/lib/api";
import { calcRisk } from "@/lib/risk";
import { NEARBY_RADIUS_MI, API_BASE_URL } from "@/lib/config";
import { haversineMi } from "@/lib/geo";
import { RiskGauge } from "@/components/RiskGauge";
import { DiseaseBreakdown } from "@/components/DiseaseBreakdown";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { WhoPanel } from "@/components/WhoPanel";
import { OutbreakMap } from "@/components/OutbreakMap";
import { riskMeta } from "@/lib/geo";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const qc = useQueryClient();
  const [userLat, setUserLat] = useState(33.4484);
  const [userLng, setUserLng] = useState(-112.074);
  const [locMode, setLocMode] = useState(false);

  const { data: reports = [], error, isError } = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    refetchInterval: 10000,
    retry: 1,
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: "Backend not reachable",
        description: `Could not connect to ${API_BASE_URL}. Start the Django server and set VITE_API_URL.`,
        variant: "destructive",
      });
    }
  }, [isError]);

  const createMut = useMutation({
    mutationFn: (r: NewReport) => createReport(r),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
    onError: (e: Error) =>
      toast({ title: "Failed to add report", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
    onError: (e: Error) =>
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const riskScore = useMemo(() => calcRisk(reports, userLat, userLng), [reports, userLat, userLng]);
  const nearbyCount = useMemo(
    () =>
      reports.filter(
        (r) => haversineMi(userLat, userLng, r.latitude, r.longitude) <= NEARBY_RADIUS_MI,
      ).length,
    [reports, userLat, userLng],
  );
  const meta = riskMeta(riskScore);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Outbreak Risk Tracker</h1>
          <p className="text-xs text-muted-foreground">
            Real-time multi-user disease reporting · Arizona region
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Total</div>
            <div className="font-bold">{reports.length}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
              Within {NEARBY_RADIUS_MI}mi
            </div>
            <div className="font-bold">{nearbyCount}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Level</div>
            <div className="font-bold" style={{ color: meta.color }}>
              {meta.label.split(" ")[0].toUpperCase()}
            </div>
          </div>
          <button
            onClick={() => setLocMode((v) => !v)}
            className={`px-3 py-1.5 text-xs font-semibold rounded border ${
              locMode
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-border hover:bg-slate-50"
            }`}
          >
            {locMode ? "✅ Click map to place" : "📍 Set My Location"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 p-4">
        <div className="bg-white border border-border rounded-lg overflow-hidden h-[calc(100vh-120px)] relative">
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur px-3 py-1.5 rounded-md text-xs text-muted-foreground border border-border shadow-sm">
            {locMode
              ? "Click anywhere to set your location"
              : "Click anywhere on the map to add a report"}
          </div>
          <OutbreakMap
            reports={reports}
            userLat={userLat}
            userLng={userLng}
            locMode={locMode}
            onSetUserLocation={(lat, lng) => {
              setUserLat(lat);
              setUserLng(lng);
              setLocMode(false);
            }}
            onCreate={(r) => createMut.mutate(r)}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        </div>

        <aside className="space-y-4 overflow-y-auto h-[calc(100vh-120px)] pr-1">
          <section className="bg-white border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Risk Score
            </h2>
            <RiskGauge score={riskScore} />
          </section>

          <section className="bg-white border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Analysis
            </h2>
            <AnalysisPanel
              reports={reports}
              userLat={userLat}
              userLng={userLng}
              riskScore={riskScore}
            />
          </section>

          <section className="bg-white border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Disease Breakdown
            </h2>
            <DiseaseBreakdown reports={reports} userLat={userLat} userLng={userLng} />
          </section>

          <section className="bg-white border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              WHO Outbreak News
            </h2>
            <WhoPanel />
          </section>

          <div className="text-[10px] text-muted-foreground text-center py-2">
            API: <code className="text-foreground/70">{API_BASE_URL}</code>
            {error && <span className="text-destructive"> · offline</span>}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
