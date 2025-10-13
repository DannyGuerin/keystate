import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, Mail, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import keystateLogoImage from "@/assets/keystate-logo.png";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  quantity: number;
  shipping_name?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  keyring_variants?: {
    type: string;
    color: string;
  };
  campaigns?: {
    company_name: string;
  };
}

const ThankYou = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId },
      });

      if (error) throw error;

      if (data?.order) {
        setOrder(data.order);
        toast({
          title: "Payment successful!",
          description: "Your order has been confirmed",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Unable to verify payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const orderNumber = order?.id 
    ? `KS-${order.id.substring(0, 8).toUpperCase()}`
    : "KS-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <img src={keystateLogoImage} alt="KEYSTATE Logo" className="h-8 w-auto" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-heading font-bold mb-3 text-foreground">
              Order Confirmed!
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Thank you for your order{order?.customer_name ? `, ${order.customer_name}` : ''}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border">
              <span className="text-sm text-muted-foreground">Order:</span>
              <span className="font-heading font-semibold">{orderNumber}</span>
            </div>
          </div>

          {order?.shipping_name && (
            <Card className="shadow-elegant rounded-2xl border-border/50 bg-card animate-scale-in mb-6">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Shipping Address</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{order.shipping_name}</p>
                  <p>{order.shipping_address_line1}</p>
                  {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                  <p>
                    {order.shipping_city}
                    {order.shipping_postal_code && `, ${order.shipping_postal_code}`}
                  </p>
                  <p className="uppercase">{order.shipping_country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-elegant rounded-2xl border-border/50 bg-card animate-scale-in mb-8">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center pb-6 border-b border-border/50">
                <h2 className="text-2xl font-semibold mb-2">What happens next?</h2>
                <p className="text-muted-foreground">
                  We'll get your order processed and shipped as soon as possible
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Confirmation Email</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an order confirmation email at{" "}
                      <span className="font-medium text-foreground">
                        {order?.customer_email || "your email address"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Order Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      Your {order?.quantity || ""} keyrings will be prepared and shipped within 2-3 business days
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Delivery</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your order via email and expect delivery within 5-7 business days
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="min-w-[200px] rounded-xl"
            >
              Back to Home
            </Button>
            <p className="text-sm text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:hello@keystate.com" className="text-primary hover:underline">
                hello@keystate.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ThankYou;