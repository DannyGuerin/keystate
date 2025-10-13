import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { KeyringTypeCard } from "@/components/KeyringTypeCard";
import { StepProgress } from "@/components/StepProgress";
import { OrderSummary } from "@/components/OrderSummary";
import { Loader2 } from "lucide-react";

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
  const [quantity, setQuantity] = useState("100");
  const [paymentMode, setPaymentMode] = useState<"one-off" | "subscription">("one-off");
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

    const { error } = await supabase.from("orders").insert({
      campaign_id: campaign.id,
      keyring_variant_id: selectedVariant,
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      quantity: parseInt(quantity),
      payment_mode: paymentMode,
      promo_code: promoCode || null,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Order failed",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: "Order placed!",
      description: "We'll be in touch shortly",
    });

    navigate("/thank-you");
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
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Select value={quantity} onValueChange={setQuantity}>
                        <SelectTrigger id="quantity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50 keyrings</SelectItem>
                          <SelectItem value="100">100 keyrings</SelectItem>
                          <SelectItem value="250">250 keyrings</SelectItem>
                          <SelectItem value="500">500 keyrings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMode">Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                        <SelectTrigger id="paymentMode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-off">One-off Payment</SelectItem>
                          <SelectItem value="subscription">Monthly Subscription</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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
                    <Button onClick={() => setStep(3)} className="w-full">
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
                    {submitting ? "Placing Order..." : "Place Order"}
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
                customQuantity: "",
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
