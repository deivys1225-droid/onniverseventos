import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { onniChatDevPlugin } from "./vite/onniChatDevPlugin";

function paypalSdkHeadPlugin(mode: string, env: Record<string, string>): Plugin {
  const environment = env.VITE_PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";
  // Offline-first / Capacitor: NO inyectar el SDK de PayPal en <head> si no hay un client-id real.
  // El fallback antiguo ("test") forzaba una petición eager a sandbox.paypal.com en cada arranque,
  // lo cual rompía el boot sin red. `PayPalScriptProvider` ya carga el SDK *lazy* cuando el usuario
  // entra a una pantalla con botones PayPal, así que el preload solo aporta en builds con PayPal real.
  const envClientId = (env.VITE_PAYPAL_CLIENT_ID ?? "").trim();
  const sdkHost =
    environment === "sandbox" ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";

  return {
    name: "paypal-sdk-head",
    transformIndexHtml(html) {
      if (!envClientId) return html;
      const sdkUrl = `${sdkHost}/sdk/js?client-id=${encodeURIComponent(envClientId)}&currency=USD&intent=capture&components=buttons`;
      return html.replace(
        "</head>",
        `  <script defer src="${sdkUrl}" data-sdk-integration-source="react-paypal-js"></script>\n</head>`,
      );
    },
  };
}

// https://vitejs.dev/config/
// base relativo: obligatorio para que assets carguen en WebView (file://) con Capacitor.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devChatEnv: Record<string, string> = {
    OPENAI_API_KEY: env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || "",
    GEMINI_API_KEY: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "",
    OPENAI_MODEL: env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || "",
    GEMINI_MODEL: env.GEMINI_MODEL || "",
    OLLAMA_ENABLED: env.OLLAMA_ENABLED || env.VITE_OLLAMA_ENABLED || "",
    OLLAMA_ONLY: env.OLLAMA_ONLY || env.VITE_OLLAMA_ONLY || "",
    OLLAMA_HOST: env.OLLAMA_HOST || env.VITE_OLLAMA_HOST || "",
    OLLAMA_MODEL: env.OLLAMA_MODEL || env.VITE_OLLAMA_MODEL || "",
    GOOGLE_CSE_API_KEY: env.GOOGLE_CSE_API_KEY || env.VITE_GOOGLE_CSE_API_KEY || "",
    GOOGLE_CSE_CX: env.GOOGLE_CSE_CX || env.VITE_GOOGLE_CSE_CX || "",
  };
  return {
  base: "./",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 5173,
    watch: {
      ignored: [
        "**/android/**",
        "**/ANDROID_LOBBY_TIERRA_LISTO/**",
        "**/dist-lobby-earth/**",
      ],
    },
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/mux": {
        target: "http://localhost:8787",
        changeOrigin: true,
        ws: true,
      },
      "/api/azure": {
        target: "https://onnivers.com",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), paypalSdkHeadPlugin(mode, env), onniChatDevPlugin(devChatEnv)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
};
});
