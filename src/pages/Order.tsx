import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyringTypeCard } from "@/components/KeyringTypeCard";
import { StepProgress } from "@/components/StepProgress";
import { OrderSummary } from "@/components/OrderSummary";
import { Loader2 } from "lucide-react";
import { PRICING_CONFIG, getPricingTier, formatPrice } from "@/config/pricing";

interface Campaign {
  id: string;
  company_name: string;
  company_address: string | null;
  company_postcode: string | null;
  status: string;
}

interface KeyringVariant {
  id: string;
  type: string;
  color: string;
  image_url: string | null;
  is_available: boolean;
}

const Order = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [variants, setVariants] = useState<KeyringVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [step, setStep] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(25);
  const [paymentMode, setPaymentMode] = useState<"one-off" | "subscription">("subscription");
  const [promoCode, setPromoCode] = useState("");

  useEffect(() => {
    if (code) {
      fetchCampaign();
    }
  }, [code]);

  const fetchCampaign = async () => {
    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("unique_code", code)
      .eq("status", "active")
      .single();

    if (campaignError || !campaignData) {
      toast({
        title: "Campaign not found",
        description: "This campaign link is invalid or inactive",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setCampaign(campaignData);

    const { data: variantsData } = await supabase
      .from("keyring_variants")
      .select("*")
      .eq("campaign_id", campaignData.id)
      .eq("is_available", true)
      .order("sort_order");

    setVariants(variantsData || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!campaign || !selectedVariant || !name || !email || !quantity) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    // Get the appropriate Stripe Price ID
    const pricingTier = getPricingTier(quantity, paymentMode);
    if (!pricingTier) {
      toast({
        title: "Invalid selection",
        description: "Please select a valid quantity",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Create draft order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([{
        campaign_id: campaign.id,
        keyring_variant_id: selectedVariant,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        quantity: quantity,
        payment_mode: paymentMode,
        promo_code: promoCode || null,
        status: "pending_payment" as const,
      }])
      .select()
      .single();

    if (orderError || !orderData) {
      toast({
        title: "Order creation failed",
        description: orderError?.message || "Unable to create order",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Create Stripe checkout session
    const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
      "create-checkout",
      {
        body: {
          orderId: orderData.id,
          paymentMode: paymentMode,
          priceId: pricingTier.priceId,
        },
      }
    );

    if (checkoutError || !checkoutData?.url) {
      toast({
        title: "Checkout failed",
        description: checkoutError?.message || "Unable to create checkout session",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = checkoutData.url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-heading font-bold mb-2">Campaign Not Found</h2>
            <p className="text-muted-foreground">This campaign link is invalid or inactive.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedVariantData = variants.find(v => v.id === selectedVariant);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            <img 
              src="/src/assets/keystate-logo.png" 
              alt="KEYSTATE" 
              className="h-8"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <StepProgress 
          steps={["Select Keyring", "Order Details", "Contact Info"]}
          currentStep={step - 1}
        />

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Info Banner */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h2 className="text-xl font-heading font-bold mb-2">
                  Order for {campaign.company_name}
                </h2>
                {campaign.company_address && (
                  <p className="text-sm text-muted-foreground">
                    {campaign.company_address}
                    {campaign.company_postcode && `, ${campaign.company_postcode}`}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Step 1: Keyring Selection */}
            {step >= 1 && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-heading font-semibold mb-4">
                      Select Your Keyring
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {variants.map((variant) => (
                        <KeyringTypeCard
                          key={variant.id}
                          id={variant.id}
                          label={variant.type}
                          description={variant.color}
                          selected={selectedVariant === variant.id}
                          onSelect={() => {
                            setSelectedVariant(variant.id);
                            if (step === 1) setStep(2);
                          }}
                        />
                      ))}
                    </div>
                    {selectedVariantData?.image_url && (
                      <div className="mt-4">
                        <img
                          src={selectedVariantData.image_url}
                          alt={selectedVariantData.type}
                          className="h-48 w-auto mx-auto rounded-lg shadow-md"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Quantity & Payment */}
            {step >= 2 && (
              <Card className="animate-fade-in">
                <CardContent className="pt-6 space-y-6">
                  <h3 className="text-lg font-heading font-semibold">Order Details</h3>
                  
                  {/* Payment Mode Toggle */}
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={paymentMode === "subscription" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setPaymentMode("subscription")}
                      >
                        Monthly Subscription
                        {paymentMode === "subscription" && (
                          <Badge className="ml-2 bg-white text-primary">Recommended</Badge>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMode === "one-off" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setPaymentMode("one-off")}
                      >
                        One-Off Purchase
                      </Button>
                    </div>
                  </div>

                  {/* Quantity Selection - Radio Button Grid */}
                  <div className="space-y-3">
                    <Label>Select Quantity</Label>
                    <RadioGroup
                      value={quantity.toString()}
                      onValueChange={(value) => setQuantity(parseInt(value))}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      {(paymentMode === "subscription" 
                        ? PRICING_CONFIG.subscription 
                        : PRICING_CONFIG.oneOff
                      ).map((tier) => {
                        const isSelected = quantity === tier.quantity;
                        
                        return (
                          <label
                            key={tier.quantity}
                            htmlFor={`quantity-${tier.quantity}`}
                            className={`
                              relative flex cursor-pointer rounded-lg border-2 p-4 transition-all
                              ${isSelected 
                                ? 'border-primary bg-primary/5 shadow-md' 
                                : 'border-border hover:border-primary/50 hover:bg-accent/30'
                              }
                            `}
                          >
                            <RadioGroupItem
                              value={tier.quantity.toString()}
                              id={`quantity-${tier.quantity}`}
                              className="sr-only"
                            />
                            
                            <div className="flex-1 space-y-1">
                              {/* Quantity Heading */}
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-base">
                                  {tier.quantity} {paymentMode === "subscription" ? "per month" : "units"}
                                </span>
                                {tier.isPopular && (
                                  <Badge variant="secondary" className="text-xs">
                                    POPULAR
                                  </Badge>
                                )}
                                {tier.isBestValue && (
                                  <Badge variant="default" className="text-xs">
                                    BEST VALUE
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Pricing Display */}
                              <div className="text-sm">
                                <span className="font-bold text-lg">
                                  {formatPrice(tier.total)}
                                </span>
                                {paymentMode === "subscription" && (
                                  <span className="text-muted-foreground">/mo</span>
                                )}
                              </div>
                              
                              {/* Unit Price */}
                              <div className="text-xs text-muted-foreground">
                                {formatPrice(tier.unitPrice)} per keyring
                              </div>
                              
                              {/* Savings Badge (only if discount > 0) */}
                              {tier.discount && tier.discount > 0 && (
                                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                                  Save {tier.discount}% vs one-off
                                </div>
                              )}
                            </div>
                            
                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <svg
                                    className="h-3 w-3 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 12 12"
                                  >
                                    <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  {/* Promo Code (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                    <Input
                      id="promoCode"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                    />
                  </div>

                  {step === 2 && (
                    <Button onClick={() => setStep(3)} className="w-full" size="lg">
                      Continue to Contact Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Contact Information */}
            {step >= 3 && (
              <Card className="animate-fade-in">
                <CardContent className="pt-6 space-y-6">
                  <h3 className="text-lg font-heading font-semibold">Your Details</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+44 7XXX XXXXXX"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full" 
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Proceed to Checkout"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:sticky lg:top-24 h-fit">
            <OrderSummary
              formData={{
                keyringType: selectedVariantData?.type || "",
                color: selectedVariantData?.color || "",
                quantity: quantity,
                paymentMode: paymentMode,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Order;
