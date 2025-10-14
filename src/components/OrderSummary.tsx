import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPricingTier, formatPrice } from "@/config/pricing";

interface OrderSummaryProps {
  formData: {
    keyringType: string;
    color: string;
    quantity: number;
    paymentMode: "one-off" | "subscription";
  };
}

export const OrderSummary = ({ formData }: OrderSummaryProps) => {
  const getKeyringTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "classic-round": "Classic Round",
      "classic-square": "Classic Square",
      "premium-round": "Premium Round",
      "premium-square": "Premium Square",
      "luxury-house": "Luxury House Shape",
    };
    return labels[type] || "Not selected";
  };

  const getColorLabel = (color: string) => {
    const labels: Record<string, string> = {
      "silver": "Silver",
      "gold": "Gold",
      "rose-gold": "Rose Gold",
      "black": "Black",
      "blue": "Blue",
    };
    return labels[color] || "Not selected";
  };

  // Get pricing information
  const pricingTier = formData.quantity 
    ? getPricingTier(formData.quantity, formData.paymentMode)
    : null;

  return (
    <Card className="sticky top-24 shadow-elegant rounded-2xl border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-heading">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Keyring Type</span>
            <span className="text-sm font-medium text-right max-w-[150px]">
              {formData.keyringType ? getKeyringTypeLabel(formData.keyringType) : "—"}
            </span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Colour</span>
            <span className="text-sm font-medium">
              {formData.color ? getColorLabel(formData.color) : "—"}
            </span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <span className="text-sm font-medium">
              {formData.quantity ? `${formData.quantity} units` : "—"}
            </span>
          </div>

          {pricingTier && (
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Unit Price</span>
              <span className="text-sm font-medium">
                {formatPrice(pricingTier.unitPrice)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Payment</span>
          <Badge variant={formData.paymentMode === "subscription" ? "default" : "secondary"}>
            {formData.paymentMode === "subscription" ? "Monthly Subscription" : "One-Time"}
          </Badge>
        </div>

        {pricingTier && pricingTier.discount && pricingTier.discount > 0 && (
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                💰 You're saving {pricingTier.discount}%
              </span>
            </div>
          </div>
        )}

        <Separator />

        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">
              {formData.paymentMode === "subscription" ? "Monthly Total" : "Total"}
            </span>
            <span className="text-2xl font-heading font-bold">
              {pricingTier ? formatPrice(pricingTier.total) : "—"}
            </span>
          </div>
          {formData.paymentMode === "subscription" && (
            <p className="text-xs text-muted-foreground">
              Billed monthly. Cancel anytime.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
