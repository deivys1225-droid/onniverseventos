import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, Ticket, LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";
import LoginAuthModal from "@/components/LoginAuthModal";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import { notifyN8nPaymentSuccess } from "@/lib/n8n";
import { addVaultItem } from "@/lib/vaultItems";

interface TicketPaywallProps {
  price: number;
  eventId: string;
  requiresAuth?: boolean;
}

const TicketPaywall = ({ price, eventId, requiresAuth }: TicketPaywallProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(!!requiresAuth);
  const [successOpen, setSuccessOpen] = useState(false);

  const goToAuth = () => {
    setLoginModalOpen(false);
    navigate("/entrar");
  };

  const createTicket = async (paypalOrderId: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        user_id: user.id,
        event_id: eventId,
        status: "paid",
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya tienes un ticket para este evento");
        } else {
          throw error;
        }
        return;
      }

      try {
        await notifyN8nPaymentSuccess({
          source: "ticket",
          amount: price.toFixed(2),
          currency: "USD",
          userId: user.id,
          userEmail: user.email ?? null,
          eventId,
          paypalOrderId,
          at: new Date().toISOString(),
        });
      } catch (e) {
        console.error("n8n notification:", e);
      }

      addVaultItem(user.id, {
        type: "ticket",
        title: `Ticket - ${eventId}`,
        priceUsd: price,
      });

      setSuccessOpen(true);
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar el ticket. Contacta soporte.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm"
    >
      <LoginAuthModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onGoToAuth={goToAuth} />
      <PaymentSuccessModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        message="Tu pago con PayPal se confirmó. Ya registramos tu acceso al evento."
      />

      <div className="aspect-video w-full bg-gradient-to-br from-muted via-muted/80 to-primary/5 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />

        <div className="relative z-10 text-center px-6 max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6"
          >
            <Lock className="w-7 h-7 text-primary" />
          </motion.div>

          <h3 className="font-display text-2xl font-bold text-foreground mb-2">Contenido exclusivo</h3>
          <p className="text-muted-foreground mb-6">
            {requiresAuth
              ? "Inicia sesión y compra tu ticket para acceder a esta transmisión en vivo"
              : "Compra tu ticket para desbloquear esta transmisión en vivo"}
          </p>

          <div className="bg-muted/50 border border-border/40 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Ticket de acceso</span>
              </div>
              <span className="font-display text-2xl font-bold text-foreground">${price.toFixed(2)}</span>
            </div>
          </div>

          {requiresAuth ? (
            <Button
              variant="hero"
              size="lg"
              className="w-full gap-2"
              onClick={() => setLoginModalOpen(true)}
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </Button>
          ) : processing ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Procesando pago...</span>
            </div>
          ) : (
            <div className="w-full">
              <PayPalButtons
                style={{
                  layout: "vertical",
                  color: "gold",
                  shape: "rect",
                  label: "pay",
                  height: 45,
                }}
                createOrder={(_data, actions) => {
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          currency_code: "USD",
                          value: price.toFixed(2),
                        },
                        description: `Ticket de acceso - Evento ${eventId}`,
                      },
                    ],
                  });
                }}
                onApprove={async (_data, actions) => {
                  if (!actions.order) return;
                  const order = await actions.order.capture();
                  const orderId = order.id ?? "";
                  await createTicket(orderId);
                }}
                onError={(err) => {
                  console.error("PayPal error:", err);
                  toast.error("Error en el pago con PayPal. Intenta de nuevo.");
                }}
                onCancel={() => {
                  toast.info("Pago cancelado");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TicketPaywall;
