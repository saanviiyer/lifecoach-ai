import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend (Express + ws) runs on PORT (default 3001).
// In dev, Vite serves the client on 5173 and proxies API + WebSocket to the backend.
const BACKEND_PORT = process.env.PORT || "3001";
const backend = `http://localhost:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: backend, changeOrigin: true },
      "/ws": { target: backend, ws: true, changeOrigin: true },
    },
  },
});
