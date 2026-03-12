import { useState } from "react";
import Select, { StylesConfig } from "react-select";
import { CompanyOption } from "../App";
import { parseApiError } from "../api";

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

const selectStyles: StylesConfig<CompanyOption> = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "transparent" : "#d1d5db",
    borderRadius: 6,
    fontSize: "0.9rem",
    fontFamily: "system-ui, sans-serif",
    boxShadow: state.isFocused ? "0 0 0 2px #6366f1" : "none",
    "&:hover": { borderColor: "#d1d5db" },
    minHeight: 36,
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.9rem",
    backgroundColor: state.isSelected ? "#111" : state.isFocused ? "#f3f4f6" : "#fff",
    color: state.isSelected ? "#fff" : "#1a1a1a",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  noOptionsMessage: (base) => ({ ...base, fontSize: "0.875rem", color: "#6b7280" }),
};

export default function MemoGenerator({ companies }: { companies: CompanyOption[] }) {
  const [company, setCompany] = useState<CompanyOption | null>(null);
  const [memoType, setMemoType] = useState<CompanyOption>(MEMO_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemoResult | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!company) return setError("Select a company first.");

    setLoading(true);
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.value, memo_type: memoType.value }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
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
      <form onSubmit={handleGenerate}>
        <div className="field">
          <label>Company</label>
          <Select<CompanyOption>
            options={companies}
            value={company}
            onChange={(opt) => { setCompany(opt); setResult(null); setError(""); }}
            placeholder={
              companies.length === 0
                ? "No documents uploaded yet"
                : "Search companies…"
            }
            isDisabled={companies.length === 0}
            isClearable
            styles={selectStyles}
            noOptionsMessage={() => "No match"}
          />
        </div>

        <div className="field">
          <label>Memo type</label>
          <Select<CompanyOption>
            options={MEMO_TYPES}
            value={memoType}
            onChange={(opt) => opt && setMemoType(opt)}
            styles={selectStyles}
            isSearchable={false}
          />
        </div>

        <button className="btn" type="submit" disabled={loading || !company}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{result.title}</h2>
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
                {result.company} · {MEMO_TYPES.find((t) => t.value === result.memo_type)?.label ?? result.memo_type} · {formattedDate}
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
