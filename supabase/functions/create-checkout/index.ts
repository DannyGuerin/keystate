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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { orderId, paymentMode, priceId } = await req.json();
    logStep("Request received", { orderId, paymentMode, priceId });

    if (!orderId) throw new Error("Order ID is required");
    if (!priceId) throw new Error("Price ID is required");

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        keyring_variants (
          type,
          color
        ),
        campaigns (
          company_name
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      logStep("Order fetch error", orderError);
      throw new Error("Order not found");
    }

    logStep("Order fetched", { orderStatus: order.status, quantity: order.quantity });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create Stripe checkout session using the Price ID from frontend
    const sessionParams: any = {
      line_items: [
        {
          price: priceId, // Use the Stripe Price ID directly
          quantity: 1, // Quantity is baked into the price (e.g., "25 units/month")
        },
      ],
      mode: paymentMode === "subscription" ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/order/${order.campaigns?.unique_code || ''}`,
      customer_email: order.customer_email,
      shipping_address_collection: {
        allowed_countries: ["GB", "US", "CA", "AU", "IE"],
      },
      metadata: {
        order_id: orderId,
        quantity: order.quantity,
        payment_mode: paymentMode,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    // Update order with stripe session ID
    await supabaseClient
      .from("orders")
      .update({ 
        stripe_session_id: session.id,
        status: "pending_payment"
      })
      .eq("id", orderId);

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
