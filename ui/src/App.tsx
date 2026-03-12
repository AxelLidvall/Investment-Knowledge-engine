import { useState } from "react";
import Upload from "./components/Upload";
import QueryChat from "./components/QueryChat";
import MemoGenerator from "./components/MemoGenerator";

type Tab = "upload" | "ask" | "memo";

export default function App() {
  const [tab, setTab] = useState<Tab>("upload");
  const [company, setCompany] = useState("");

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #1a1a1a; }
        .shell { max-width: 860px; margin: 0 auto; padding: 24px 16px; }
        h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 20px; }
        .company-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .company-bar label { font-size: 0.85rem; font-weight: 500; white-space: nowrap; }
        .company-bar input { flex: 1; max-width: 280px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
        .tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px; }
        .tab { padding: 8px 18px; font-size: 0.875rem; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; color: #6b7280; }
        .tab.active { color: #111; border-bottom-color: #111; font-weight: 500; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; }
        label { display: block; font-size: 0.8rem; font-weight: 500; margin-bottom: 4px; color: #374151; }
        input[type=text], select, textarea {
          width: 100%; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px;
          font-size: 0.9rem; font-family: inherit; background: #fff;
        }
        input[type=text]:focus, select:focus, textarea:focus { outline: 2px solid #6366f1; border-color: transparent; }
        .btn { padding: 8px 18px; background: #111; color: #fff; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-outline { background: #fff; color: #111; border: 1px solid #d1d5db; }
        .error { color: #dc2626; font-size: 0.82rem; margin-top: 8px; }
        .success { color: #16a34a; font-size: 0.82rem; margin-top: 8px; }
        .field { margin-bottom: 14px; }
      `}</style>

      <div className="shell">
        <h1>Investment Knowledge Engine</h1>

        <div className="company-bar">
          <label htmlFor="global-company">Company:</label>
          <input
            id="global-company"
            type="text"
            placeholder="e.g. Acme Corp"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="tabs">
          {(["upload", "ask", "memo"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`tab${tab === t ? " active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "upload" ? "Upload" : t === "ask" ? "Ask" : "Memo"}
            </button>
          ))}
        </div>

        {tab === "upload" && <Upload company={company} />}
        {tab === "ask" && <QueryChat company={company} />}
        {tab === "memo" && <MemoGenerator company={company} />}
      </div>
    </>
  );
}
