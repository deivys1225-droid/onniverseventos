const envClientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? "").trim();

export const PAYPAL_ENVIRONMENT: "production" | "sandbox" =
  import.meta.env.VITE_PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";

/** PayPal REST app client id (public in the browser). */
export const PAYPAL_CLIENT_ID =
  envClientId || (PAYPAL_ENVIRONMENT === "sandbox" ? "test" : "");

export const isPayPalConfigured = PAYPAL_CLIENT_ID.length > 0;

export const PAYPAL_USING_SANDBOX_TEST_CLIENT =
  !envClientId && PAYPAL_ENVIRONMENT === "sandbox" && PAYPAL_CLIENT_ID === "test";

export const PAYPAL_SDK_BASE_URL =
  PAYPAL_ENVIRONMENT === "sandbox"
    ? "https://www.sandbox.paypal.com/sdk/js"
    : "https://www.paypal.com/sdk/js";

/** Set to your n8n workflow webhook URL, e.g. `https://tu-dominio.app.n8n.cloud/webhook/...` */
export const N8N_PAYMENT_WEBHOOK_URL =
  import.meta.env.VITE_N8N_PAYMENT_WEBHOOK ??
  "https://empresatecnologica.app.n8n.cloud/webhook-test/130b612a-4c61-40a1-ac26-dfe16f93b785";

export const paypalScriptOptions = {
  clientId: PAYPAL_CLIENT_ID,
  currency: "USD" as const,
  intent: "capture" as const,
  components: "buttons" as const,
  environment: PAYPAL_ENVIRONMENT,
  sdkBaseUrl: PAYPAL_SDK_BASE_URL,
};
