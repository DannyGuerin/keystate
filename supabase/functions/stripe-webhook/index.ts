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

      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({
          status: "paid",
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string || null,
          stripe_subscription_id: subscriptionId,
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

      // For subscriptions, map each Stripe subscription item back to its order_items
      // row via the keyring_variant_id tag we stamped on the product at checkout time.
      // This is required later to target the correct item when scheduling quantity changes.
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price.product"],
          });

          const { data: orderItems, error: orderItemsError } = await supabaseClient
            .from("order_items")
            .select("id, keyring_variant_id")
            .eq("order_id", orderId);

          if (orderItemsError) {
            console.error(`❌ Failed to fetch order_items for ${orderId}:`, orderItemsError);
          } else {
            for (const subItem of subscription.items.data) {
              const product = subItem.price.product as Stripe.Product;
              const variantId = product?.metadata?.keyring_variant_id;
              const match = orderItems?.find((oi) => oi.keyring_variant_id === variantId);
              if (match) {
                await supabaseClient
                  .from("order_items")
                  .update({ stripe_subscription_item_id: subItem.id })
                  .eq("id", match.id);
              } else {
                console.warn(`⚠️ Could not match subscription item ${subItem.id} to an order_items row for order ${orderId}`);
              }
            }
            console.log(`✅ Mapped ${subscription.items.data.length} subscription item(s) for order ${orderId}`);
          }
        } catch (mapErr) {
          console.error(`❌ Failed to map subscription items for order ${orderId}:`, mapErr instanceof Error ? mapErr.message : String(mapErr));
        }
      }

    // Handle invoice.payment_succeeded — subscription renewal
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      // Only handle recurring renewals; first payment is covered by checkout.session.completed
      if (invoice.billing_reason !== "subscription_cycle") {
        console.log(`ℹ️ Skipping invoice.payment_succeeded (billing_reason: ${invoice.billing_reason})`);
      } else {
        const customerEmail = invoice.customer_email;
        const invoiceSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
        console.log(`🔄 Processing subscription renewal for ${customerEmail} (subscription ${invoiceSubscriptionId})`);

        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const orderSelect = "id, next_due_date, pending_total_amount, pending_effective_date, stripe_subscription_schedule_id";

        // Prefer matching by the Stripe subscription id (unambiguous). Older orders predating
        // that column fall back to the previous "most recent order for this email" lookup.
        let order: { id: string; next_due_date: string | null; pending_total_amount: number | null; pending_effective_date: string | null; stripe_subscription_schedule_id: string | null } | null = null;

        if (invoiceSubscriptionId) {
          const { data, error } = await supabaseClient
            .from("orders")
            .select(orderSelect)
            .eq("stripe_subscription_id", invoiceSubscriptionId)
            .eq("status", "paid")
            .maybeSingle();
          if (error) console.error(`❌ Failed to look up order by subscription id ${invoiceSubscriptionId}:`, error);
          order = data ?? null;
        }

        if (!order && customerEmail) {
          const { data: orders, error: fetchError } = await supabaseClient
            .from("orders")
            .select(orderSelect)
            .eq("customer_email", customerEmail)
            .eq("payment_mode", "subscription")
            .eq("status", "paid")
            .not("stripe_payment_intent_id", "is", null)
            .order("order_date", { ascending: false })
            .limit(1);
          if (fetchError) console.error(`❌ Failed to look up order by email ${customerEmail}:`, fetchError);
          order = orders?.[0] ?? null;
        }

        if (!order) {
          console.warn(`⚠️ No matching subscription order found for subscription ${invoiceSubscriptionId} / email ${customerEmail}`);
        } else {
          const currentDueDate = order.next_due_date ?? new Date().toISOString().split("T")[0];
          const newDueDate = addOneMonth(currentDueDate);
          const today = new Date().toISOString().split("T")[0];

          const orderUpdate: Record<string, unknown> = {
            fulfillment_status: "pending",
            next_due_date: newDueDate,
            last_shipped_date: today,
            invoice_url: invoice.hosted_invoice_url || null,
          };

          // A pending change scheduled via the subscription schedule takes effect exactly at
          // this renewal boundary — promote it to the confirmed state now.
          if (order.pending_effective_date) {
            const { data: pendingItems, error: pendingItemsError } = await supabaseClient
              .from("order_items")
              .select("id, quantity, pending_quantity")
              .eq("order_id", order.id);

            if (pendingItemsError) {
              console.error(`❌ Failed to fetch order_items for pending promotion on order ${order.id}:`, pendingItemsError);
            } else if (pendingItems) {
              let newTotalQuantity = 0;
              for (const item of pendingItems) {
                const confirmedQuantity = item.pending_quantity ?? item.quantity;
                newTotalQuantity += confirmedQuantity;
                if (item.pending_quantity !== null) {
                  await supabaseClient
                    .from("order_items")
                    .update({ quantity: item.pending_quantity, pending_quantity: null })
                    .eq("id", item.id);
                }
              }
              // Billing-critical: don't trust our own pending_total_amount for the confirmed
              // total — re-derive what Stripe actually charged on this invoice and use that.
              // A mismatch against what we expected to charge is logged loudly rather than
              // silently accepted, since this is the number that ends up on the customer's order.
              const actualAmountPaid = typeof invoice.amount_paid === "number" ? invoice.amount_paid / 100 : null;
              if (actualAmountPaid === null) {
                console.warn(`⚠️ BILLING: invoice ${invoice.id} for order ${order.id} had no amount_paid — falling back to expected pending_total_amount £${order.pending_total_amount}`);
              } else if (
                order.pending_total_amount !== null &&
                Math.abs(actualAmountPaid - order.pending_total_amount) > 0.01
              ) {
                console.warn(
                  `⚠️ BILLING MISMATCH on order ${order.id}: expected to charge £${order.pending_total_amount.toFixed(2)} ` +
                  `(from pending_total_amount) but Stripe invoice ${invoice.id} actually charged £${actualAmountPaid.toFixed(2)}. ` +
                  `Using the actual Stripe-charged amount as the confirmed total_amount.`
                );
              }

              orderUpdate.quantity = newTotalQuantity;
              orderUpdate.total_amount = actualAmountPaid ?? order.pending_total_amount;
              orderUpdate.pending_total_amount = null;
              orderUpdate.pending_effective_date = null;
              orderUpdate.stripe_subscription_schedule_id = null;
              console.log(`✅ Promoted pending quantity change for order ${order.id} — new total quantity ${newTotalQuantity}, confirmed total £${orderUpdate.total_amount}`);
            }
          }

          const { error: updateError } = await supabaseClient
            .from("orders")
            .update(orderUpdate)
            .eq("id", order.id);

          if (updateError) {
            console.error(`❌ Failed to reset order ${order.id} for renewal:`, updateError);
          } else {
            console.log(`✅ Subscription renewed for order ${order.id} — next due ${newDueDate}`);
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
