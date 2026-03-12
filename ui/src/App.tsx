import { useState, useCallback } from "react";
import Upload from "./components/Upload";
import QueryChat from "./components/QueryChat";
import MemoGenerator from "./components/MemoGenerator";
import DocumentLibrary from "./components/DocumentLibrary";

type Tab = "upload" | "ask" | "memo" | "library";

export interface CompanyOption {
  value: string;
  label: string;
}

async function loadCompanies(): Promise<CompanyOption[]> {
  try {
    const r = await fetch("/api/companies");
    const data: string[] = await r.json();
    return data.map((c) => ({ value: c, label: c }));
  } catch {
    return [];
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>("upload");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [libraryVersion, setLibraryVersion] = useState(0);

  const handleTabClick = useCallback(async (t: Tab) => {
    setTab(t);
    if (t === "ask" || t === "memo") {
      setCompanies(await loadCompanies());
    }
  }, []);

  const tabLabels: Record<Tab, string> = {
    upload: "Upload",
    ask: "Ask",
    memo: "Memo",
    library: "Library",
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #1a1a1a; }
        .shell { max-width: 860px; margin: 0 auto; padding: 24px 16px; }
        h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 20px; }
        .tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px; }
        .tab { padding: 8px 18px; font-size: 0.875rem; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; color: #6b7280; }
        .tab.active { color: #111; border-bottom-color: #111; font-weight: 500; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; }
        label { display: block; font-size: 0.8rem; font-weight: 500; margin-bottom: 4px; color: #374151; }
        input[type=text], input[type=date], select, textarea {
          width: 100%; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px;
          font-size: 0.9rem; font-family: inherit; background: #fff;
        }
        input[type=text]:focus, input[type=date]:focus, select:focus, textarea:focus { outline: 2px solid #6366f1; border-color: transparent; }
        .btn { padding: 8px 18px; background: #111; color: #fff; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-outline { background: #fff; color: #111; border: 1px solid #d1d5db; }
        .error { color: #dc2626; font-size: 0.82rem; margin-top: 8px; }
        .success { color: #16a34a; font-size: 0.82rem; margin-top: 8px; }
        .field { margin-bottom: 14px; }
      `}</style>

      <div className="shell">
        <h1>Investment Knowledge Engine</h1>

        <div className="tabs">
          {(["upload", "ask", "memo", "library"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`tab${tab === t ? " active" : ""}`}
              onClick={() => handleTabClick(t)}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* All panels stay mounted — CSS toggles visibility, preserving state across tab switches */}
        <div style={{ display: tab === "upload"  ? "block" : "none" }}><Upload onUploadSuccess={() => setLibraryVersion((v) => v + 1)} /></div>
        <div style={{ display: tab === "ask"     ? "block" : "none" }}><QueryChat companies={companies} /></div>
        <div style={{ display: tab === "memo"    ? "block" : "none" }}><MemoGenerator companies={companies} /></div>
        <div style={{ display: tab === "library" ? "block" : "none" }}><DocumentLibrary refreshKey={libraryVersion} /></div>
      </div>
    </>
  );
}
