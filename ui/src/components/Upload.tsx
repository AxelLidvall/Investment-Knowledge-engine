import { useRef, useState } from "react";

interface Props {
  company: string;
}

interface UploadResult {
  document_id: number;
  filename: string;
  company: string;
  doc_type: string;
  chunk_count: number;
  status: string;
}

export default function Upload({ company }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("annual_report");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Select a PDF file.");
    if (!company.trim()) return setError("Enter a company name at the top.");

    const form = new FormData();
    form.append("file", file);
    form.append("company", company.trim());
    form.append("doc_type", docType);

    setLoading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setResult(await res.json());
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
          <label htmlFor="doc-type">Document type</label>
          <select
            id="doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="annual_report">Annual Report</option>
            <option value="investment_memo">Investment Memo</option>
            <option value="diligence_pack">Diligence Pack</option>
            <option value="board_update">Board Update</option>
          </select>
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
