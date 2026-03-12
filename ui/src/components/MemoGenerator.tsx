import { useState } from "react";

interface Props {
  company: string;
}

interface MemoResult {
  title: string;
  company: string;
  memo_type: string;
  content: string;
  generated_at: string;
}

const MEMO_TYPES = [
  { value: "summary", label: "Summary" },
  { value: "thesis", label: "Investment Thesis" },
  { value: "risk", label: "Risk Assessment" },
];

export default function MemoGenerator({ company }: Props) {
  const [memoType, setMemoType] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemoResult | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!company.trim()) return setError("Enter a company name at the top.");

    setLoading(true);
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), memo_type: memoType }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = result
    ? new Date(result.generated_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="card">
      <form onSubmit={handleGenerate} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 20 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="memo-type">Memo type</label>
          <select
            id="memo-type"
            value={memoType}
            onChange={(e) => setMemoType(e.target.value)}
          >
            {MEMO_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{result.title}</h2>
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
                {result.company} · {MEMO_TYPES.find((t) => t.value === result.memo_type)?.label} · {formattedDate}
              </p>
            </div>
            <button
              className="btn btn-outline"
              style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              onClick={() => {
                const blob = new Blob([result.content], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${result.company}-${result.memo_type}.txt`;
                a.click();
              }}
            >
              Download
            </button>
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: 16,
              fontSize: "0.875rem",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              maxHeight: 520,
              overflowY: "auto",
            }}
          >
            {result.content}
          </div>
        </div>
      )}
    </div>
  );
}
