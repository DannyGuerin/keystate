import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OrderSummaryProps {
  formData: {
    keyringType: string;
    color: string;
    quantity: string;
    customQuantity: string;
    paymentMode: string;
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

  const getQuantityValue = () => {
    if (formData.quantity === "custom" && formData.customQuantity) {
      return formData.customQuantity;
    }
    return formData.quantity || "Not selected";
  };

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
              {getQuantityValue()} {formData.quantity && formData.quantity !== "Not selected" ? "units" : ""}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Payment</span>
          <Badge variant={formData.paymentMode === "subscription" ? "default" : "secondary"}>
            {formData.paymentMode === "subscription" ? "Subscription" : "One-off"}
          </Badge>
        </div>

        <Separator />

        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Subtotal</span>
            <span className="text-lg font-heading font-semibold">TBC</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Final price will be calculated at checkout
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
