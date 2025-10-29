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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started v3");

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
      items 
    } = await req.json();
    
    logStep("Request received", { campaignId, variantId, quantity, paymentMode, priceId, itemsType: Array.isArray(items) ? typeof items : typeof items, itemsLength: Array.isArray(items) ? items.length : 0 });

    if (!campaignId) throw new Error("Campaign ID is required");
    if (!customerName) throw new Error("Customer name is required");
    if (!customerEmail) throw new Error("Customer email is required");

    const hasItems = Array.isArray(items) && items.length > 0;
    if (!hasItems) {
      if (!variantId) throw new Error("Variant ID is required");
      if (!quantity) throw new Error("Quantity is required");
      if (!priceId) throw new Error("Price ID is required");
    } else {
      for (const i of items) {
        if (!i?.variantId || !i?.priceId || !i?.quantity) {
          throw new Error("Invalid items payload");
        }
      }
    }

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
        keyring_variant_id: variantId || (Array.isArray(items) && items[0]?.variantId) || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        quantity: quantity || (Array.isArray(items) ? items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0) : 0),
        payment_mode: paymentMode,
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

    // Create Stripe checkout session using a single server-enforced price per mode
    const totalQty = (Array.isArray(items) && items.length > 0)
      ? items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0)
      : Number(quantity || 0);

    const UNIT_PRICE_ONE_OFF = "price_1SNKS1Rq8aA0Zjxf3qz776SY"; // £1.00 one-off per unit
    const UNIT_PRICE_SUBSCRIPTION = "price_1SNKS0Rq8aA0Zjxfz2HSIBbp"; // £1.00 per unit per month

    const priceForMode = paymentMode === "subscription" ? UNIT_PRICE_SUBSCRIPTION : UNIT_PRICE_ONE_OFF;
    const finalLineItems = [{ price: priceForMode, quantity: totalQty }];

    logStep("Server-enforced pricing", { priceForMode, totalQty });

    // Calculate volume discount based on quantity
    // For subscription: 50+ gets 10%, 100+ gets 15%, 250+ gets 20%
    // For one-off: 100+ gets 10%, 250+ gets 15%
    let volumeDiscountPercent = 0;
    if (paymentMode === "subscription") {
      if (totalQty >= 250) volumeDiscountPercent = 20;
      else if (totalQty >= 100) volumeDiscountPercent = 15;
      else if (totalQty >= 50) volumeDiscountPercent = 10;
    } else {
      if (totalQty >= 250) volumeDiscountPercent = 15;
      else if (totalQty >= 100) volumeDiscountPercent = 10;
    }

    const sessionParams: any = {
      line_items: finalLineItems,
      mode: paymentMode === "subscription" ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/order/${campaign.unique_code || ''}`,
      customer_email: order.customer_email,
      shipping_address_collection: {
        allowed_countries: ["GB", "US", "CA", "AU", "IE"],
      },
      metadata: {
        order_id: order.id,
        payment_mode: paymentMode,
        quantity: totalQty,
        items: Array.isArray(items) ? JSON.stringify(items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity }))) : undefined,
      },
    };
    
    // Apply volume discount if applicable
    if (volumeDiscountPercent > 0) {
      const volumeCoupon = await stripe.coupons.create({
        percent_off: volumeDiscountPercent,
        duration: paymentMode === "subscription" ? 'forever' : 'once',
        name: `Volume Discount ${volumeDiscountPercent}%`,
      });
      sessionParams.discounts = [{ coupon: volumeCoupon.id }];
      logStep("Volume discount applied", { volumeDiscountPercent, couponId: volumeCoupon.id });
    }

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
