import { useAgentRun } from "../lib/AgentRunContext";

export function AgentActivity() {
  const { events } = useAgentRun();

  if (events.length === 0) {
    return <p className="notice">Nenhuma execução ainda. Envie uma mensagem no assistente.</p>;
  }

  return (
    <ul className="activity-timeline">
      {events.map((event) => (
        <li key={event.id}>
          <span className="activity-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
          <span className="activity-label">{event.label}</span>
          {event.detail && <span className="activity-detail">{event.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
