import { wakeServer } from "./components/ServerWake";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Start the hosted server as soon as the portal opens (it sleeps when idle on the free plan)
wakeServer();

createRoot(document.getElementById("root")!).render(<App />);
