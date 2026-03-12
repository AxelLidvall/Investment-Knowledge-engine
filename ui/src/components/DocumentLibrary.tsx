import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "../api";

interface DocumentItem {
  id: number;
  filename: string;
  company: string;
  doc_type: string;
  uploaded_at: string;
  chunk_count: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  annual_report: "Annual Report",
  investment_memo: "Investment Memo",
  diligence_pack: "Diligence Pack",
  board_update: "Board Update",
};

export default function DocumentLibrary() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterCompany.trim()) params.set("company", filterCompany.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/documents?${params}`);
      if (!res.ok) throw new Error(await parseApiError(res));
      setDocs(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [filterCompany, dateFrom, dateTo]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function handleDelete(id: number, filename: string) {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseApiError(res));
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  const uniqueCompanies = Array.from(new Set(docs.map((d) => d.company))).sort();

  return (
    <div className="card">
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label htmlFor="lib-company">Company</label>
          <input
            id="lib-company"
            type="text"
            placeholder="Filter by company…"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label htmlFor="lib-from">From</label>
          <input
            id="lib-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label htmlFor="lib-to">To</label>
          <input
            id="lib-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div style={{ flex: "0 0 auto", alignSelf: "flex-end" }}>
          <button className="btn btn-outline" onClick={fetchDocs} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {!loading && docs.length === 0 && (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
          No documents found. Upload PDFs in the Upload tab.
        </p>
      )}

      {docs.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "6px 10px 8px 0", fontWeight: 500, color: "#6b7280" }}>File</th>
              <th style={{ padding: "6px 10px 8px", fontWeight: 500, color: "#6b7280" }}>Company</th>
              <th style={{ padding: "6px 10px 8px", fontWeight: 500, color: "#6b7280" }}>Type</th>
              <th style={{ padding: "6px 10px 8px", fontWeight: 500, color: "#6b7280" }}>Chunks</th>
              <th style={{ padding: "6px 10px 8px", fontWeight: 500, color: "#6b7280" }}>Uploaded</th>
              <th style={{ padding: "6px 0 8px 10px" }} />
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 10px 8px 0", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.filename}
                </td>
                <td style={{ padding: "8px 10px" }}>{doc.company}</td>
                <td style={{ padding: "8px 10px", color: "#6b7280" }}>
                  {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{doc.chunk_count}</td>
                <td style={{ padding: "8px 10px", color: "#6b7280", whiteSpace: "nowrap" }}>
                  {new Date(doc.uploaded_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </td>
                <td style={{ padding: "8px 0 8px 10px", textAlign: "right" }}>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: "0.75rem", padding: "3px 10px", color: "#dc2626", borderColor: "#fca5a5" }}
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    disabled={deleting === doc.id}
                  >
                    {deleting === doc.id ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 12, fontSize: "0.78rem", color: "#9ca3af" }}>
        {docs.length} document{docs.length !== 1 ? "s" : ""}
        {uniqueCompanies.length > 0 ? ` across ${uniqueCompanies.length} compan${uniqueCompanies.length > 1 ? "ies" : "y"}` : ""}
      </p>
    </div>
  );
}
