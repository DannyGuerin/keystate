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
      priceId: "price_1SHrNsRq8aA0ZjxfeOJ39fxH",
      unitPrice: 1.00,
      total: 10.00,
      discount: 0,
    },
    {
      quantity: 25,
      priceId: "price_1SI3ybRq8aA0ZjxfQj3IVd8e",
      unitPrice: 1.00,
      total: 25.00,
      discount: 0,
    },
    {
      quantity: 50,
      priceId: "price_1SI42ARq8aA0ZjxfcR3R3BTe",
      unitPrice: 1.00,
      total: 50.00,
      discount: 0,
    },
    {
      quantity: 100,
      priceId: "price_1SI44eRq8aA0ZjxfJGTQ42dq",
      unitPrice: 0.90,
      total: 90.00,
      discount: 10,
      isPopular: true,
    },
    {
      quantity: 250,
      priceId: "price_1SI469Rq8aA0ZjxffupuxZy3",
      unitPrice: 0.85,
      total: 212.50,
      discount: 15,
      isBestValue: true,
    },
  ] as PricingTier[],
  
  subscription: [
    {
      quantity: 10,
      priceId: "price_1SI48PRq8aA0ZjxfQTLnXccX",
      unitPrice: 1.00,
      total: 10.00,
      discount: 0,
    },
    {
      quantity: 25,
      priceId: "price_1SI4B2Rq8aA0ZjxfmMopzAjy",
      unitPrice: 1.00,
      total: 25.00,
      discount: 0,
    },
    {
      quantity: 50,
      priceId: "price_1SI4CURq8aA0ZjxfbDP2zWQG",
      unitPrice: 0.90,
      total: 45.00,
      discount: 10,
      isPopular: true,
    },
    {
      quantity: 100,
      priceId: "price_1SI4EXRq8aA0ZjxfqnMDKfKy",
      unitPrice: 0.85,
      total: 85.00,
      discount: 15,
    },
    {
      quantity: 250,
      priceId: "price_1SI4GERq8aA0ZjxfY3jwm7Fd",
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
