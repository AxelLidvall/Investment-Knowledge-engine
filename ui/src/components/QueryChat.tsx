import { useEffect, useRef, useState } from "react";

interface Props {
  company: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
}

export default function QueryChat({ company }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = question.trim();
    if (!q) return;
    if (!company.trim()) return setError("Enter a company name at the top.");

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, company: company.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
      // remove the user message we optimistically added
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Message list */}
      <div
        style={{
          minHeight: 300,
          maxHeight: 480,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingRight: 4,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
            Ask a question about {company || "the selected company"}.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                background: msg.role === "user" ? "#111" : "#f3f4f6",
                color: msg.role === "user" ? "#fff" : "#111",
                fontSize: "0.875rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
            </div>

            {msg.sources && msg.sources.length > 0 && (
              <div style={{ marginTop: 4, maxWidth: "80%" }}>
                <details>
                  <summary style={{ fontSize: "0.75rem", color: "#6b7280", cursor: "pointer" }}>
                    {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""}
                  </summary>
                  <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: "0.75rem", color: "#6b7280" }}>
                    {msg.sources.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                </details>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start", color: "#9ca3af", fontSize: "0.875rem" }}>
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Ask a question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit" disabled={loading || !question.trim()}>
          Send
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
