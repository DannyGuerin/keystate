import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Variant-based pricing map (variantId → Stripe Price ID)
// TODO: Populate with actual variant UUIDs from your keyring_variants table
const PRICE_MAP: Record<string, string> = {
  // Example format - replace with your actual variant IDs:
  // '2873890c-bfad-46d1-8f00-2096a4ac0bdb': 'price_1SHrNsRq8aA0ZjxfeOJ39fxH',
  // Add all your keyring variant IDs and their Stripe price IDs here
};

// Type definitions for request payload
type CheckoutItem = {
  variantId: string;
  quantity: number;
};

type CheckoutPayload = {
  items: CheckoutItem[];
  mode?: 'payment' | 'subscription';
  promoCode?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  campaignId: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Handler entered");

    // EARLY GUARDRAIL: Check for Stripe secret key before proceeding
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("CRITICAL: Missing STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Log Stripe configuration (masked for security)
    console.log("Stripe configuration", {
      hasSecretKey: !!stripeKey,
      keyPrefix: stripeKey.slice(0, 10),
      mode: stripeKey.startsWith("sk_live_") ? "LIVE" :
            stripeKey.startsWith("sk_test_") ? "TEST" : "UNKNOWN",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    logStep("Parsed body", body);

    const payload = body as CheckoutPayload;

    // VALIDATION: Check required fields
    if (!payload.customerName) {
      return new Response(
        JSON.stringify({ error: "customerName is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    if (!payload.customerEmail) {
      return new Response(
        JSON.stringify({ error: "customerEmail is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    if (!payload.campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // VALIDATION: Items array must be non-empty
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      logStep("Invalid items - returning 400", { items: payload.items });
      return new Response(
        JSON.stringify({ error: "items array must be non-empty" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // VALIDATION & BUILD: Validate each item and build line_items for Stripe
    const line_items: Array<{ price: string; quantity: number }> = [];
    const variantIds: string[] = [];
    const quantities: number[] = [];

    for (const item of payload.items) {
      // Check variantId exists
      if (!item.variantId || typeof item.variantId !== 'string') {
        return new Response(
          JSON.stringify({ error: "Each item must have a valid variantId" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check variantId exists in PRICE_MAP
      const priceId = PRICE_MAP[item.variantId];
      if (!priceId) {
        logStep("Invalid variantId - returning 400", { variantId: item.variantId });
        return new Response(
          JSON.stringify({ 
            error: `Unknown variantId: ${item.variantId}. This variant is not configured for checkout.` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Validate and clamp quantity (integer >= 1, capped at 50)
      const rawQuantity = item.quantity;
      if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > 50) {
        logStep("Invalid quantity - returning 400", { variantId: item.variantId, quantity: rawQuantity });
        return new Response(
          JSON.stringify({ 
            error: `Quantity must be an integer between 1 and 50. Got: ${rawQuantity}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const clampedQuantity = Math.min(Math.max(1, rawQuantity | 0), 50);

      line_items.push({
        price: priceId,
        quantity: clampedQuantity,
      });

      variantIds.push(item.variantId);
      quantities.push(clampedQuantity);
    }

    const mode = payload.mode || 'payment';
    const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);
    
    logStep("Line items summary", { 
      count: line_items.length, 
      variantIds,
      quantities,
      totalQuantity,
      mode 
    });

    // Fetch campaign details for checkout metadata
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("campaigns")
      .select("company_name, unique_code")
      .eq("id", payload.campaignId)
      .single();

    if (campaignError || !campaign) {
      logStep("Campaign fetch error", campaignError);
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Create order record (using first item for now - multi-item support can be added later)
    const firstItem = payload.items[0];
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert([{
        campaign_id: payload.campaignId,
        keyring_variant_id: firstItem.variantId,
        customer_name: payload.customerName,
        customer_email: payload.customerEmail,
        customer_phone: payload.customerPhone || null,
        quantity: totalQuantity,
        payment_mode: mode as 'payment' | 'subscription',
        promo_code: payload.promoCode || null,
        status: "pending_payment" as const,
      }])
      .select()
      .single();

    if (orderError || !order) {
      logStep("Order creation error", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep("Order created", { orderId: order.id, totalQuantity });

    // CALL STRIPE REST API
    const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("VITE_PUBLIC_SITE_URL") || req.headers.get("origin");
    
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('success_url', `${siteUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${siteUrl}/order/${campaign.unique_code || ''}`);
    params.set('customer_email', payload.customerEmail);
    params.set('allow_promotion_codes', 'true');

    // Add line items
    line_items.forEach((li, i) => {
      params.set(`line_items[${i}][price]`, li.price);
      params.set(`line_items[${i}][quantity]`, String(li.quantity));
    });

    // Add shipping address collection
    params.set('shipping_address_collection[allowed_countries][0]', 'GB');
    params.set('shipping_address_collection[allowed_countries][1]', 'US');
    params.set('shipping_address_collection[allowed_countries][2]', 'CA');
    params.set('shipping_address_collection[allowed_countries][3]', 'AU');
    params.set('shipping_address_collection[allowed_countries][4]', 'IE');

    // Add metadata
    params.set('metadata[order_id]', order.id);
    params.set('metadata[total_quantity]', String(totalQuantity));
    params.set('metadata[payment_mode]', mode);

    // Add promotion code if provided
    if (payload.promoCode) {
      params.set('discounts[0][promotion_code]', payload.promoCode);
    }

    logStep("About to call Stripe", { url: 'https://api.stripe.com/v1/checkout/sessions' });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const responseText = await stripeResponse.text();

    if (!stripeResponse.ok) {
      logStep('Stripe error', { status: stripeResponse.status, body: responseText });
      return new Response(
        JSON.stringify({ error: responseText }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const session = JSON.parse(responseText);
    logStep('Stripe session created', { id: session.id });

    // Update order with stripe session ID
    await supabaseClient
      .from("orders")
      .update({ 
        stripe_session_id: session.id
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ url: session.url }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Checkout error", { 
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined
    });
    
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
