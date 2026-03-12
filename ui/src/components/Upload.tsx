import { useEffect, useRef, useState } from "react";
import Select, { StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";
import { parseApiError } from "../api";

interface CompanyOption {
  value: string;
  label: string;
}

const DOC_TYPES = [
  { value: "annual_report", label: "Annual Report" },
  { value: "investment_memo", label: "Investment Memo" },
  { value: "diligence_pack", label: "Diligence Pack" },
  { value: "board_update", label: "Board Update" },
];

interface UploadResult {
  document_id: number;
  filename: string;
  company: string;
  doc_type: string;
  chunk_count: number;
  status: string;
}

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

export default function Upload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState<CompanyOption | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [docType, setDocType] = useState<CompanyOption>(DOC_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data: string[]) => setCompanies(data.map((c) => ({ value: c, label: c }))))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Select a PDF file.");
    if (!company) return setError("Enter a company name.");

    const form = new FormData();
    form.append("file", file);
    form.append("company", company.value.trim());
    form.append("doc_type", docType.value);

    setLoading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = await res.json();
      setResult(data);
      // Add the new company to the local list if it was freshly created
      if (!companies.find((c) => c.value === company.value)) {
        setCompanies((prev) => [...prev, company].sort((a, b) => a.label.localeCompare(b.label)));
      }
      onUploadSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Company</label>
          <CreatableSelect<CompanyOption>
            options={companies}
            value={company}
            onChange={(opt) => { setCompany(opt); setError(""); }}
            placeholder="Select or type a new company…"
            isClearable
            styles={selectStyles}
            formatCreateLabel={(input) => `Add "${input}"`}
            noOptionsMessage={() => "Type to create a new company"}
          />
        </div>

        <div className="field">
          <label>Document type</label>
          <Select<CompanyOption>
            options={DOC_TYPES}
            value={docType}
            onChange={(opt) => opt && setDocType(opt)}
            styles={selectStyles}
            isSearchable={false}
          />
        </div>

        <div className="field">
          <label htmlFor="pdf-file">PDF file</label>
          <input id="pdf-file" ref={fileRef} type="file" accept=".pdf" />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Uploading…" : "Upload"}
        </button>

        {error && <p className="error">{error}</p>}
      </form>

      {result && (
        <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <p className="success">Ingested successfully</p>
          <table style={{ marginTop: 10, fontSize: "0.85rem", borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {[
                ["Document ID", result.document_id],
                ["Filename", result.filename],
                ["Company", result.company],
                ["Type", result.doc_type],
                ["Chunks", result.chunk_count],
                ["Status", result.status],
              ].map(([k, v]) => (
                <tr key={k as string}>
                  <td style={{ color: "#6b7280", paddingRight: 16, paddingBottom: 4 }}>{k}</td>
                  <td style={{ fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
