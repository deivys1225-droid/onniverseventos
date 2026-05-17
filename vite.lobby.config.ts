import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

/** Build mínimo: solo lobby 3D (NeonRoom + Tierra/Luna). Salida en dist-lobby-earth/. */
export default defineConfig({
  base: "/lobby-inmersivo/",
  /** No volcar toda public/ (vídeos, avatares): las texturas Tierra/Luna las copia sync-android-lobby-earth.ps1 */
  publicDir: false,
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    outDir: "dist-lobby-earth",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "lobby.html"),
    },
  },
});
