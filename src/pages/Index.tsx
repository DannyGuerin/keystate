import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, CreditCard, CheckCircle2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    keyringType: "",
    color: "",
    quantity: "",
    customQuantity: "",
    paymentMode: "one-off",
    promoCode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.company || !formData.keyringType || !formData.quantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // For now, simulate success and navigate to thank you page
    toast({
      title: "Order Submitted!",
      description: "Redirecting to payment...",
    });
    
    setTimeout(() => {
      navigate("/thank-you");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              KEYSTATE
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Admin
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8 animate-slide-up">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Order Your Keyrings
          </h2>
          <p className="text-muted-foreground text-lg">
            Complete your order in minutes
          </p>
        </div>

        <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Order Details
            </CardTitle>
            <CardDescription>
              Fill in your information to complete your keyring order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@agency.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      placeholder="Premier Estate Agents"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Keyring Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Keyring Details
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyringType">Keyring Type *</Label>
                    <Select
                      value={formData.keyringType}
                      onValueChange={(value) => setFormData({ ...formData, keyringType: value })}
                    >
                      <SelectTrigger id="keyringType">
                        <SelectValue placeholder="Select keyring type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic-round">Classic Round</SelectItem>
                        <SelectItem value="classic-square">Classic Square</SelectItem>
                        <SelectItem value="premium-round">Premium Round</SelectItem>
                        <SelectItem value="premium-square">Premium Square</SelectItem>
                        <SelectItem value="luxury-house">Luxury House Shape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Select
                      value={formData.color}
                      onValueChange={(value) => setFormData({ ...formData, color: value })}
                    >
                      <SelectTrigger id="color">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="rose-gold">Rose Gold</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Select
                      value={formData.quantity}
                      onValueChange={(value) => setFormData({ ...formData, quantity: value })}
                    >
                      <SelectTrigger id="quantity">
                        <SelectValue placeholder="Select quantity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 units</SelectItem>
                        <SelectItem value="25">25 units</SelectItem>
                        <SelectItem value="50">50 units</SelectItem>
                        <SelectItem value="100">100 units</SelectItem>
                        <SelectItem value="custom">Custom quantity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.quantity === "custom" && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="customQuantity">Custom Quantity</Label>
                      <Input
                        id="customQuantity"
                        type="number"
                        min="1"
                        placeholder="Enter quantity"
                        value={formData.customQuantity}
                        onChange={(e) => setFormData({ ...formData, customQuantity: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Payment Options
                </h3>
                <RadioGroup
                  value={formData.paymentMode}
                  onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="one-off" id="one-off" />
                    <Label htmlFor="one-off" className="flex-1 cursor-pointer">
                      <div className="font-medium">One-off Purchase</div>
                      <div className="text-sm text-muted-foreground">Single payment for this order</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="subscription" id="subscription" />
                    <Label htmlFor="subscription" className="flex-1 cursor-pointer">
                      <div className="font-medium">Subscription</div>
                      <div className="text-sm text-muted-foreground">Regular delivery of keyrings</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Promo Code */}
              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                <Input
                  id="promoCode"
                  placeholder="Enter promo code"
                  value={formData.promoCode}
                  onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium shadow-glow hover:shadow-lg transition-all"
                size="lg"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Continue to Payment
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-8 flex justify-center items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Secure Payment
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Fast Delivery
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
