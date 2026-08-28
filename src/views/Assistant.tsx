import { useState, type FormEvent } from "react";
import { useAgentRun } from "../lib/AgentRunContext";

export function Assistant() {
  const { messages, running, sendMessage } = useAgentRun();
  const [input, setInput] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || running) return;
    setInput("");
    await sendMessage(text);
  }

  return (
    <div className="assistant">
      <div className="assistant-header">Assistente</div>
      <div className="messages">
        {messages.length === 0 && !running && (
          <p className="notice">Envie uma mensagem para conversar com o assistente.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`message message-${m.role}`}>
            {m.content || (m.role === "assistant" ? "…" : "")}
          </div>
        ))}
        {running && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="message message-assistant thinking">Pensando…</div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="assistant-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Vou sair de casa."
          disabled={running}
        />
        <button type="submit" disabled={running}>
          Enviar
        </button>
      </form>
    </div>
  );
}
