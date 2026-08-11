// Single source of truth for keyring pricing tiers. Imported directly (relative path,
// no bundler-specific syntax) by both the Vite frontend (via src/config/pricing.ts)
// and Deno edge functions (via ../_shared/pricing.ts) so pricing can't drift between
// the order form, the subscription editor, and any other caller.

export interface PricingTier {
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number; // percentage discount vs one-off base price
  isPopular?: boolean;
  isBestValue?: boolean;
}

export const PRICING_CONFIG = {
  oneOff: [
    {
      quantity: 10,
      unitPrice: 1.00,
      total: 10.00,
      discount: 0,
    },
    {
      quantity: 25,
      unitPrice: 0.95,
      total: 23.75,
      discount: 5,
      isPopular: true,
    },
    {
      quantity: 50,
      unitPrice: 0.90,
      total: 45.00,
      discount: 10,
    },
    {
      quantity: 100,
      unitPrice: 0.85,
      total: 85.00,
      discount: 15,
    },
    {
      quantity: 250,
      unitPrice: 0.80,
      total: 200.00,
      discount: 20,
      isBestValue: true,
    },
  ] as PricingTier[],

  subscription: [
    {
      quantity: 10,
      unitPrice: 1.00,
      total: 10.00,
      discount: 0, // no savings vs one-off
    },
    {
      quantity: 25,
      unitPrice: 0.88,
      total: 22.00,
      discount: 12, // 12% off base £1.00
      isPopular: true,
    },
    {
      quantity: 50,
      unitPrice: 0.80,
      total: 40.00,
      discount: 20, // 20% off base £1.00
    },
    {
      quantity: 100,
      unitPrice: 0.75,
      total: 75.00,
      discount: 25, // 25% off base £1.00
    },
    {
      quantity: 250,
      unitPrice: 0.72,
      total: 180.00,
      discount: 28, // 28% off base £1.00
      isBestValue: true,
    },
  ] as PricingTier[],
};

// Helper function to get pricing tier by quantity and mode
export const getPricingTier = (quantity: number, mode: "one-off" | "subscription"): PricingTier | undefined => {
  const tiers = mode === "subscription" ? PRICING_CONFIG.subscription : PRICING_CONFIG.oneOff;
  return tiers.find(tier => tier.quantity === quantity);
};

export interface VolumePriceQuote {
  unitPrice: number;
  total: number;
  discount: number;
  tierQuantity: number; // the breakpoint that was matched
}

// Bulk-discount pricing for an arbitrary total quantity (e.g. split across
// several keyring variants): finds the highest breakpoint the total quantity
// qualifies for and applies that tier's unit price to the full total.
export const getVolumePricing = (totalQuantity: number, mode: "one-off" | "subscription"): VolumePriceQuote | null => {
  if (!totalQuantity || totalQuantity <= 0) return null;

  const tiers = [...(mode === "subscription" ? PRICING_CONFIG.subscription : PRICING_CONFIG.oneOff)]
    .sort((a, b) => a.quantity - b.quantity);

  const applicable = tiers.reduce((best, tier) =>
    tier.quantity <= totalQuantity ? tier : best
  , tiers[0]);

  return {
    unitPrice: applicable.unitPrice,
    total: Math.round(applicable.unitPrice * totalQuantity * 100) / 100,
    discount: applicable.discount ?? 0,
    tierQuantity: applicable.quantity,
  };
};

// Helper to format price in GBP
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};
