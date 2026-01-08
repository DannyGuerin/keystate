export interface PricingTier {
  quantity: number;
  priceId: string;
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
      priceId: "price_1Sn46nHK4We2BSbIBIfVeCBO",
      unitPrice: 1.00,
      total: 10.00,
      discount: 0,
    },
    {
      quantity: 25,
      priceId: "price_1Sn47YHK4We2BSbIPgJyxpUC",
      unitPrice: 0.95,
      total: 23.75,
      discount: 5,
      isPopular: true,
    },
    {
      quantity: 50,
      priceId: "price_1Sn485HK4We2BSbIx37eToYk",
      unitPrice: 0.90,
      total: 45.00,
      discount: 10,
    },
    {
      quantity: 100,
      priceId: "price_1Sn49jHK4We2BSbIrb7ZAlGt",
      unitPrice: 0.85,
      total: 85.00,
      discount: 15,
    },
    {
      quantity: 250,
      priceId: "price_1Sn4ACHK4We2BSbIvfwLPS0b",
      unitPrice: 0.80,
      total: 200.00,
      discount: 20,
      isBestValue: true,
    },
  ] as PricingTier[],

  subscription: [
    {
      quantity: 10,
      priceId: "price_1Sn343HK4We2BSbIAOowFI4h",
      unitPrice: 1.00,
      total: 10.00,
      discount: 0, // no savings vs one-off
    },
    {
      quantity: 25,
      priceId: "price_1Sn3xtHK4We2BSbICHDC1mqP",
      unitPrice: 0.88,
      total: 22.00,
      discount: 7,
      isPopular: true,
    },
    {
      quantity: 50,
      priceId: "price_1Sn3z4HK4We2BSbImqbEO1pC",
      unitPrice: 0.80,
      total: 40.00,
      discount: 11,
    },
    {
      quantity: 100,
      priceId: "price_1Sn3zyHK4We2BSbIj6L49Sn5",
      unitPrice: 0.75,
      total: 75.00,
      discount: 12,
    },
    {
      quantity: 250,
      priceId: "price_1Sn40eHK4We2BSbIgPvaoCjz",
      unitPrice: 0.72,
      total: 180.00,
      discount: 10,
      isBestValue: true,
    },
  ] as PricingTier[],
};

// Helper function to get pricing tier by quantity and mode
export const getPricingTier = (quantity: number, mode: "one-off" | "subscription"): PricingTier | undefined => {
  const tiers = mode === "subscription" ? PRICING_CONFIG.subscription : PRICING_CONFIG.oneOff;
  return tiers.find(tier => tier.quantity === quantity);
};

// Helper to format price in GBP
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};
