import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, ShoppingCart, DollarSign } from "lucide-react";
import keystateLogoImage from "@/assets/keystate-logo.png";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  quantity: number;
  payment_mode: string;
  status: string;
  order_date: string;
  total_amount: number | null;
  campaigns: {
    company_name: string;
  };
  order_items: {
    quantity: number;
    keyring_variants: { type: string; color: string } | null;
  }[];
}

const Admin = () => {
  const navigate = useNavigate();
  const { loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUnits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        *,
        campaigns (company_name),
        order_items (quantity, keyring_variants (type, color))
      `)
      .order("order_date", { ascending: false })
      .limit(10);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } else {
      setOrders(ordersData || []);
      
      const revenue = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const units = ordersData?.reduce((sum, order) => sum + order.quantity, 0) || 0;
      
      setStats({
        totalRevenue: revenue,
        totalOrders: ordersData?.length || 0,
        totalUnits: units,
      });
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={keystateLogoImage} alt="KEYSTATE" className="h-8" />
            <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/admin/campaigns")}>
              Manage Campaigns
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/fulfillment")}>
              Fulfillment
            </Button>
            <Button variant="outline" onClick={signOut}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From all orders</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUnits}</div>
              <p className="text-xs text-muted-foreground">Keyrings ordered</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest keyring orders from estate agents</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Keyring</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.campaigns?.company_name}</TableCell>
                      <TableCell>
                        {order.order_items && order.order_items.length > 0 ? (
                          <div className="space-y-1">
                            {order.order_items.map((item, index) => (
                              <div key={index}>
                                <p className="text-sm">
                                  {item.keyring_variants?.type || "—"}
                                  <span className="text-xs text-muted-foreground"> × {item.quantity}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{item.keyring_variants?.color}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={order.payment_mode === "subscription" ? "default" : "secondary"}>
                          {order.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            order.status === "delivered" ? "default" : 
                            order.status === "processing" ? "secondary" : 
                            "outline"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.total_amount ? `£${order.total_amount.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString()}
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

export default Admin;
