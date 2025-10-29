import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Server-side pricing tiers (must match frontend)
const PRICING_TIERS = {
  oneOff: {
    10: "price_1SHrNsRq8aA0ZjxfeOJ39fxH",
    25: "price_1SI3ybRq8aA0ZjxfQj3IVd8e",
    50: "price_1SI42ARq8aA0ZjxfcR3R3BTe",
    100: "price_1SI44eRq8aA0ZjxfJGTQ42dq",
    250: "price_1SI469Rq8aA0ZjxffupuxZy3",
  },
  subscription: {
    10: "price_1SI48PRq8aA0ZjxfQTLnXccX",
    25: "price_1SI4B2Rq8aA0ZjxfmMopzAjy",
    50: "price_1SI4CURq8aA0ZjxfbDP2zWQG",
    100: "price_1SI4EXRq8aA0ZjxfqnMDKfKy",
    250: "price_1SI4GERq8aA0ZjxfY3jwm7Fd",
  }
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      campaignId, 
      variantId, 
      customerName, 
      customerEmail, 
      customerPhone,
      quantity, 
      paymentMode, 
      priceId,
      promoCode 
    } = await req.json();
    
    logStep("Request received", { campaignId, variantId, quantity, paymentMode, priceId });

    if (!campaignId) throw new Error("Campaign ID is required");
    if (!variantId) throw new Error("Variant ID is required");
    if (!customerName) throw new Error("Customer name is required");
    if (!customerEmail) throw new Error("Customer email is required");
    if (!quantity) throw new Error("Quantity is required");
    if (!priceId) throw new Error("Price ID is required");

    // SERVER-SIDE VALIDATION: Verify quantity is a valid tier
    const validQuantities = [10, 25, 50, 100, 250];
    if (!validQuantities.includes(quantity)) {
      logStep("Invalid quantity", { quantity });
      throw new Error(`Invalid quantity: ${quantity}. Must be one of: ${validQuantities.join(', ')}`);
    }

    // SERVER-SIDE VALIDATION: Get correct price ID from server config
    const mode = paymentMode === "subscription" ? "subscription" : "oneOff";
    const tierConfig = PRICING_TIERS[mode];
    const correctPriceId = tierConfig[quantity as keyof typeof tierConfig];

    if (!correctPriceId) {
      logStep("No price configured for tier", { quantity, mode });
      throw new Error(`No price configured for ${quantity} units (${mode})`);
    }

    // SERVER-SIDE VALIDATION: Verify client sent correct price ID
    if (priceId !== correctPriceId) {
      logStep("Price ID mismatch - using server price", { 
        clientSent: priceId, 
        serverExpected: correctPriceId,
        quantity,
        mode
      });
      // Use server price, not client price (security measure)
    }

    const validatedPriceId = correctPriceId;
    logStep("Price validated", { priceId: validatedPriceId, quantity, mode });

    // Fetch campaign details for checkout metadata
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("campaigns")
      .select("company_name, unique_code")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      logStep("Campaign fetch error", campaignError);
      throw new Error("Campaign not found");
    }

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert([{
        campaign_id: campaignId,
        keyring_variant_id: variantId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        quantity: quantity,
        payment_mode: paymentMode,
        promo_code: promoCode || null,
        status: "pending_payment" as const,
      }])
      .select()
      .single();

    if (orderError || !order) {
      logStep("Order creation error", orderError);
      throw new Error("Failed to create order");
    }

    logStep("Order created", { orderId: order.id, quantity: order.quantity });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create Stripe checkout session using the VALIDATED Price ID
    const sessionParams: any = {
      line_items: [
        {
          price: validatedPriceId, // Use server-validated price ID
          quantity: 1, // Always 1 (tier price includes all units)
        },
      ],
      mode: paymentMode === "subscription" ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/order/${campaign.unique_code || ''}`,
      customer_email: order.customer_email,
      shipping_address_collection: {
        allowed_countries: ["GB", "US", "CA", "AU", "IE"],
      },
      metadata: {
        order_id: order.id,
        quantity: quantity,
        payment_mode: paymentMode,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    // Update order with stripe session ID
    await supabaseClient
      .from("orders")
      .update({ 
        stripe_session_id: session.id
      })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
