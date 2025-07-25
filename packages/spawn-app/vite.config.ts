import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["vite.tunnel.karolisram.com"],
    cors: {
      origin: "*",
      credentials: false,
    },
  },
});
