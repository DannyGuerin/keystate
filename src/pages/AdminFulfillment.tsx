import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

type FulfillmentStatus = "pending" | "shipped" | "done";
type FilterTab = "all" | FulfillmentStatus;

interface Order {
  id: string;
  order_date: string;
  customer_name: string;
  quantity: number;
  payment_mode: string;
  total_amount: number | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  fulfillment_status: FulfillmentStatus;
  next_due_date: string | null;
  last_shipped_date: string | null;
  campaigns: { company_name: string };
  keyring_variants: { type: string; color: string } | null;
}

// Returns a YYYY-MM-DD string exactly one month after the input date string
const addOneMonth = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split("T")[0];
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr + "T00:00:00").toLocaleDateString();

const AdminFulfillment = () => {
  const { loading: authLoading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_date,
        customer_name,
        quantity,
        payment_mode,
        total_amount,
        shipping_name,
        shipping_address_line1,
        shipping_postal_code,
        fulfillment_status,
        next_due_date,
        last_shipped_date,
        campaigns (company_name),
        keyring_variants (type, color)
      `)
      .eq("status", "paid")
      .order("next_due_date", { ascending: true, nullsFirst: false })
      .order("order_date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } else {
      setOrders((data as Order[]) || []);
    }
    setLoading(false);
  };

  const updateFulfillmentStatus = async (order: Order, newStatus: FulfillmentStatus) => {
    const isSubscription = order.payment_mode === "subscription";
    // Subscriptions marked as shipped roll forward to the next cycle
    const rollForward = isSubscription && newStatus === "shipped";

    const newDueDate = rollForward && order.next_due_date
      ? addOneMonth(order.next_due_date)
      : undefined;

    const today = new Date().toISOString().split("T")[0];
    const updatePayload: Record<string, unknown> = rollForward
      ? { fulfillment_status: "pending", next_due_date: newDueDate, last_shipped_date: today }
      : { fulfillment_status: newStatus };

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update fulfillment status", variant: "destructive" });
      return;
    }

    setOrders(prev =>
      prev.map(o =>
        o.id === order.id
          ? {
              ...o,
              fulfillment_status: (updatePayload.fulfillment_status as FulfillmentStatus),
              ...(newDueDate !== undefined ? { next_due_date: newDueDate } : {}),
              ...(rollForward ? { last_shipped_date: today } : {}),
            }
          : o
      )
    );

    if (rollForward && newDueDate) {
      toast({ title: "Marked as shipped", description: `Next due ${formatDate(newDueDate)}` });
    } else {
      toast({ title: "Updated", description: `Order marked as ${newStatus}` });
    }
  };

  const formatShippingAddress = (order: Order) => {
    const parts = [order.shipping_name, order.shipping_address_line1, order.shipping_postal_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const counts = {
    pending: orders.filter(o => o.fulfillment_status === "pending").length,
    shipped: orders.filter(o => o.fulfillment_status === "shipped").length,
    done: orders.filter(o => o.fulfillment_status === "done").length,
  };

  const filteredOrders = filter === "all" ? orders : orders.filter(o => o.fulfillment_status === filter);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-heading font-bold">Fulfillment</h1>
          </div>
          <Button variant="outline" onClick={signOut}>Logout</Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <p className="text-sm text-muted-foreground mb-6">
          {counts.pending} Pending · {counts.shipped} Shipped · {counts.done} Done
        </p>

        <div className="flex gap-2 mb-4">
          {(["all", "pending", "shipped", "done"] as const).map(tab => (
            <Button
              key={tab}
              variant={filter === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab)}
              className="capitalize"
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Paid Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Keyring</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead>Fulfillment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{order.campaigns?.company_name}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        {order.keyring_variants ? (
                          <div>
                            <p className="text-sm">{order.keyring_variants.type}</p>
                            <p className="text-xs text-muted-foreground">{order.keyring_variants.color}</p>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={order.payment_mode === "subscription" ? "default" : "secondary"}>
                          {order.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {order.next_due_date ? formatDate(order.next_due_date) : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.total_amount ? `£${order.total_amount.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        {formatShippingAddress(order)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.fulfillment_status}
                          onValueChange={val => updateFulfillmentStatus(order, val as FulfillmentStatus)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        {order.last_shipped_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last shipped: {formatDate(order.last_shipped_date)}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminFulfillment;
