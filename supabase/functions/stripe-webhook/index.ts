// Handled Stripe events (must be enabled in Stripe webhook config):
//   - checkout.session.completed
//   - invoice.payment_succeeded

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const addOneMonth = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split("T")[0];
};

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
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
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

      // Fetch hosted invoice URL for subscription payments
      let invoiceUrl: string | null = null;
      if (session.invoice && typeof session.invoice === "string") {
        const invoiceRes = await fetch(`https://api.stripe.com/v1/invoices/${session.invoice}`, {
          headers: { Authorization: `Bearer ${stripeSecretKey}` },
        });
        if (invoiceRes.ok) {
          const invoiceObj = await invoiceRes.json();
          invoiceUrl = invoiceObj.hosted_invoice_url || null;
        } else {
          console.warn(`⚠️ Could not fetch invoice ${session.invoice}: ${invoiceRes.status}`);
        }
      } else {
        // TODO: for one-off payments, retrieve receipt_url by expanding payment_intent on the session
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
          invoice_url: invoiceUrl,
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

    // Handle invoice.payment_succeeded — subscription renewal
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      // Only handle recurring renewals; first payment is covered by checkout.session.completed
      if (invoice.billing_reason !== "subscription_cycle") {
        console.log(`ℹ️ Skipping invoice.payment_succeeded (billing_reason: ${invoice.billing_reason})`);
      } else {
        const customerEmail = invoice.customer_email;
        console.log(`🔄 Processing subscription renewal for ${customerEmail}`);

        if (!customerEmail) {
          console.warn(`⚠️ No customer_email on invoice ${invoice.id} — skipping`);
        } else {
          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          // Find the most recent paid subscription order for this customer
          const { data: orders, error: fetchError } = await supabaseClient
            .from("orders")
            .select("id, next_due_date")
            .eq("customer_email", customerEmail)
            .eq("payment_mode", "subscription")
            .eq("status", "paid")
            .not("stripe_payment_intent_id", "is", null)
            .order("order_date", { ascending: false })
            .limit(1);

          if (fetchError || !orders || orders.length === 0) {
            console.warn(`⚠️ No matching subscription order found for ${customerEmail}`);
          } else {
            const order = orders[0];
            const currentDueDate = order.next_due_date ?? new Date().toISOString().split("T")[0];
            const newDueDate = addOneMonth(currentDueDate);
            const today = new Date().toISOString().split("T")[0];

            const { error: updateError } = await supabaseClient
              .from("orders")
              .update({
                fulfillment_status: "pending",
                next_due_date: newDueDate,
                last_shipped_date: today,
                invoice_url: invoice.hosted_invoice_url || null,
              })
              .eq("id", order.id);

            if (updateError) {
              console.error(`❌ Failed to reset order ${order.id} for renewal:`, updateError);
            } else {
              console.log(`✅ Subscription renewed for order ${order.id} — next due ${newDueDate}`);
            }
          }
        }
      }

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
