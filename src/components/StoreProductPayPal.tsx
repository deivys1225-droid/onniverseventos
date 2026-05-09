import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "@/hooks/useAuth";
import LoginAuthModal from "@/components/LoginAuthModal";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import { notifyN8nPaymentSuccess } from "@/lib/n8n";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addVaultItem, type VaultItemType } from "@/lib/vaultItems";

type StoreProductPayPalProps = {
  categoryId: string;
  categoryTitle: string;
  productTitle: string;
  priceUsd: number;
  skinRarity?: string;
  productImage?: string;
};

const StoreProductPayPal = ({
  categoryId,
  categoryTitle,
  productTitle,
  priceUsd,
  skinRarity,
  productImage,
}: StoreProductPayPalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(false);

  const value = priceUsd.toFixed(2);
  const sku = `store:${categoryId}:${encodeURIComponent(productTitle)}`;
  const vaultType: VaultItemType =
    categoryId === "biblioteca"
      ? "biblioteca"
      : categoryId === "cursos"
        ? "cursos"
        : categoryId === "tickets"
          ? "ticket"
          : "skin";

  const afterCapture = async (orderId: string) => {
    setWorking(true);
    try {
      try {
        await notifyN8nPaymentSuccess({
          source: "store",
          amount: value,
          currency: "USD",
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          eventId: sku,
          paypalOrderId: orderId,
          at: new Date().toISOString(),
          productCategoryId: categoryId,
          productCategoryLabel: categoryTitle,
          productTitle,
          skinRarity,
          delivery: "digital",
        });
      } catch (e) {
        console.error("n8n store notification:", e);
        toast.error("Pago recibido; no pudimos notificar a n8n. Contacta soporte si no recibes el producto.");
      }
      if (user?.id) {
        addVaultItem(user.id, {
          type: vaultType,
          title: productTitle,
          priceUsd,
          thumbnailUrl: productImage ?? null,
        });
      }
      setCompleted(true);
      setSuccessOpen(true);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="w-full min-h-[48px] mt-3">
      <LoginAuthModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onGoToAuth={() => {
          setLoginOpen(false);
          navigate("/entrar");
        }}
      />
      <PaymentSuccessModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        title="¡Pago recibido!"
        message="Tu compra con PayPal se confirmó. Recibirás el acceso a tu producto (entrega inmediata vía n8n) en breve; revisa el correo asociado a la cuenta."
      />
      {working && (
        <div className="flex items-center justify-center gap-2 min-h-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Confirmando…
        </div>
      )}
      {!working && !completed && !user && (
        <Button
          type="button"
          className="w-full min-h-12 text-base font-semibold touch-manipulation"
          size="lg"
          variant="hero"
          onClick={() => setLoginOpen(true)}
        >
          <LogIn className="h-4 w-4" />
          Iniciar sesión para pagar
        </Button>
      )}
      {!working && !completed && user && (
        <div className="w-full min-h-12">
          <PayPalButtons
            style={{
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "buynow",
              height: 50,
            }}
            createOrder={(_data, actions) =>
              actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: { currency_code: "USD", value },
                    description: `OnniVerso — ${categoryTitle} — ${productTitle}`.slice(0, 120),
                  },
                ],
              })
            }
            onApprove={async (_data, actions) => {
              if (!actions.order) return;
              const order = await actions.order.capture();
              await afterCapture(order.id ?? "");
            }}
            onError={(err) => {
              console.error("PayPal (tienda):", err);
              toast.error("Error en el pago con PayPal. Intenta de nuevo.");
            }}
            onCancel={() => toast.info("Pago cancelado")}
          />
        </div>
      )}
    </div>
  );
};

export default StoreProductPayPal;
