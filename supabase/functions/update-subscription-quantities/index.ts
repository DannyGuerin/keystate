import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVolumePricing } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UPDATE-SUBSCRIPTION-QUANTITIES] ${step}${detailsStr}`);
};

type RequestPayload = {
  orderId: string;
  items: { orderItemId: string; quantity: number }[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the calling user from their JWT — used below to enforce that they only
    // ever modify their own order (all writes happen via the service-role client, which
    // bypasses RLS, so this check is the only thing standing between customers).
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as RequestPayload;
    if (!payload.orderId || !Array.isArray(payload.items) || payload.items.length === 0) {
      return new Response(JSON.stringify({ error: "orderId and a non-empty items array are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const item of payload.items) {
      if (!item.orderItemId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return new Response(JSON.stringify({ error: "Each item needs a valid orderItemId and a positive whole number quantity" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, customer_email, payment_mode, status, stripe_subscription_id, stripe_subscription_schedule_id, order_items(id, keyring_variant_id, quantity, stripe_subscription_item_id)")
      .eq("id", payload.orderId)
      .single();

    if (orderError || !order) {
      logStep("Order not found", { orderId: payload.orderId, orderError });
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check — the JWT's user must be the order's customer.
    if (order.customer_email !== user.email) {
      logStep("Ownership check failed", { orderId: payload.orderId, callerEmail: user.email });
      return new Response(JSON.stringify({ error: "Not authorized to modify this order" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_mode !== "subscription") {
      return new Response(JSON.stringify({ error: "Only subscription orders support scheduled quantity changes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status === "cancelled") {
      return new Response(JSON.stringify({ error: "This subscription has been cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No Stripe subscription is linked to this order yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderItems = (order.order_items ?? []) as {
      id: string;
      keyring_variant_id: string | null;
      quantity: number;
      stripe_subscription_item_id: string | null;
    }[];

    // Require every existing line item to be represented — this feature edits quantities
    // on the variants already on the order, not adding/removing variants.
    const requestedByItemId = new Map(payload.items.map((i) => [i.orderItemId, i.quantity]));
    for (const oi of orderItems) {
      if (!requestedByItemId.has(oi.id)) {
        return new Response(JSON.stringify({ error: `Missing quantity for order item ${oi.id}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!oi.stripe_subscription_item_id) {
        return new Response(JSON.stringify({ error: "This order isn't fully synced with Stripe yet — please try again shortly" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const totalQuantity = orderItems.reduce((sum, oi) => sum + (requestedByItemId.get(oi.id) ?? 0), 0);
    const pricing = getVolumePricing(totalQuantity, "subscription");
    if (!pricing) {
      return new Response(JSON.stringify({ error: "Could not price the requested quantities" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const newUnitPrice = pricing.unitPrice;
    const newTotalAmount = pricing.total;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Fetch the subscription's current items fresh from Stripe — phase 1 of the schedule
    // must mirror exactly what the customer is being billed today.
    const subscription = await stripe.subscriptions.retrieve(order.stripe_subscription_id, {
      expand: ["items.data.price"],
    });

    const currentItems = subscription.items.data.map((si) => ({
      price: typeof si.price === "string" ? si.price : si.price.id,
      quantity: si.quantity ?? 1,
    }));

    const newItems = orderItems.map((oi) => {
      const si = subscription.items.data.find((s) => s.id === oi.stripe_subscription_item_id);
      const productId = si && typeof si.price !== "string" ? (si.price.product as string) : undefined;
      if (!productId) {
        throw new Error(`Could not resolve Stripe product for order item ${oi.id}`);
      }
      const quantity = requestedByItemId.get(oi.id)!;
      return {
        price_data: {
          currency: "gbp",
          product: productId,
          recurring: { interval: "month" as const },
          unit_amount: Math.round(newUnitPrice * quantity * 100),
        },
        quantity: 1,
      };
    });

    let scheduleId = order.stripe_subscription_schedule_id;
    let phase1Start: number;
    let phase1End: number;

    if (scheduleId) {
      const existingSchedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
      phase1Start = existingSchedule.phases[0].start_date;
      phase1End = existingSchedule.phases[0].end_date;
    } else {
      const schedule = await stripe.subscriptionSchedules.create({ from_subscription: order.stripe_subscription_id });
      scheduleId = schedule.id;
      phase1Start = schedule.phases[0].start_date;
      phase1End = schedule.phases[0].end_date;
    }

    await stripe.subscriptionSchedules.update(scheduleId, {
      // Belt-and-suspenders: phase 1 is being resubmitted unchanged, but setting this
      // explicitly rules out Stripe generating any proration for the current phase too.
      proration_behavior: "none",
      phases: [
        {
          items: currentItems,
          start_date: phase1Start,
          end_date: phase1End,
        },
        {
          items: newItems,
          start_date: phase1End,
          proration_behavior: "none",
        },
      ],
    });

    logStep("Schedule updated", { orderId: order.id, scheduleId, phase1End, newTotalAmount });

    const effectiveDate = new Date(phase1End * 1000).toISOString().split("T")[0];

    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        stripe_subscription_schedule_id: scheduleId,
        pending_total_amount: newTotalAmount,
        pending_effective_date: effectiveDate,
      })
      .eq("id", order.id);

    if (orderUpdateError) {
      logStep("Failed to persist pending order state", orderUpdateError);
      return new Response(JSON.stringify({ error: "Schedule updated in Stripe, but failed to save the pending change" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const oi of orderItems) {
      const quantity = requestedByItemId.get(oi.id)!;
      await supabaseAdmin.from("order_items").update({ pending_quantity: quantity }).eq("id", oi.id);
    }

    return new Response(
      JSON.stringify({
        effectiveDate,
        pendingTotalAmount: newTotalAmount,
        pendingQuantities: Object.fromEntries(requestedByItemId),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
