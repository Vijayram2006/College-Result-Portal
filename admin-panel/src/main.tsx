import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ServerWakeBanner, wakeServer } from "./components/ServerWake";

// Start the hosted server as soon as the panel opens (it sleeps when idle on the free plan)
wakeServer();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ServerWakeBanner />
  </React.StrictMode>
);
