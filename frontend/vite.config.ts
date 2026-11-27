import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev, requests to /api are forwarded to the FastAPI server (Docker publishes it on 8001).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8001" } },
  build: { chunkSizeWarningLimit: 1000 }, // recharts is large; fine for an intranet app
});
