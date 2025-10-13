import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data for demonstration
const mockOrders = [
  {
    id: "ORD-001",
    name: "John Smith",
    email: "john@agency.com",
    company: "Premier Estates",
    keyringType: "Classic Round",
    quantity: 50,
    paymentMode: "subscription",
    status: "completed",
    date: "2025-10-10",
    amount: "£125.00"
  },
  {
    id: "ORD-002",
    name: "Sarah Johnson",
    email: "sarah@homesfirst.co.uk",
    company: "Homes First",
    keyringType: "Premium Square",
    quantity: 100,
    paymentMode: "one-off",
    status: "completed",
    date: "2025-10-11",
    amount: "£240.00"
  },
  {
    id: "ORD-003",
    name: "Mike Wilson",
    email: "mike@propsolutions.com",
    company: "Property Solutions",
    keyringType: "Luxury House Shape",
    quantity: 25,
    paymentMode: "subscription",
    status: "pending",
    date: "2025-10-12",
    amount: "£85.00"
  },
];

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              KEYSTATE
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 animate-slide-up">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground text-lg">
            Manage and track all keyring orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">£450.00</CardTitle>
              <CardDescription>Total Revenue</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">3</CardTitle>
              <CardDescription>Total Orders</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">175</CardTitle>
              <CardDescription>Total Units Ordered</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95 animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>View and manage all submitted orders</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Keyring Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-sm">{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.name}</div>
                          <div className="text-sm text-muted-foreground">{order.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.company}</TableCell>
                      <TableCell className="text-sm">{order.keyringType}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentMode === "subscription" ? "default" : "secondary"}>
                          {order.paymentMode === "subscription" ? "Subscription" : "One-off"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === "completed" ? "default" : "outline"}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{order.amount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This is demo data. Once connected to a database, you'll see real order information here.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Admin;
