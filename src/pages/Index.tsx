import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StepProgress } from "@/components/StepProgress";
import { OrderSummary } from "@/components/OrderSummary";
import { KeyringTypeCard } from "@/components/KeyringTypeCard";
import { cn } from "@/lib/utils";
import keystateLogoImage from "@/assets/keystate-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    keyringType: "",
    color: "",
    quantity: 25,
    customQuantity: "",
    paymentMode: "one-off" as "one-off" | "subscription",
    promoCode: "",
  });

  const steps = ["Contact", "Keyring Style", "Quantity", "Payment", "Review"];

  const keyringTypes = [
    { id: "classic-round", label: "Classic Round", description: "Timeless design" },
    { id: "classic-square", label: "Classic Square", description: "Modern look" },
    { id: "premium-round", label: "Premium Round", description: "Enhanced quality" },
    { id: "premium-square", label: "Premium Square", description: "Superior finish" },
    { id: "luxury-house", label: "Luxury House", description: "Exclusive shape" },
  ];

  const colors = [
    { id: "silver", label: "Silver" },
    { id: "gold", label: "Gold" },
    { id: "rose-gold", label: "Rose Gold" },
    { id: "black", label: "Black" },
    { id: "blue", label: "Blue" },
  ];

  const quantities = [
    { id: 10, label: "10 units" },
    { id: 25, label: "25 units" },
    { id: 50, label: "50 units" },
    { id: 100, label: "100 units" },
    { id: 250, label: "250 units" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.company) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required contact fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.keyringType || !formData.color || !formData.quantity) {
      toast({
        title: "Incomplete Order",
        description: "Please complete all keyring details",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Order Submitted!",
      description: "Redirecting to payment...",
    });

    setTimeout(() => {
      navigate("/thank-you");
    }, 1500);
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 0:
        return !!(formData.name && formData.email && formData.company);
      case 1:
        return !!(formData.keyringType && formData.color);
      case 2:
        return !!formData.quantity;
      case 3:
        return true; // Payment mode has default
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={keystateLogoImage} alt="KEYSTATE Logo" className="h-12 w-auto" />
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")} className="rounded-xl">
            Admin
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-3 text-foreground">
            Order Premium Keyrings
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Complete your order from your sample. Professional quality, fast delivery.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 max-w-6xl mx-auto">
          {/* Main Form */}
          <div className="space-y-6">
            {/* Step Progress */}
            <StepProgress steps={steps} currentStep={currentStep} />

            <Card className="shadow-elegant rounded-2xl border-border/50 backdrop-blur-sm bg-card animate-scale-in">
              <CardHeader className="pb-6">
                <CardTitle className="font-heading text-2xl">Order Details</CardTitle>
                <CardDescription className="text-base">
                  Fill in your information to complete your keyring order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Step 1: Contact Information */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-heading font-semibold">
                        1
                      </span>
                      <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground">
                        Contact Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          placeholder="John Smith"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@agency.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-medium">
                          Company *
                        </Label>
                        <Input
                          id="company"
                          placeholder="Premier Estate Agents"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({ ...formData, company: e.target.value })
                          }
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+44 7700 900000"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="h-12 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Keyring Type */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-heading font-semibold">
                        2
                      </span>
                      <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground">
                        Keyring Style
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {keyringTypes.map((type) => (
                        <KeyringTypeCard
                          key={type.id}
                          id={type.id}
                          label={type.label}
                          description={type.description}
                          selected={formData.keyringType === type.id}
                          quantity={formData.quantity}
                          onToggle={() =>
                            setFormData({ ...formData, keyringType: type.id })
                          }
                          onQuantityChange={(quantity) =>
                            setFormData({ ...formData, quantity })
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Step 2b: Colour Selection */}
                  {formData.keyringType && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-heading font-semibold">
                          2b
                        </span>
                        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground">
                          Choose Colour
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {colors.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: color.id })}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105",
                              formData.color === color.id
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border bg-card hover:border-primary/40"
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full border-2",
                                color.id === "silver" && "bg-gray-300 border-gray-400",
                                color.id === "gold" && "bg-yellow-400 border-yellow-500",
                                color.id === "rose-gold" && "bg-rose-300 border-rose-400",
                                color.id === "black" && "bg-gray-900 border-gray-800",
                                color.id === "blue" && "bg-blue-500 border-blue-600"
                              )}
                            />
                            <span className="text-xs font-medium text-center">{color.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Quantity */}
                  {formData.keyringType && formData.color && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-heading font-semibold">
                          3
                        </span>
                        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground">
                          Select Quantity
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {quantities.map((qty) => (
                          <button
                            key={qty.id}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, quantity: qty.id })
                            }
                            className={cn(
                              "p-5 rounded-xl border-2 transition-all hover:scale-105 font-medium",
                              formData.quantity === qty.id
                                ? "border-primary bg-primary/5 shadow-md text-foreground"
                                : "border-border bg-card hover:border-primary/40 text-foreground"
                            )}
                          >
                            {qty.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Payment Mode */}
                  {isStepComplete(2) && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-heading font-semibold">
                          4
                        </span>
                        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground">
                          Payment Options
                        </h3>
                      </div>
                      <RadioGroup
                        value={formData.paymentMode}
                        onValueChange={(value) =>
                          setFormData({ ...formData, paymentMode: value as "one-off" | "subscription" })
                        }
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-3 border-2 border-border rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md">
                          <RadioGroupItem value="one-off" id="one-off" />
                          <Label htmlFor="one-off" className="flex-1 cursor-pointer">
                            <div className="font-heading font-semibold text-base">One-off Purchase</div>
                            <div className="text-sm text-muted-foreground">Single payment for this order</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 border-2 border-border rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md">
                          <RadioGroupItem value="subscription" id="subscription" />
                          <Label htmlFor="subscription" className="flex-1 cursor-pointer">
                            <div className="font-heading font-semibold text-base">Subscription</div>
                            <div className="text-sm text-muted-foreground">Regular delivery of keyrings</div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Step 5: Review & Promo Code */}
                  {isStepComplete(3) && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-heading font-semibold">
                          5
                        </span>
                        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-foreground">
                          Review & Checkout
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promoCode" className="text-sm font-medium">
                          Promo Code (Optional)
                        </Label>
                        <Input
                          id="promoCode"
                          placeholder="Enter promo code"
                          value={formData.promoCode}
                          onChange={(e) =>
                            setFormData({ ...formData, promoCode: e.target.value })
                          }
                          className="h-12 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isStepComplete(0) || !isStepComplete(1) || !isStepComplete(2)}
                    className="w-full h-14 text-base font-heading font-semibold rounded-xl shadow-glow hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Continue to Payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="hidden lg:block">
            <OrderSummary
              items={formData.keyringType ? [{ label: formData.keyringType, description: formData.color, quantity: formData.quantity }] : []}
              paymentMode={formData.paymentMode}
            />
          </aside>
        </div>

        {/* Mobile Order Summary */}
        <div className="lg:hidden mt-8 max-w-6xl mx-auto">
          <OrderSummary
            items={formData.keyringType ? [{ label: formData.keyringType, description: formData.color, quantity: formData.quantity }] : []}
            paymentMode={formData.paymentMode}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
