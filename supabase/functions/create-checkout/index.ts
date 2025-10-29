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
      promoCode,
      items 
    } = await req.json();
    
    // Validate coupon code if provided
    let couponId = null;
    let discountPercentage = 0;
    
    if (promoCode) {
      const { data: coupon, error: couponError } = await supabaseClient
        .from("coupons")
        .select("*")
        .eq("code", promoCode)
        .eq("is_active", true)
        .single();
      
      if (coupon && !couponError) {
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
        
        if (now >= validFrom && (!validUntil || now <= validUntil)) {
          if (!coupon.max_uses || coupon.current_uses < coupon.max_uses) {
            couponId = coupon.id;
            discountPercentage = coupon.discount_percentage;
            
            // Increment usage count
            await supabaseClient
              .from("coupons")
              .update({ current_uses: coupon.current_uses + 1 })
              .eq("id", coupon.id);
          }
        }
      }
    }
    
    logStep("Request received", { campaignId, variantId, quantity, paymentMode, priceId });

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
        promo_code: promoCode || null,
        coupon_id: couponId,
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

    // Create Stripe checkout session supporting multi-variant line items
    const lineItems = Array.isArray(items) && items.length > 0
      ? items.map((i: any) => ({ price: i.priceId, quantity: i.quantity }))
      : [{ price: priceId, quantity: quantity }];

    const totalQty = quantity || (Array.isArray(items) ? items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0) : 0);

    // Calculate if we need to apply volume discount based on quantity
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
      line_items: lineItems,
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
    
    // Apply volume discount first if applicable
    const couponsToApply = [];
    if (volumeDiscountPercent > 0) {
      const volumeCoupon = await stripe.coupons.create({
        percent_off: volumeDiscountPercent,
        duration: paymentMode === "subscription" ? 'forever' : 'once',
        name: `Volume Discount ${volumeDiscountPercent}%`,
      });
      couponsToApply.push({ coupon: volumeCoupon.id });
    }
    
    // Apply promo code discount if valid (stacks with volume discount)
    if (discountPercentage > 0) {
      const promoCoupon = await stripe.coupons.create({
        percent_off: discountPercentage,
        duration: 'once',
        name: `Promo Code ${discountPercentage}%`,
      });
      couponsToApply.push({ coupon: promoCoupon.id });
    }
    
    if (couponsToApply.length > 0) {
      sessionParams.discounts = couponsToApply;
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
