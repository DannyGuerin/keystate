import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Palette, Zap, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import premiumQualityIcon from "@/assets/premium-quality-icon.png";
import customBrandingIcon from "@/assets/custom-branding-icon.png";

const features = [
  {
    icon: Award,
    title: "Premium Quality",
    description: "Crafted from high-quality materials with exceptional attention to detail. Each keyring is built to last and impress.",
    prompt: "Flat illustration of a premium quality badge or seal with stars, minimalist style, warm orange accent color, white background, corporate professional theme, high quality digital art"
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Personalize your keyrings with your company logo and choice of colors. Perfect for corporate gifts and promotions.",
    prompt: "Flat illustration of a paint palette with customization tools, minimalist style, warm orange accent color, white background, branding and personalization theme, high quality digital art"
  },
  {
    icon: Zap,
    title: "Fast Delivery",
    description: "Quick turnaround times without compromising on quality. Get your branded keyrings when you need them.",
    prompt: "Flat illustration of a lightning bolt with speed lines or fast delivery concept, minimalist style, warm orange accent color, white background, efficiency theme, high quality digital art"
  },
  {
    icon: ShoppingCart,
    title: "Simple Ordering",
    description: "Easy campaign-based ordering system. Enter your unique code and place your order in minutes.",
    prompt: "Flat illustration of a simple shopping cart or streamlined process flow, minimalist style, warm orange accent color, white background, ease of use theme, high quality digital art"
  },
];

export default function FeaturesSection() {
  const [featureImages, setFeatureImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const generateFeatureImages = async () => {
      features.forEach(async (feature) => {
        setLoadingImages(prev => ({ ...prev, [feature.title]: true }));
        
        try {
          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt: feature.prompt }
          });

          if (error) throw error;
          if (data?.image) {
            setFeatureImages(prev => ({ ...prev, [feature.title]: data.image }));
          }
        } catch (error) {
          console.error(`Failed to generate image for ${feature.title}:`, error);
        } finally {
          setLoadingImages(prev => ({ ...prev, [feature.title]: false }));
        }
      });
    };

    generateFeatureImages();
  }, []);

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
                  {feature.title === "Premium Quality" ? (
                    <div className="w-16 h-16 mx-auto mb-4">
                      <img 
                        src={premiumQualityIcon} 
                        alt={feature.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : feature.title === "Custom Branding" ? (
                    <div className="w-16 h-16 mx-auto mb-4">
                      <img 
                        src={customBrandingIcon} 
                        alt={feature.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : loadingImages[feature.title] ? (
                    <Skeleton className="w-full h-32 rounded-lg mb-4" />
                  ) : featureImages[feature.title] ? (
                    <img 
                      src={featureImages[feature.title]} 
                      alt={feature.title}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  )}
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
