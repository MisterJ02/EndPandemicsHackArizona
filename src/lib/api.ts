import { API_BASE_URL, type Disease, type Severity } from "./config";
import { getSessionId } from "./session";

export interface Report {
  id: number;
  latitude: number;
  longitude: number;
  disease: Disease | string;
  severity: Severity;
  timestamp: string; // ISO from backend
  session_id: string;
}

export interface NewReport {
  latitude: number;
  longitude: number;
  disease: string;
  severity: Severity;
}

const url = (p: string) => `${API_BASE_URL.replace(/\/$/, "")}${p}`;

export async function listReports(): Promise<Report[]> {
  const res = await fetch(url("/api/reports/"), {
    headers: { "X-Session-Id": getSessionId() },
  });
  if (!res.ok) throw new Error(`GET /api/reports failed: ${res.status}`);
  return res.json();
}

export async function createReport(data: NewReport): Promise<Report> {
  const res = await fetch(url("/api/reports/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": getSessionId(),
    },
    body: JSON.stringify({ ...data, session_id: getSessionId() }),
  });
  if (!res.ok) throw new Error(`POST /api/reports failed: ${res.status}`);
  return res.json();
}

export async function deleteReport(id: number): Promise<void> {
  const res = await fetch(url(`/api/reports/${id}/`), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": getSessionId(),
    },
    body: JSON.stringify({ session_id: getSessionId() }),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error("You can only delete your own reports.");
    throw new Error(`DELETE failed: ${res.status}`);
  }
}
