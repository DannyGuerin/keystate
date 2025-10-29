import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!stripeSecretKey || !webhookSecret) {
    console.error("❌ Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response(
      JSON.stringify({ error: "Webhook configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("❌ No stripe-signature header found");
      return new Response(
        JSON.stringify({ error: "No signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`✅ Webhook signature verified: ${event.type}`);
    } catch (err) {
      console.error(`❌ Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      console.log(`📦 Processing checkout.session.completed for session ${session.id}`);
      
      if (!orderId) {
        console.warn(`⚠️ No order_id in metadata for session ${session.id}`);
        return new Response(
          JSON.stringify({ received: true, warning: "No order_id in metadata" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update order in Supabase
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "paid",
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string || null,
        })
        .eq("id", orderId);

      if (updateError) {
        console.error(`❌ Failed to update order ${orderId}:`, updateError);
        return new Response(
          JSON.stringify({ error: "Database update failed", orderId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ Payment confirmed for order ${orderId} (session ${session.id})`);
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Webhook handler error:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
