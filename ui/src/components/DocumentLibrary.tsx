import { useCallback, useEffect, useState } from "react";
import Select, { StylesConfig } from "react-select";
import { parseApiError } from "../api";

interface CompanyOption {
  value: string;
  label: string;
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

const PAGE_SIZE = 10;

export default function DocumentLibrary({ refreshKey = 0 }: { refreshKey?: number }) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterCompany, setFilterCompany] = useState<CompanyOption | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error(await parseApiError(res));
      setDocs(await res.json());
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1); }, [filterCompany, dateFrom, dateTo]);

  async function handleDelete(id: number, filename: string) {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseApiError(res));
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  const uniqueCompanies = Array.from(new Set(docs.map((d) => d.company))).sort();

  const filteredDocs = docs.filter((d) => {
    if (filterCompany && d.company !== filterCompany.value) return false;
    if (dateFrom && d.uploaded_at < dateFrom) return false;
    if (dateTo && d.uploaded_at.slice(0, 10) > dateTo) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const pageDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="card">
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label>Company</label>
          <Select<CompanyOption>
            options={uniqueCompanies.map((c) => ({ value: c, label: c }))}
            value={filterCompany}
            onChange={(opt) => setFilterCompany(opt)}
            placeholder="All companies"
            isClearable
            styles={selectStyles}
            noOptionsMessage={() => "No match"}
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
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {!loading && filteredDocs.length === 0 && (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
          {docs.length === 0
            ? "No documents found. Upload PDFs in the Upload tab."
            : "No documents match the current filters."}
        </p>
      )}

      {filteredDocs.length > 0 && (
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
            {pageDocs.map((doc) => (
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

      {/* Footer: summary + pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0 }}>
          {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
          {filterCompany ? ` for ${filterCompany.value}` : uniqueCompanies.length > 0 ? ` across ${uniqueCompanies.length} compan${uniqueCompanies.length > 1 ? "ies" : "y"}` : ""}
        </p>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: "0.75rem", padding: "3px 10px" }}
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              ←
            </button>
            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-outline"
              style={{ fontSize: "0.75rem", padding: "3px 10px" }}
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
