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

// Variant-based pricing map (variantId -> Stripe Price ID)
// TODO: Populate with actual variant IDs and their corresponding price IDs
const PRICE_MAP: Record<string, string> = {
  // Example format:
  // 'variant-uuid-here': 'price_1SHrNsRq8aA0ZjxfeOJ39fxH',
  // Add your keyring variant IDs and their Stripe price IDs below
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

    // VALIDATION: Validate each item
    const validatedLineItems: Array<{ price: string; quantity: number }> = [];
    let totalQuantity = 0;

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

      // Check quantity is valid (integer >= 1, capped at 50)
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        logStep("Invalid quantity - returning 400", { variantId: item.variantId, quantity: item.quantity });
        return new Response(
          JSON.stringify({ 
            error: `Quantity must be an integer between 1 and 50. Got: ${item.quantity}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      validatedLineItems.push({
        price: priceId,
        quantity: item.quantity,
      });

      totalQuantity += item.quantity;
    }

    const mode = payload.mode || 'payment';
    logStep("Validation complete", { 
      itemCount: validatedLineItems.length, 
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

    logStep("About to call Stripe", { lineItems: validatedLineItems, mode });
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: validatedLineItems,
      mode: mode === 'subscription' ? 'subscription' : 'payment',
      success_url: `${req.headers.get("origin")}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/order/${campaign.unique_code || ''}`,
      customer_email: payload.customerEmail,
      shipping_address_collection: {
        allowed_countries: ["GB", "US", "CA", "AU", "IE"],
      },
      metadata: {
        order_id: order.id,
        total_quantity: totalQuantity.toString(),
        payment_mode: mode,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Stripe session created", { sessionId: session.id });

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
