import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  return {
  base: "./",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), paypalSdkHeadPlugin(mode, env)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
};
});
