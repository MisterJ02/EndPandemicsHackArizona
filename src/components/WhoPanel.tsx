import { useEffect, useState } from "react";

interface WhoItem {
  Title?: string;
  title?: string;
  PublicationDate?: string;
  DatePublished?: string;
  Date?: string;
  LastModified?: string;
  Summary?: string;
  Excerpt?: string;
  Overview?: string;
  Description?: string;
  Url?: string;
  Link?: string;
  AbsoluteUrl?: string;
}

function stripHtml(v: string) {
  const div = document.createElement("div");
  div.innerHTML = v || "";
  return div.textContent || "";
}

export function WhoPanel() {
  const [items, setItems] = useState<WhoItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("https://www.who.int/api/emergencies/diseaseoutbreaknews")
      .then((r) => r.json())
      .then((d) => setItems((d.value || d.Items || []).slice(0, 6)))
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="text-sm text-destructive">Failed to load WHO data.</div>;
  if (!items) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!items.length) return <div className="text-sm text-muted-foreground">No WHO reports found.</div>;

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const title = item.Title || item.title || "Untitled report";
        const raw = item.PublicationDate || item.DatePublished || item.LastModified || item.Date || "";
        const date = raw ? new Date(raw).toLocaleDateString() : "Date unavailable";
        const summary = stripHtml(item.Summary || item.Excerpt || item.Overview || item.Description || "No summary available.");
        const link = item.Url || item.Link || item.AbsoluteUrl || "https://www.who.int/emergencies/disease-outbreak-news";
        return (
          <details key={i} className="border border-border rounded-md px-3 py-2 group">
            <summary className="flex justify-between items-start gap-2 cursor-pointer text-xs">
              <span className="font-medium text-foreground/90">{title}</span>
              <span className="text-muted-foreground shrink-0">{date}</span>
            </summary>
            <div className="mt-2 text-xs text-muted-foreground space-y-2">
              <p>{summary}</p>
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Read full WHO report →
              </a>
            </div>
          </details>
        );
      })}
    </div>
  );
}
