export interface PricingTier {
  quantity: number;
  priceId: string;
  unitPrice: number;
  total: number;
  discount?: number; // percentage discount vs one-off base price
  isPopular?: boolean;
  isBestValue?: boolean;
}

// Base unit prices - Stripe will multiply by quantity
const UNIT_PRICE_ONE_OFF = "price_1SNKS1Rq8aA0Zjxf3qz776SY"; // £1.00 per unit
const UNIT_PRICE_SUBSCRIPTION = "price_1SNKS0Rq8aA0Zjxfz2HSIBbp"; // £1.00 per unit per month

export const PRICING_CONFIG = {
  oneOff: [
    {
      quantity: 10,
      priceId: UNIT_PRICE_ONE_OFF,
      unitPrice: 1.00,
      total: 10.00,
      discount: 0,
    },
    {
      quantity: 25,
      priceId: UNIT_PRICE_ONE_OFF,
      unitPrice: 1.00,
      total: 25.00,
      discount: 0,
    },
    {
      quantity: 50,
      priceId: UNIT_PRICE_ONE_OFF,
      unitPrice: 1.00,
      total: 50.00,
      discount: 0,
    },
    {
      quantity: 100,
      priceId: UNIT_PRICE_ONE_OFF,
      unitPrice: 0.90,
      total: 90.00,
      discount: 10,
      isPopular: true,
    },
    {
      quantity: 250,
      priceId: UNIT_PRICE_ONE_OFF,
      unitPrice: 0.85,
      total: 212.50,
      discount: 15,
      isBestValue: true,
    },
  ] as PricingTier[],
  
  subscription: [
    {
      quantity: 10,
      priceId: UNIT_PRICE_SUBSCRIPTION,
      unitPrice: 1.00,
      total: 10.00,
      discount: 0,
    },
    {
      quantity: 25,
      priceId: UNIT_PRICE_SUBSCRIPTION,
      unitPrice: 1.00,
      total: 25.00,
      discount: 0,
    },
    {
      quantity: 50,
      priceId: UNIT_PRICE_SUBSCRIPTION,
      unitPrice: 0.90,
      total: 45.00,
      discount: 10,
      isPopular: true,
    },
    {
      quantity: 100,
      priceId: UNIT_PRICE_SUBSCRIPTION,
      unitPrice: 0.85,
      total: 85.00,
      discount: 15,
    },
    {
      quantity: 250,
      priceId: UNIT_PRICE_SUBSCRIPTION,
      unitPrice: 0.80,
      total: 200.00,
      discount: 20,
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
