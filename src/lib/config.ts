export const DISEASES = [
  "Flu",
  "COVID-19",
  "RSV",
  "Norovirus",
  "Food Poisoning",
  "Unknown Respiratory Illness",
] as const;

export type Disease = (typeof DISEASES)[number];
export type Severity = "low" | "medium" | "high";

export const D_COLOR: Record<string, string> = {
  Flu: "#f59e0b",
  "COVID-19": "#6366f1",
  RSV: "#ec4899",
  Norovirus: "#10b981",
  "Food Poisoning": "#f97316",
  "Unknown Respiratory Illness": "#8b5cf6",
};

export const SEV_COLOR: Record<Severity, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
};

export const SEV_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2.5,
  high: 5,
};

export const RISK_RADIUS_MI = 12;
export const NEARBY_RADIUS_MI = 5;
export const DECAY_MI = 2.2;

export const GEMMA_MODEL = "gemma-3-27b-it";

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
