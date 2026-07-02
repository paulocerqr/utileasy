import { useEffect, useState } from "react";

import "./styles.css";


const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [health, setHealth] = useState({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/api/health/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setHealth({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setHealth({ loading: false, data: null, error: error.message });
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <section className="status-panel" aria-labelledby="page-title">
        <p className="eyebrow">Django REST Framework + React + PostgreSQL</p>
        <h1 id="page-title">UtilityDev</h1>
        <p className="description">
          Stack inicial em containers, com backend Django expondo uma API e
          frontend React consumindo o endpoint de saude.
        </p>

        <div className="status-grid">
          <div>
            <span className="label">Backend</span>
            <strong>
              {health.loading
                ? "Verificando"
                : health.error
                  ? "Indisponivel"
                  : "Online"}
            </strong>
          </div>
          <div>
            <span className="label">Endpoint</span>
            <code>/api/health/</code>
          </div>
          <div>
            <span className="label">Resposta</span>
            <code>
              {health.data
                ? JSON.stringify(health.data)
                : health.error || "Aguardando"}
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
