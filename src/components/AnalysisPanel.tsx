import { useEffect, useState } from "react";
import { buildContext, buildPrompt, callGemma, fallbackText } from "@/lib/analysis";
import type { Report } from "@/lib/api";

interface Props {
  reports: Report[];
  userLat: number;
  userLng: number;
  riskScore: number;
}

const KEY_STORAGE = "az_risk_gemma_key";

export function AnalysisPanel({ reports, userLat, userLng, riskScore }: Props) {
  const [text, setText] = useState("Loading…");
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(() => !!localStorage.getItem(KEY_STORAGE));
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = buildContext(reports, userLat, userLng, []);
    const apiKey = localStorage.getItem(KEY_STORAGE);
    if (!apiKey) {
      setText(fallbackText(ctx, riskScore, reports.length));
      return;
    }
    let cancelled = false;
    setText("⏳ Analyzing with Gemma…");
    callGemma(apiKey, buildPrompt(ctx, riskScore, reports.length))
      .then((t) => {
        if (cancelled) return;
        setText(t || fallbackText(ctx, riskScore, reports.length));
        setKeyError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setText(fallbackText(ctx, riskScore, reports.length));
        setKeyError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [reports, userLat, userLng, riskScore]);

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(KEY_STORAGE, k);
    setKeyInput("");
    setHasKey(true);
    setKeyError(null);
  };

  const clearKey = () => {
    localStorage.removeItem(KEY_STORAGE);
    setHasKey(false);
    setKeyError(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">AI Analysis</span>
          <span
            className={`text-[11px] font-medium ${
              keyError ? "text-destructive" : hasKey ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {keyError ? `⚠ ${keyError}` : hasKey ? "🟢 Gemma AI active" : "○ Rule-based mode"}
          </span>
        </div>
        {hasKey ? (
          <button
            onClick={clearKey}
            className="text-xs text-muted-foreground hover:text-destructive underline"
          >
            Remove API key
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Google AI Studio API key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="flex-1 text-xs px-2 py-1.5 border border-border rounded bg-background"
            />
            <button
              onClick={saveKey}
              className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded font-medium"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
