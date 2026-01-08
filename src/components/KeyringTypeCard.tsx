import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface KeyringTypeCardProps {
  id: string;
  label: string;
  description?: string;
  imageUrl?: string | null;
  selected: boolean;
  onSelect: () => void;
}

export const KeyringTypeCard = ({ id, label, description, imageUrl, selected, onSelect }: KeyringTypeCardProps) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] min-h-[180px]",
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

      {/* Image thumbnail or fallback icon */}
      {imageUrl ? (
        {
          imageUrl?(
        <div className = "w-32 h-32 md:w-40 md:h-40 bg-white rounded-lg p-1 flex items-center justify-center" >
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
  )
}

<div className="text-center">
  <h4 className="font-heading font-semibold text-base mb-1">
    {label}
  </h4>
  {description && (
    <p className="text-sm text-muted-foreground">{description}</p>
  )}
</div>
    </button >
  );
};
