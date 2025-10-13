import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface KeyringTypeCardProps {
  id: string;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}

export const KeyringTypeCard = ({ id, label, description, selected, onSelect }: KeyringTypeCardProps) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] min-h-[140px]",
        selected
          ? "border-primary bg-primary/5 shadow-lg"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
      )}
    >
      {/* Checkmark indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Icon placeholder - could be replaced with actual images */}
      <div className={cn(
        "w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-heading font-bold transition-colors",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {label.charAt(0)}
      </div>

      <div className="text-center">
        <h4 className={cn(
          "font-heading font-semibold text-sm mb-1",
          selected ? "text-foreground" : "text-foreground"
        )}>
          {label}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </button>
  );
};
