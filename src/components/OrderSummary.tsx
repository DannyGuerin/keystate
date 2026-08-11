import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getVolumePricing, formatPrice } from "@/config/pricing";

interface OrderSummaryItem {
  label: string;
  description?: string;
  quantity: number;
}

interface OrderSummaryProps {
  items: OrderSummaryItem[];
  paymentMode: "one-off" | "subscription";
}

export const OrderSummary = ({ items, paymentMode }: OrderSummaryProps) => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const pricing = getVolumePricing(totalQuantity, paymentMode);

  return (
    <Card className="sticky top-24 shadow-elegant rounded-2xl border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-heading">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keyrings selected yet</p>
          ) : (
            items.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground text-right max-w-[150px] leading-tight">
                  {item.label}
                  {item.description && ` — ${item.description}`}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.quantity} units
                </span>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div className="flex justify-between items-start pt-1 border-t border-border/50">
              <span className="text-sm font-medium">Total Quantity</span>
              <span className="text-sm font-medium">{totalQuantity} units</span>
            </div>
          )}

          {pricing && (
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Unit Price</span>
              <span className="text-sm font-medium">
                {formatPrice(pricing.unitPrice)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Payment</span>
          <Badge variant={paymentMode === "subscription" ? "default" : "secondary"}>
            {paymentMode === "subscription" ? "Monthly Subscription" : "One-Time"}
          </Badge>
        </div>

        {pricing && pricing.discount > 0 && (
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                💰 You're saving {pricing.discount}%
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
              {pricing ? formatPrice(pricing.total) : "—"}
            </span>
          </div>
          {paymentMode === "subscription" && (
            <p className="text-xs text-muted-foreground">
              Billed monthly. Cancel anytime.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
