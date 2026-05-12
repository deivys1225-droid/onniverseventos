import { useState } from "react";
import { FUNDING, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import { isPayPalConfigured, PAYPAL_USING_SANDBOX_TEST_CLIENT } from "@/config/payments";
import { useAuth } from "@/hooks/useAuth";
import { notifyN8nPaymentSuccess } from "@/lib/n8n";
import { addVaultItem, type VaultItemType } from "@/lib/vaultItems";

type PayPalSmartButtonProps = {
  priceUsd: number;
  description: string;
  eventId: string;
  vaultType: VaultItemType;
  vaultTitle: string;
  vaultThumbnailUrl?: string | null;
  onPurchaseComplete?: () => void;
  notifySource?: string;
  productCategoryId?: string;
  productCategoryLabel?: string;
  productTitle?: string;
  skinRarity?: string;
};

const PayPalSmartButtonConfigured = ({
  priceUsd,
  description,
  eventId,
  vaultType,
  vaultTitle,
  vaultThumbnailUrl,
  onPurchaseComplete,
  notifySource = "store",
  productCategoryId,
  productCategoryLabel,
  productTitle,
  skinRarity,
}: PayPalSmartButtonProps) => {
  const { user } = useAuth();
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();
  const [successOpen, setSuccessOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(false);

  const value = priceUsd.toFixed(2);

  const afterCapture = async (orderId: string) => {
    onPurchaseComplete?.();
    setCompleted(true);
    setSuccessOpen(true);
    setWorking(true);
    try {
      try {
        await notifyN8nPaymentSuccess({
          source: notifySource,
          amount: value,
          currency: "USD",
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          eventId,
          paypalOrderId: orderId,
          at: new Date().toISOString(),
          productCategoryId,
          productCategoryLabel,
          productTitle: productTitle ?? vaultTitle,
          skinRarity,
          delivery: "digital",
        });
      } catch (error) {
        console.error("n8n payment notification:", error);
        toast.error("Pago recibido; no pudimos notificar a n8n. Contacta soporte si no recibes el producto.");
      }
      if (user?.id) {
        addVaultItem(user.id, {
          type: vaultType,
          title: vaultTitle,
          priceUsd,
          thumbnailUrl: vaultThumbnailUrl ?? null,
        });
      }
    } finally {
      setWorking(false);
    }
  };

  if (completed) {
    return null;
  }

  return (
    <div className="mt-2 w-full">
      {PAYPAL_USING_SANDBOX_TEST_CLIENT && (
        <p className="mb-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1.5 text-center text-[10px] text-cyan-100/90">
          Modo sandbox de prueba. Para cobros reales, configura VITE_PAYPAL_CLIENT_ID.
        </p>
      )}
      <PaymentSuccessModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="¡Pago recibido!"
        message="Tu compra con PayPal se confirmó. Ya puedes reproducir o abrir el contenido de esta tarjeta."
      />
      {working ? (
        <div className="flex min-h-12 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Confirmando…
        </div>
      ) : isPending ? (
        <div className="flex min-h-12 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Cargando PayPal…
        </div>
      ) : isRejected ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive-foreground">
          No se pudo cargar el botón de PayPal. Revisa el Client ID y el entorno (sandbox o producción).
        </p>
      ) : isResolved ? (
        <div className="paypal-buttons-host mx-auto flex w-full max-w-[280px] justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 shadow-[0_0_24px_-12px_rgba(255,196,57,0.85)] backdrop-blur-md">
          <div className="w-full min-h-[45px] [&_iframe]:mx-auto">
            <PayPalButtons
              fundingSource={FUNDING.PAYPAL}
              style={{
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "buynow",
                height: 45,
                tagline: false,
              }}
              createOrder={(_data, actions) =>
                actions.order.create({
                  intent: "CAPTURE",
                  purchase_units: [
                    {
                      amount: { currency_code: "USD", value },
                      description,
                    },
                  ],
                })
              }
              onApprove={async (_data, actions) => {
                if (!actions.order) return;
                const order = await actions.order.capture();
                await afterCapture(order.id ?? "");
              }}
              onError={(error) => {
                console.error("PayPal:", error);
                toast.error("Error en el pago con PayPal. Intenta de nuevo.");
              }}
              onCancel={() => toast.info("Pago cancelado")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PayPalSmartButton = (props: PayPalSmartButtonProps) => {
  if (!isPayPalConfigured) {
    return (
      <p className="mt-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-100/95">
        PayPal no está configurado para producción. Añade <code className="text-[11px]">VITE_PAYPAL_CLIENT_ID</code> y
        vuelve a compilar la app.
      </p>
    );
  }

  return <PayPalSmartButtonConfigured {...props} />;
};

export default PayPalSmartButton;
