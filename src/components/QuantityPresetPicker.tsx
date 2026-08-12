import { cn } from "@/lib/utils";
import { PRICING_CONFIG, formatPrice } from "@/config/pricing";

interface QuantityPresetPickerProps {
  quantity: number;
  paymentMode: "one-off" | "subscription";
  onSelect: (quantity: number) => void;
}

// Quick-select shortcuts into the same quantity value the +/- stepper controls —
// not a separate selection system. Labels show this tier's own rate/discount only;
// the real combined total (blended across every selected variant) is shown
// separately in Order Details / Order Summary.
export const QuantityPresetPicker = ({ quantity, paymentMode, onSelect }: QuantityPresetPickerProps) => {
  const tiers = paymentMode === "subscription" ? PRICING_CONFIG.subscription : PRICING_CONFIG.oneOff;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {tiers.map((tier) => {
        const isActive = quantity === tier.quantity;
        return (
          <button
            key={tier.quantity}
            type="button"
            onClick={() => onSelect(tier.quantity)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-1.5 text-center transition-colors",
              isActive
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40"
            )}
          >
            <span className="text-xs font-semibold">
              {tier.quantity} {paymentMode === "subscription" ? "per month" : "units"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatPrice(tier.unitPrice)}/keyring
            </span>
            {(tier.discount ?? 0) > 0 && (
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                Save {tier.discount}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
