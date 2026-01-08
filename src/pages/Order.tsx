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
import { Loader2, Check } from "lucide-react";
import { PRICING_CONFIG, getPricingTier, formatPrice } from "@/config/pricing";
import keystateLogo from "@/assets/keystate-logo.png";

interface Campaign {
  id: string;
  company_name: string;
  company_address: string | null;
  company_postcode: string | null;
  status: string;
  logo_url: string | null;
  logo_url: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
  const [quantity, setQuantity] = useState(10);
  const [paymentMode, setPaymentMode] = useState<"one-off" | "subscription">("subscription");
  const [promoCode, setPromoCode] = useState("");

  // Shipping details state - pre-filled from campaign
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingPostcode, setShippingPostcode] = useState("");
  const [shippingContact, setShippingContact] = useState("");
  const [detailsEditing, setDetailsEditing] = useState(false);

  useEffect(() => {
    if (code) {
      fetchCampaign();
    }
  }, [code]);

  // Auto-select when only one variant is available
  useEffect(() => {
    if (variants.length === 1 && !selectedVariant) {
      setSelectedVariant(variants[0].id);
      if (step === 1) setStep(2);
    }
  }, [variants, selectedVariant, step]);

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

    // Pre-fill contact details if available
    if (campaign.contact_email) setEmail(campaign.contact_email);
    if (campaign.contact_phone) setPhone(campaign.contact_phone);
    if (campaign.contact_person) setName(campaign.contact_person);

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
    if (!campaign || !selectedVariant || !name || !email || !quantity) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get the correct pricing tier
      const pricingTier = getPricingTier(quantity, paymentMode === 'one-off' ? 'one-off' : 'subscription');
      if (!pricingTier) {
        toast({
          title: "Invalid quantity",
          description: "Please select a valid quantity tier",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      console.log("Creating checkout session with:", {
        campaignId: campaign.id,
        variantId: selectedVariant,
        quantity,
        paymentMode,
        priceId: pricingTier.priceId,
      });

      // Create order and checkout session via edge function
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            items: [{
              variantId: selectedVariant,
              quantity,
              priceId: pricingTier.priceId
            }],
            customerName: name,
            customerEmail: email,
            customerPhone: phone || null,
            campaignId: campaign.id,
            mode: paymentMode === 'one-off' ? 'payment' : 'subscription',
            promoCode: promoCode || null,
          },
        }
      );

      // Extract error message reliably from server response or SDK error
      const msg =
        (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
        (error?.message) || 'Checkout failed';

      if (error || !data?.url) {
        console.error("Checkout error:", { error, data });
        toast({
          title: "Checkout failed",
          description: msg,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      console.log("Redirecting to Stripe checkout:", data.url);

      // Show a loading toast
      toast({
        title: "Redirecting to checkout...",
        description: "Please wait while we redirect you to Stripe",
      });

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Unexpected error during checkout:", error);
      toast({
        title: "Checkout failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
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

  const selectedVariantData = variants.find(v => v.id === selectedVariant);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header - KEYSTATE logo only */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            <img
              src={keystateLogo}
              alt="KEYSTATE"
              className="h-8"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Hero Section - Company Logo & Agent Details */}
        <div className="text-center mb-8 space-y-4">
          {campaign.logo_url && (
            <img
              src={campaign.logo_url}
              alt={campaign.company_name}
              className="h-24 w-auto max-w-[200px] object-contain mx-auto"
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
          steps={["Select Keyring", "Order Details", "Contact Info"]}
          currentStep={step - 1}
        />

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Keyring Selection */}
            {step >= 1 && (
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
                            selected={selectedVariant === variant.id}
                            onSelect={() => {
                              setSelectedVariant(variant.id);
                              if (step === 1) setStep(2);
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

            {/* Step 2: Company Details & Order Details */}
            {step >= 2 && (
              <>
                {/* Company Details Card */}
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-xl font-heading">Company Details</CardTitle>
                    <CardDescription>
                      Pre-filled with the estate agent's details. Edit if needed, <strong className="text-primary font-bold">then confirm</strong>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-end mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {detailsEditing ? "Editing" : "Locked"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingName">Company Name *</Label>
                      <Input
                        id="shippingName"
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        placeholder="Company Name"
                        readOnly={!detailsEditing}
                        className={!detailsEditing ? "bg-muted" : undefined}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shippingAddress">Address</Label>
                        <Input
                          id="shippingAddress"
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="123 Business Street"
                          readOnly={!detailsEditing}
                          className={!detailsEditing ? "bg-muted" : undefined}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="shippingPostcode">Postcode</Label>
                        <Input
                          id="shippingPostcode"
                          value={shippingPostcode}
                          onChange={(e) => setShippingPostcode(e.target.value)}
                          placeholder="SW1A 1AA"
                          readOnly={!detailsEditing}
                          className={!detailsEditing ? "bg-muted" : undefined}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingContact">Contact Person</Label>
                      <Input
                        id="shippingContact"
                        value={shippingContact}
                        onChange={(e) => setShippingContact(e.target.value)}
                        placeholder="John Doe"
                        readOnly={!detailsEditing}
                        className={!detailsEditing ? "bg-slate-50" : undefined}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      {detailsEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="sm:flex-1"
                            onClick={() => {
                              setDetailsEditing(false);
                              setShippingName(campaign?.company_name || "");
                              setShippingAddress(campaign?.company_address || "");
                              setShippingPostcode(campaign?.company_postcode || "");
                              setShippingContact(campaign?.contact_person || "");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="sm:flex-1"
                            onClick={() => {
                              setDetailsEditing(false);
                            }}
                          >
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="sm:flex-1"
                            onClick={() => setDetailsEditing(true)}
                          >
                            Edit
                          </Button>
                          {step >= 3 ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="sm:flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-50 opacity-100" // opacity-100 to override disabled opacity if we want it to look crisp
                              disabled
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Confirmed
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              className="sm:flex-1 animate-ring-pulse shadow-md transition-all duration-300"
                              onClick={() => {
                                setStep(3);
                                setTimeout(() => {
                                  document.getElementById('contact-info')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                            >
                              Confirm Details
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Details Card */}
                <Card className="animate-fade-in mt-6">
                  <CardHeader>
                    <CardTitle className="text-xl font-heading">Order Details</CardTitle>
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
                  </CardContent>
                </Card>
              </>
            )}

            {step >= 3 && (
              <Card id="contact-info" className="animate-fade-in">
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
