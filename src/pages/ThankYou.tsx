import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, Mail, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ThankYou = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            KEYSTATE
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Order Confirmed!
          </h1>
          <p className="text-xl text-muted-foreground">
            Thank you for your order
          </p>
        </div>

        <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95 animate-fade-in mb-8">
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
            className="min-w-[200px]"
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
      </main>
    </div>
  );
};

export default ThankYou;
