import { useState } from "react";
import "./App.css";
import { clearToken, getToken } from "./lib/auth";
import { AgentRunProvider } from "./lib/AgentRunContext";
import { AgentActivity } from "./views/AgentActivity";
import { Assistant } from "./views/Assistant";
import { Dashboard } from "./views/Dashboard";
import { Login } from "./views/Login";

function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <AgentRunProvider>
      <div className="app">
        <header>
          <h1>Smart Home AI</h1>
          <button
            className="logout"
            onClick={() => {
              clearToken();
              setAuthed(false);
            }}
          >
            Sair
          </button>
        </header>
        <main>
          <Dashboard />
          <section className="card activity-card">
            <h2>Agent Activity</h2>
            <AgentActivity />
          </section>
        </main>
        <div className="floating-chat">
          <Assistant />
        </div>
      </div>
    </AgentRunProvider>
  );
}

export default App;
