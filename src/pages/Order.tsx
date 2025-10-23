import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  logo_url: string | null;
  contact_person: string | null;
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
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<"one-off" | "subscription">("subscription");
  const [promoCode, setPromoCode] = useState("");
  
  // Shipping details state - pre-filled from campaign
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingPostcode, setShippingPostcode] = useState("");
  const [shippingContact, setShippingContact] = useState("");
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);

  useEffect(() => {
    if (code) {
      fetchCampaign();
    }
  }, [code]);

  // Auto-select when only one variant is available
  useEffect(() => {
    if (variants.length === 1 && Object.keys(selectedVariants).length === 0) {
      setSelectedVariants({ [variants[0].id]: 25 });
      if (step === 1) setStep(2);
    }
  }, [variants, selectedVariants, step]);

  const fetchCampaign = async () => {
    console.log("Fetching campaign with code:", code);
    
    // Use the secure database function that only exposes essential campaign data
    const { data: campaignData, error: campaignError } = await supabase
      .rpc("get_campaign_for_order", { campaign_code: code });

    console.log("Campaign RPC response:", { campaignData, campaignError });

    if (campaignError || !campaignData || campaignData.length === 0) {
      console.error("Campaign fetch error:", campaignError);
      toast({
        title: "Campaign not found",
        description: "This campaign link is invalid or inactive",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // The RPC function returns an array, so get the first item
    const campaign = campaignData[0];
    console.log("Campaign details:", campaign);
    setCampaign(campaign);
    
    // Pre-fill shipping details with campaign data
    setShippingName(campaign.company_name || "");
    setShippingAddress(campaign.company_address || "");
    setShippingPostcode(campaign.company_postcode || "");
    setShippingContact(campaign.contact_person || "");

    const { data: variantsData, error: variantsError } = await supabase
      .from("keyring_variants")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_available", true)
      .order("sort_order");

    console.log("Variants query response:", { variantsData, variantsError });
    setVariants(variantsData || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!campaign || Object.keys(selectedVariants).length === 0 || !name || !email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select at least one variant",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Build line items per selected variant based on individual quantities
      const entries = Object.entries(selectedVariants);
      const items = entries.map(([variantId, qty]) => {
        const tier = getPricingTier(qty, paymentMode);
        if (!tier) {
          throw new Error("INVALID_TIER");
        }
        return { variantId, quantity: qty, priceId: tier.priceId };
      });

      const totalQuantity = entries.reduce((sum, [, qty]) => sum + qty, 0);
      const firstVariantId = entries[0][0];

      console.log("Creating checkout session with (multi-variant):", {
        campaignId: campaign.id,
        firstVariantId,
        totalQuantity,
        paymentMode,
        items,
      });

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            campaignId: campaign.id,
            variantId: firstVariantId, // kept for order linkage
            customerName: name,
            customerEmail: email,
            customerPhone: phone || null,
            quantity: totalQuantity,
            paymentMode,
            promoCode: promoCode || null,
            items,
          },
        }
      );

      if (checkoutError) {
        console.error("Checkout error:", checkoutError);
        toast({
          title: "Checkout failed",
          description: checkoutError?.message || "Unable to create checkout session",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      if (!checkoutData?.url) {
        console.error("No checkout URL returned:", checkoutData);
        toast({
          title: "Checkout failed",
          description: "No checkout URL received from server",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      console.log("Redirecting to Stripe checkout:", checkoutData.url);
      
      // Show a loading toast
      toast({
        title: "Redirecting to checkout...",
        description: "Please wait while we redirect you to Stripe",
      });

      // Set a timeout to warn if redirect takes too long
      const timeoutId = setTimeout(() => {
        console.warn("Stripe checkout is taking longer than expected");
        toast({
          title: "Loading...",
          description: "If this takes too long, please check your connection",
          variant: "default",
        });
      }, 5000);

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.url;
      
      // Clear timeout if redirect happens quickly
      clearTimeout(timeoutId);
    } catch (error) {
      console.error("Unexpected error during checkout:", error);
      if (error instanceof Error && error.message === "INVALID_TIER") {
        toast({
          title: "Invalid selection",
          description: "Please select a valid quantity for each variant",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Checkout failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      setSubmitting(false);
    }
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

  // Get variants with quantities for OrderSummary
  const selectedVariantItems = Object.keys(selectedVariants).map(variantId => {
    const variant = variants.find(v => v.id === variantId);
    return variant ? {
      id: variant.id,
      type: variant.type,
      color: variant.color,
      quantity: selectedVariants[variantId]
    } : null;
  }).filter(Boolean) as Array<{id: string; type: string; color: string; quantity: number}>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Hero Section - Company Logo & Agent Details */}
        <div className="text-center mb-8 space-y-4">
          {campaign.logo_url && (
            <img 
              src={campaign.logo_url} 
              alt={campaign.company_name}
              className="h-20 w-auto object-contain mx-auto"
            />
          )}
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2">
              {campaign.company_name}
            </h1>
            {campaign.contact_person && (
              <p className="text-lg text-muted-foreground mb-1">
                Your Agent: {campaign.contact_person}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Customize your keyrings below
            </p>
          </div>
        </div>

        <StepProgress 
          steps={["Confirm Details", "Select Keyring", "Order Details"]}
          currentStep={step - 1}
        />

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Combined Details Form - Always visible at top */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-xl font-heading">Company & Contact Details</CardTitle>
                <CardDescription>Review and confirm the details below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Details Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Company Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shippingName">Company Name *</Label>
                    <Input
                      id="shippingName"
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="Company Name Ltd"
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress">Company Address *</Label>
                    <Input
                      id="shippingAddress"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="123 Main Street, City"
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingPostcode">Postcode *</Label>
                    <Input
                      id="shippingPostcode"
                      value={shippingPostcode}
                      onChange={(e) => setShippingPostcode(e.target.value)}
                      placeholder="SW1A 1AA"
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingContact">Contact Person *</Label>
                    <Input
                      id="shippingContact"
                      value={shippingContact}
                      onChange={(e) => setShippingContact(e.target.value)}
                      placeholder="John Doe"
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
                    />
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Contact Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
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
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
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
                      disabled={detailsConfirmed}
                      className={detailsConfirmed ? "bg-muted" : undefined}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {detailsConfirmed ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setDetailsConfirmed(false)}
                    >
                      Edit Details
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        if (!shippingName || !shippingAddress || !shippingPostcode || !shippingContact || !name || !email) {
                          toast({
                            title: "Missing information",
                            description: "Please fill in all required fields",
                            variant: "destructive",
                          });
                          return;
                        }
                        setDetailsConfirmed(true);
                        if (step === 1) setStep(2);
                      }}
                    >
                      Confirm Details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Keyring Selection */}
            {detailsConfirmed && step >= 1 && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-heading font-semibold mb-4">
                      Select Your Keyring
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {variants.length === 0 ? (
                        <div className="col-span-2 text-center py-8">
                          <p className="text-muted-foreground">
                            No keyring options available for this campaign.
                          </p>
                        </div>
                      ) : (
                       variants.map((variant) => (
                          <KeyringTypeCard
                            key={variant.id}
                            id={variant.id}
                            label={variant.type}
                            description={variant.color}
                            imageUrl={variant.image_url}
                            selected={variant.id in selectedVariants}
                            onSelect={() => {
                              setSelectedVariants(prev => {
                                const newSelected = { ...prev };
                                if (variant.id in newSelected) {
                                  delete newSelected[variant.id];
                                } else {
                                  newSelected[variant.id] = 25;
                                }
                                return newSelected;
                              });
                            }}
                          />
                        ))
                      )}
                    </div>
                    {variants.length === 1 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Only option available for this campaign
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Order Details */}
            {detailsConfirmed && step >= 2 && Object.keys(selectedVariants).length > 0 && (
                <Card className="animate-fade-in mt-6">
                  <CardHeader>
                    <CardTitle className="text-xl font-heading">Order Details</CardTitle>
                    <CardDescription>Select quantities for each variant</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
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

                  {/* Quantity Selection for Each Variant */}
                  {Object.keys(selectedVariants).map((variantId) => {
                    const variant = variants.find(v => v.id === variantId);
                    if (!variant) return null;

                    return (
                      <div key={variantId} className="space-y-3 p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h4 className="font-semibold">{variant.type}</h4>
                            <p className="text-sm text-muted-foreground">{variant.color}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVariants(prev => {
                                const newSelected = { ...prev };
                                delete newSelected[variantId];
                                return newSelected;
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        <Label>Select Quantity</Label>
                        <RadioGroup
                          value={selectedVariants[variantId].toString()}
                          onValueChange={(value) => {
                            setSelectedVariants(prev => ({
                              ...prev,
                              [variantId]: parseInt(value)
                            }));
                          }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          {(paymentMode === "subscription" 
                            ? PRICING_CONFIG.subscription 
                            : PRICING_CONFIG.oneOff
                          ).map((tier) => {
                            const isSelected = selectedVariants[variantId] === tier.quantity;
                        
                        return (
                          <label
                            key={tier.quantity}
                            htmlFor={`quantity-${variantId}-${tier.quantity}`}
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
                              id={`quantity-${variantId}-${tier.quantity}`}
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
                    );
                  })}

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
                  
                  <Button
                    onClick={handleSubmit} 
                    className="w-full" 
                    size="lg"
                    disabled={submitting || Object.keys(selectedVariants).length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue to Checkout"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:sticky lg:top-24 h-fit">
            <OrderSummary
              variants={selectedVariantItems}
              paymentMode={paymentMode}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Order;
