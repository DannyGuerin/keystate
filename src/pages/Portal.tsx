import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import keystateLogoImage from "@/assets/keystate-logo.png";
import { PRICING_CONFIG, getPricingTier, formatPrice } from "@/config/pricing";

type FulfillmentStatus = "pending" | "shipped" | "done";

interface PortalOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  quantity: number;
  payment_mode: string;
  total_amount: number | null;
  status: string;
  order_date: string;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  fulfillment_status: FulfillmentStatus;
  next_due_date: string | null;
  last_shipped_date: string | null;
  campaigns: { company_name: string; logo_url: string | null } | null;
  keyring_variants: { type: string; color: string } | null;
}

const formatDate = (dateStr: string): string =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  shipped: "Shipped",
  done: "Done",
};

const FULFILLMENT_CLASS: Record<FulfillmentStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  shipped: "bg-blue-100 text-blue-800 border border-blue-200",
  done: "bg-green-100 text-green-800 border border-green-200",
};

// ─── OrderCard ────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: PortalOrder;
  onOrderUpdate: (patch: Partial<PortalOrder> & { id: string }) => void;
}

const OrderCard = ({ order, onOrderUpdate }: OrderCardProps) => {
  const { toast } = useToast();
  const isSubscription = order.payment_mode === "subscription";

  const [editOpen, setEditOpen] = useState(false);
  const [shippingName, setShippingName] = useState(order.shipping_name || "");
  const [shippingAddress, setShippingAddress] = useState(order.shipping_address_line1 || "");
  const [shippingPostcode, setShippingPostcode] = useState(order.shipping_postal_code || "");
  const [savingDetails, setSavingDetails] = useState(false);

  const [quantityOpen, setQuantityOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState(order.quantity);
  const [savingQuantity, setSavingQuantity] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (order.status === "cancelled") {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6 text-center py-10 text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Subscription Cancelled</p>
          <p className="text-sm">
            This subscription has been cancelled and no further charges will be made.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    const { error } = await supabase
      .from("orders")
      .update({
        shipping_name: shippingName,
        shipping_address_line1: shippingAddress,
        shipping_postal_code: shippingPostcode,
      })
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save details", variant: "destructive" });
    } else {
      onOrderUpdate({ id: order.id, shipping_name: shippingName, shipping_address_line1: shippingAddress, shipping_postal_code: shippingPostcode });
      setEditOpen(false);
      toast({ title: "Saved", description: "Company details updated" });
    }
    setSavingDetails(false);
  };

  const handleUpdateQuantity = async () => {
    const tier = getPricingTier(newQuantity, "subscription");
    if (!tier) return;
    setSavingQuantity(true);
    const { error } = await supabase
      .from("orders")
      .update({ quantity: newQuantity, total_amount: tier.total })
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update subscription", variant: "destructive" });
    } else {
      onOrderUpdate({ id: order.id, quantity: newQuantity, total_amount: tier.total });
      setQuantityOpen(false);
      toast({ title: "Updated", description: `Subscription updated to ${newQuantity} units/month` });
    }
    setSavingQuantity(false);
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    // TODO: also cancel the Stripe subscription via the stripe-webhook or a new Edge Function
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" } as any)
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: "Failed to cancel subscription", variant: "destructive" });
    } else {
      onOrderUpdate({ id: order.id, status: "cancelled" });
      toast({ title: "Subscription cancelled", description: "No further charges will be made" });
    }
    setCancelling(false);
    setCancelDialogOpen(false);
  };

  const selectedTier = getPricingTier(newQuantity, "subscription");

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6 space-y-5">
        {/* Header: campaign logo + name + payment type */}
        <div className="flex items-center gap-4">
          {order.campaigns?.logo_url && (
            <img
              src={order.campaigns.logo_url}
              alt={order.campaigns.company_name}
              className="h-12 w-auto max-w-[100px] object-contain flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg leading-tight truncate">
              {order.campaigns?.company_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ordered {new Date(order.order_date).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={isSubscription ? "default" : "secondary"} className="flex-shrink-0">
            {isSubscription ? "Monthly" : "One-off"}
          </Badge>
        </div>

        {/* Order summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm py-4 border-y border-border/50">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Keyring</p>
            {order.keyring_variants ? (
              <>
                <p className="font-medium">{order.keyring_variants.type}</p>
                <p className="text-muted-foreground text-xs">{order.keyring_variants.color}</p>
              </>
            ) : <p>—</p>}
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Quantity</p>
            <p className="font-medium">{order.quantity}{isSubscription ? "/mo" : ""}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Amount</p>
            <p className="font-medium">
              {order.total_amount ? `£${order.total_amount.toFixed(2)}` : "—"}
              {isSubscription ? "/mo" : ""}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Fulfillment</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FULFILLMENT_CLASS[order.fulfillment_status]}`}>
              {FULFILLMENT_LABEL[order.fulfillment_status]}
            </span>
          </div>
        </div>

        {/* Subscription dates */}
        {isSubscription && (order.next_due_date || order.last_shipped_date) && (
          <div className="flex flex-wrap gap-6 text-sm">
            {order.next_due_date && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Next due</p>
                <p className="font-medium">{formatDate(order.next_due_date)}</p>
              </div>
            )}
            {order.last_shipped_date && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Last shipped</p>
                <p className="font-medium">{formatDate(order.last_shipped_date)}</p>
              </div>
            )}
          </div>
        )}

        {/* Edit company details (collapsible) */}
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
            onClick={() => setEditOpen(v => !v)}
          >
            <span>Edit Company Details</span>
            {editOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {editOpen && (
            <div className="px-4 pt-3 pb-4 space-y-3 border-t border-border/50">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${order.id}`}>Company Name</Label>
                <Input id={`name-${order.id}`} value={shippingName} onChange={e => setShippingName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`addr-${order.id}`}>Address</Label>
                <Input id={`addr-${order.id}`} value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`pc-${order.id}`}>Postcode</Label>
                <Input id={`pc-${order.id}`} value={shippingPostcode} onChange={e => setShippingPostcode(e.target.value)} />
              </div>
              <Button onClick={handleSaveDetails} disabled={savingDetails} size="sm">
                {savingDetails && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Subscription: change quantity (collapsible) */}
        {isSubscription && (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
              onClick={() => setQuantityOpen(v => !v)}
            >
              <span>Change Quantity</span>
              {quantityOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {quantityOpen && (
              <div className="px-4 pt-3 pb-4 space-y-3 border-t border-border/50">
                <Select value={String(newQuantity)} onValueChange={val => setNewQuantity(Number(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_CONFIG.subscription.map(tier => (
                      <SelectItem key={tier.quantity} value={String(tier.quantity)}>
                        {tier.quantity} units/mo — {formatPrice(tier.total)}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTier && (
                  <p className="text-sm text-muted-foreground">
                    New monthly total:{" "}
                    <span className="font-medium text-foreground">{formatPrice(selectedTier.total)}</span>
                    {" "}({formatPrice(selectedTier.unitPrice)} per keyring)
                  </p>
                )}
                <Button
                  onClick={handleUpdateQuantity}
                  disabled={savingQuantity || newQuantity === order.quantity}
                  size="sm"
                >
                  {savingQuantity && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Update Subscription
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Subscription: cancel */}
        {isSubscription && (
          <div className="pt-1">
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive/50"
                >
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will be cancelled and no further charges will be made. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancelling && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Portal ───────────────────────────────────────────────────────────────────

const Portal = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [session]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_email,
        quantity,
        payment_mode,
        total_amount,
        status,
        order_date,
        shipping_name,
        shipping_address_line1,
        shipping_postal_code,
        fulfillment_status,
        next_due_date,
        last_shipped_date,
        campaigns (company_name, logo_url),
        keyring_variants (type, color)
      `)
      .eq("status", "paid")
      .order("order_date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load your orders", variant: "destructive" });
    } else {
      setOrders((data as unknown as PortalOrder[]) || []);
    }
    setOrdersLoading(false);
  };

  const handleOrderUpdate = (patch: Partial<PortalOrder> & { id: string }) => {
    setOrders(prev => prev.map(o => o.id === patch.id ? { ...o, ...patch } : o));
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: window.location.origin + "/portal" },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLoginSent(true);
    }
    setLoginLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOrders([]);
    setLoginSent(false);
    setLoginEmail("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Login view ──────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 flex justify-center">
            <img src={keystateLogoImage} alt="KEYSTATE" className="h-8" />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Card className="border-2">
              <CardHeader className="text-center pb-4">
                <img src={keystateLogoImage} alt="KEYSTATE" className="h-7 w-auto mx-auto mb-4" />
                <CardTitle className="text-2xl">Access Your Account</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email address to receive a secure login link
                </p>
              </CardHeader>
              <CardContent>
                {loginSent ? (
                  <div className="text-center py-4 space-y-3">
                    <p className="font-medium">Check your email</p>
                    <p className="text-sm text-muted-foreground">
                      We've sent a secure login link to{" "}
                      <span className="font-medium text-foreground">{loginEmail}</span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => { setLoginSent(false); setLoginEmail(""); }}
                    >
                      Use a different email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="portal-email">Email address</Label>
                      <Input
                        id="portal-email"
                        type="email"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loginLoading}>
                      {loginLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Send Login Link
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ── Authenticated portal view ───────────────────────────────────────────────
  const customerName = orders.find(o => o.customer_name)?.customer_name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <img src={keystateLogoImage} alt="KEYSTATE" className="h-8" />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-bold">
            {customerName ? `Welcome back, ${customerName.split(" ")[0]}` : "Your Orders"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your KeyState orders and subscriptions below
          </p>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12 text-muted-foreground">
              <p>No orders found for this email address.</p>
              <p className="text-sm mt-1">
                Make sure you're using the same email address you placed your order with.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} onOrderUpdate={handleOrderUpdate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Portal;
