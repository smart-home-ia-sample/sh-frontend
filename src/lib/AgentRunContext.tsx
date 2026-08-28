import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { forceLogout } from "./auth";
import { createAgent } from "./orchestratorClient";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ActivityEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp: number;
}

interface AgentRunContextValue {
  messages: ChatMessage[];
  events: ActivityEvent[];
  running: boolean;
  sendMessage: (text: string) => Promise<void>;
}

const AgentRunContext = createContext<AgentRunContextValue | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

export function AgentRunProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [running, setRunning] = useState(false);

  const threadId = useMemo(() => newId(), []);
  const agentRef = useRef(createAgent(threadId));

  function pushEvent(label: string, detail?: string) {
    setEvents((prev) => [...prev, { id: newId(), label, detail, timestamp: Date.now() }]);
  }

  async function sendMessage(text: string) {
    const agent = agentRef.current;
    const userMessageId = newId();
    setMessages((prev) => [...prev, { id: userMessageId, role: "user", content: text }]);
    setEvents([]);
    setRunning(true);

    let assistantMessageId: string | null = null;

    const subscription = agent.subscribe({
      onRunStartedEvent: () => {
        pushEvent("Execução iniciada");
      },
      onStepStartedEvent: ({ event }) => {
        pushEvent(`Etapa: ${event.stepName}`, "iniciada");
      },
      onStepFinishedEvent: ({ event }) => {
        pushEvent(`Etapa: ${event.stepName}`, "concluída");
      },
      onToolCallStartEvent: ({ event }) => {
        pushEvent(`Chamando agente: ${event.toolCallName}`);
      },
      onToolCallResultEvent: ({ event }) => {
        pushEvent(`Resultado de: ${event.toolCallId}`, event.content);
      },
      onTextMessageStartEvent: ({ event }) => {
        assistantMessageId = event.messageId;
        setMessages((prev) => [...prev, { id: event.messageId, role: "assistant", content: "" }]);
      },
      onTextMessageContentEvent: ({ event }) => {
        const id = assistantMessageId ?? event.messageId;
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: m.content + event.delta } : m)));
      },
      onRunFinishedEvent: () => {
        pushEvent("Execução concluída");
      },
      onRunErrorEvent: ({ event }) => {
        pushEvent("Erro na execução", event.message);
      },
    });

    try {
      agent.addMessage({ id: userMessageId, role: "user", content: text });
      await agent.runAgent();
    } catch (err) {
      if (String(err).includes("401")) {
        forceLogout();
      }
      throw err;
    } finally {
      subscription.unsubscribe();
      setRunning(false);
    }
  }

  const value: AgentRunContextValue = { messages, events, running, sendMessage };

  return <AgentRunContext.Provider value={value}>{children}</AgentRunContext.Provider>;
}

export function useAgentRun(): AgentRunContextValue {
  const ctx = useContext(AgentRunContext);
  if (!ctx) {
    throw new Error("useAgentRun must be used within an AgentRunProvider");
  }
  return ctx;
}
