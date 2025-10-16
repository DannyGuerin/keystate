import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPricingTier, formatPrice } from "@/config/pricing";

interface VariantItem {
  id: string;
  type: string;
  color: string;
  quantity: number;
}

interface OrderSummaryProps {
  variants: VariantItem[];
  paymentMode: "one-off" | "subscription";
}

export const OrderSummary = ({ variants, paymentMode }: OrderSummaryProps) => {
  // Calculate totals for all variants
  const variantTotals = variants.map(variant => {
    const pricingTier = getPricingTier(variant.quantity, paymentMode);
    return {
      ...variant,
      pricingTier,
      subtotal: pricingTier?.total || 0
    };
  });

  const grandTotal = variantTotals.reduce((sum, v) => sum + v.subtotal, 0);
  const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
  const hasDiscount = variantTotals.some(v => v.pricingTier?.discount && v.pricingTier.discount > 0);

  return (
    <Card className="sticky top-24 shadow-elegant rounded-2xl border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-heading">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {variants.length > 0 ? (
          <>
            <div className="space-y-4">
              {variantTotals.map((variant) => (
                <div key={variant.id} className="space-y-2 pb-3 border-b border-border last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{variant.type}</p>
                      <p className="text-xs text-muted-foreground">{variant.color}</p>
                      <p className="text-xs text-muted-foreground">{variant.quantity} units × {variant.pricingTier ? formatPrice(variant.pricingTier.unitPrice) : "—"}</p>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPrice(variant.subtotal)}
                    </span>
                  </div>
                  {variant.pricingTier?.discount && variant.pricingTier.discount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {variant.pricingTier.discount}% off
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Total Quantity</span>
              <span className="text-sm font-medium">{totalQuantity} units</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment</span>
              <Badge variant={paymentMode === "subscription" ? "default" : "secondary"}>
                {paymentMode === "subscription" ? "Monthly Subscription" : "One-Time"}
              </Badge>
            </div>

            {hasDiscount && (
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    💰 Bulk discounts applied
                  </span>
                </div>
              </div>
            )}

            <Separator />

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium">
                  {paymentMode === "subscription" ? "Monthly Total" : "Total"}
                </span>
                <span className="text-2xl font-heading font-bold">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              {paymentMode === "subscription" && (
                <p className="text-xs text-muted-foreground">
                  Billed monthly. Cancel anytime.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No variants selected
          </p>
        )}
      </CardContent>
    </Card>
  );
};
