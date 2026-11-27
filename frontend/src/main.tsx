import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SnapshotProvider } from "./context/SnapshotContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SnapshotProvider>
        <App />
      </SnapshotProvider>
    </BrowserRouter>
  </StrictMode>,
);
