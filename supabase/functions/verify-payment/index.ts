import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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

    const { sessionId } = await req.json();
    logStep("Request received", { sessionId });

    if (!sessionId) throw new Error("Session ID is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'payment_intent'],
    });
    logStep("Session retrieved", { status: session.payment_status });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Extract shipping details
    const shippingDetails = session.shipping_details;
    const orderId = session.metadata?.order_id;

    if (!orderId) throw new Error("Order ID not found in session");

    // Update order with payment confirmation and shipping details
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent_id: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
        shipping_name: shippingDetails?.name || null,
        shipping_address_line1: shippingDetails?.address?.line1 || null,
        shipping_address_line2: shippingDetails?.address?.line2 || null,
        shipping_city: shippingDetails?.address?.city || null,
        shipping_postal_code: shippingDetails?.address?.postal_code || null,
        shipping_country: shippingDetails?.address?.country || null,
      })
      .eq("id", orderId);

    if (updateError) {
      logStep("Update error", updateError);
      throw new Error("Failed to update order");
    }

    // Fetch updated order
    const { data: order, error: fetchError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        campaigns (
          company_name
        ),
        coupons (
          code,
          discount_percentage
        )
      `)
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      throw new Error("Failed to fetch order details");
    }

    logStep("Order updated successfully", { orderId });

    return new Response(JSON.stringify({ 
      success: true, 
      order 
    }), {
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
