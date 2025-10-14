import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Palette, Zap, ShoppingCart } from "lucide-react";

const features = [
  {
    icon: Award,
    title: "Premium Quality",
    description: "Crafted from high-quality materials with exceptional attention to detail. Each keyring is built to last and impress.",
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Personalize your keyrings with your company logo and choice of colors. Perfect for corporate gifts and promotions.",
  },
  {
    icon: Zap,
    title: "Fast Delivery",
    description: "Quick turnaround times without compromising on quality. Get your branded keyrings when you need them.",
  },
  {
    icon: ShoppingCart,
    title: "Simple Ordering",
    description: "Easy campaign-based ordering system. Enter your unique code and place your order in minutes.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Keystate?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We combine quality craftsmanship with efficient service to deliver premium branded keyrings for your business.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-2 hover:border-primary/20 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
