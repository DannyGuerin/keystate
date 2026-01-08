import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
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

    const { sessionId } = await req.json();
    logStep("Request received", { sessionId });

    if (!sessionId) throw new Error("Session ID is required");

    // Call Stripe API directly via fetch to avoid SDK typing issues
    logStep("Retrieving session from Stripe API");
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=payment_intent&expand[]=customer`,
      {
        headers: {
          Authorization: `Bearer ${stripeKey}`,
        },
      }
    );

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      throw new Error(`Stripe API error: ${stripeResponse.status} ${errorText}`);
    }

    const session = await stripeResponse.json();
    logStep("Session retrieved", { status: session.payment_status });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Extract shipping details
    const shippingDetails = session.shipping_details;
    const orderId = session.metadata?.order_id;
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!orderId) throw new Error("Order ID not found in session");

    // Update order with payment confirmation and shipping details
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntentId,
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
