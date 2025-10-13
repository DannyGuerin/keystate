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

    const { orderId, paymentMode } = await req.json();
    logStep("Request received", { orderId, paymentMode });

    if (!orderId) throw new Error("Order ID is required");

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

    logStep("Order fetched", { orderStatus: order.status });

    // Calculate price (example: £5 per keyring for testing)
    const unitPrice = 500; // £5.00 in pence
    const totalAmount = unitPrice * order.quantity;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create Stripe checkout session
    const sessionParams: any = {
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${order.keyring_variants?.type || 'Keyring'} - ${order.keyring_variants?.color || 'Standard'}`,
              description: `Order for ${order.campaigns?.company_name || 'Company'}`,
            },
            unit_amount: unitPrice,
          },
          quantity: order.quantity,
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
      },
    };

    // For subscriptions, adjust the price_data structure
    if (paymentMode === "subscription") {
      sessionParams.line_items[0].price_data.recurring = {
        interval: "month",
      };
    }

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
