import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DISEASES, D_COLOR, SEV_COLOR, type Severity } from "@/lib/config";
import { haversineMi, timeAgo } from "@/lib/geo";
import type { NewReport, Report } from "@/lib/api";
import { getSessionId } from "@/lib/session";

interface Props {
  reports: Report[];
  userLat: number;
  userLng: number;
  locMode: boolean;
  onSetUserLocation: (lat: number, lng: number) => void;
  onCreate: (r: NewReport) => void;
  onDelete: (id: number) => void;
}

export function OutbreakMap({
  reports,
  userLat,
  userLng,
  locMode,
  onSetUserLocation,
  onCreate,
  onDelete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const tempMarkerRef = useRef<L.Marker | null>(null);

  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [pDisease, setPDisease] = useState<string>(DISEASES[0]);
  const [pSeverity, setPSeverity] = useState<Severity>("medium");

  // refs for handlers
  const locModeRef = useRef(locMode);
  locModeRef.current = locMode;
  const onSetUserRef = useRef(onSetUserLocation);
  onSetUserRef.current = onSetUserLocation;

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [33.85, -111.9],
      zoom: 7,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (locModeRef.current) {
        onSetUserRef.current(e.latlng.lat, e.latlng.lng);
      } else {
        setPending({ lat: e.latlng.lat, lng: e.latlng.lng });
        setPDisease(DISEASES[0]);
        setPSeverity("medium");
        if (tempMarkerRef.current) map.removeLayer(tempMarkerRef.current);
        tempMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:50%;background:#94a3b8;border:2px solid white;opacity:0.7;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        }).addTo(map);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // update user marker when location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.18);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const m = L.marker([userLat, userLng], { icon, zIndexOffset: 2000 }).addTo(map);
    m.bindPopup(
      `<div style="padding:8px;"><strong>Your Location</strong><br><small style="color:#64748b">Simulated position</small></div>`,
    );
    userMarkerRef.current = m;
  }, [userLat, userLng]);

  // sync report markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const next = new Set(reports.map((r) => r.id));
    const sessionId = getSessionId();

    // remove markers that no longer exist
    for (const [id, marker] of markersRef.current.entries()) {
      if (!next.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }

    // add or update remaining
    for (const r of reports) {
      const dist = haversineMi(userLat, userLng, r.latitude, r.longitude).toFixed(1);
      const col = D_COLOR[r.disease] ?? "#64748b";
      const sCol = SEV_COLOR[r.severity];
      const ts = new Date(r.timestamp).getTime();
      const isMine = r.session_id === sessionId;

      const html = `
        <div style="padding:10px 12px;min-width:200px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:11px;height:11px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <strong style="font-size:14px;color:#0f172a;">${r.disease}</strong>
          </div>
          <div style="font-size:12px;color:#64748b;line-height:1.8;">
            <div>Severity: <span style="color:${sCol};font-weight:700;">${r.severity}</span></div>
            <div>Distance: <strong style="color:#0f172a">${dist} mi</strong></div>
            <div>Reported: ${timeAgo(ts)}</div>
          </div>
          ${
            isMine
              ? `<button data-del-id="${r.id}" style="margin-top:10px;width:100%;padding:6px;background:white;color:#ef4444;border:1.5px solid #fca5a5;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Remove Report</button>`
              : `<div style="margin-top:8px;font-size:11px;color:#94a3b8;font-style:italic;">From another session</div>`
          }
        </div>`;

      const existing = markersRef.current.get(r.id);
      if (existing) {
        existing.setPopupContent(html);
      } else {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;border-radius:50%;background:${sCol};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.22);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const m = L.marker([r.latitude, r.longitude], { icon }).addTo(map);
        m.bindPopup(html, { maxWidth: 240 });
        m.on("popupopen", (e) => {
          const el = (e.popup.getElement() as HTMLElement)?.querySelector(
            "[data-del-id]",
          ) as HTMLButtonElement | null;
          if (el) {
            el.onclick = () => {
              const id = Number(el.dataset.delId);
              map.closePopup();
              onDelete(id);
            };
          }
        });
        markersRef.current.set(r.id, m);
      }
    }
  }, [reports, userLat, userLng, onDelete]);

  const submit = () => {
    if (!pending) return;
    onCreate({
      latitude: pending.lat,
      longitude: pending.lng,
      disease: pDisease,
      severity: pSeverity,
    });
    if (tempMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
    setPending(null);
  };

  const cancel = () => {
    if (tempMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
    setPending(null);
  };

  const sevBtn = (s: Severity) => {
    const sel = pSeverity === s;
    return (
      <button
        key={s}
        onClick={() => setPSeverity(s)}
        className="flex-1 py-1.5 text-xs font-semibold rounded border transition-all"
        style={{
          background: sel ? SEV_COLOR[s] : "white",
          color: sel ? "white" : "#475569",
          borderColor: sel ? SEV_COLOR[s] : "#e2e8f0",
        }}
      >
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </button>
    );
  };

  const diseaseOptions = useMemo(() => DISEASES, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
      {pending && (
        <div className="absolute top-4 right-4 z-[1000] bg-white border border-border rounded-lg shadow-xl p-4 w-72">
          <div className="font-semibold text-sm mb-3">Add Disease Report</div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Disease Type
          </label>
          <select
            value={pDisease}
            onChange={(e) => setPDisease(e.target.value)}
            className="w-full text-sm border border-border rounded px-2 py-1.5 mb-3 bg-white"
          >
            {diseaseOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Symptom Severity
          </label>
          <div className="flex gap-1.5 mb-3">{(["low", "medium", "high"] as Severity[]).map(sevBtn)}</div>
          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="flex-1 py-1.5 text-xs border border-border rounded font-medium"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold"
            >
              Add Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
