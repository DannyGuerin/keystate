import { cn } from "@/lib/utils";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityPresetPicker } from "@/components/QuantityPresetPicker";

const MIN_QUANTITY = 10;

interface KeyringTypeCardProps {
  id: string;
  label: string;
  description?: string;
  imageUrl?: string | null;
  selected: boolean;
  quantity: number;
  paymentMode: "one-off" | "subscription";
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
}

export const KeyringTypeCard = ({
  id,
  label,
  description,
  imageUrl,
  selected,
  quantity,
  paymentMode,
  onToggle,
  onQuantityChange,
}: KeyringTypeCardProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden",
        selected
          ? "border-primary bg-primary/5 shadow-lg"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="relative flex flex-col items-center gap-4 p-4 sm:p-6 min-h-[150px] sm:min-h-[180px] w-full transition-transform hover:scale-[1.01]"
      >
        {/* Checkmark indicator */}
        {selected && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}

        {/* Image thumbnail or fallback icon */}
        {imageUrl ? (
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-lg p-1 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className={cn(
            "w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-heading font-bold transition-colors",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {label.charAt(0)}
          </div>
        )}

        <div className="text-center">
          <h4 className="font-heading font-semibold text-base mb-1">
            {label}
          </h4>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </button>

      {selected && (
        <div className="px-4 pb-4 pt-3 border-t border-border/60 space-y-3">
          <QuantityPresetPicker
            quantity={quantity}
            paymentMode={paymentMode}
            onSelect={onQuantityChange}
          />

          <div className="flex items-center justify-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Or set manually</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={quantity <= MIN_QUANTITY}
                onClick={() => onQuantityChange(Math.max(MIN_QUANTITY, quantity - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                min={MIN_QUANTITY}
                step={1}
                value={quantity}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  onQuantityChange(Number.isFinite(parsed) ? Math.max(MIN_QUANTITY, parsed) : MIN_QUANTITY);
                }}
                className="w-14 h-7 text-center px-1"
                aria-label={`Quantity for ${label}`}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => onQuantityChange(quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
