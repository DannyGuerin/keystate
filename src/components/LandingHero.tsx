import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import keystateLogoUrl from "@/assets/keystate-logo.png";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function LandingHero() {
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateHeroImage = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: "Modern flat illustration of premium branded keyrings displayed elegantly on a clean surface, minimalist style with clean lines, professional business aesthetic, warm orange and white color scheme, white background, digital art, high quality, corporate branding theme, 16:9 aspect ratio, ultra high resolution"
          }
        });

        if (error) throw error;
        if (data?.image) {
          setHeroImage(data.image);
        }
      } catch (error) {
        console.error("Failed to generate hero image:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateHeroImage();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col text-center md:text-left">
            <img 
              src={keystateLogoUrl} 
              alt="KEYSTATE" 
              className="h-16 md:h-20 mb-8 md:mx-0 mx-auto"
            />
          
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Premium Branded Keyrings for Your Business
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10">
              High-quality, custom-branded keyrings that make a lasting impression. 
              Simple ordering, fast delivery, exceptional craftsmanship.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 md:justify-start justify-center">
              <Button 
                size="lg" 
                onClick={() => scrollToSection("signup")}
                className="text-base"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => scrollToSection("code-entry")}
                className="text-base"
              >
                Enter Order Code
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="w-full h-[400px] rounded-lg" />
            ) : heroImage ? (
              <img 
                src={heroImage} 
                alt="Premium branded keyrings illustration" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Image unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
