import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, Mail, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import keystateLogoImage from "@/assets/keystate-logo.png";

const ThankYou = () => {
  const navigate = useNavigate();
  const orderNumber = "KS-" + Math.random().toString(36).substr(2, 9).toUpperCase();

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
              Thank you for your order
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border">
              <span className="text-sm text-muted-foreground">Order:</span>
              <span className="font-heading font-semibold">{orderNumber}</span>
            </div>
          </div>

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
                    You'll receive an order confirmation email shortly with all the details
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
                    Your keyrings will be prepared and shipped within 2-3 business days
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
              Place Another Order
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
