import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import keystateLogoUrl from "@/assets/keystate-logo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function LandingHero() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateBackgroundImage = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: "Flat illustration of a charming neighborhood street with modern houses, minimalist style with clean lines, warm orange accents on details, soft pastel colors, white and light background, peaceful residential atmosphere, digital art, high quality, 16:9 aspect ratio, ultra high resolution, architectural illustration"
          }
        });

        if (error) throw error;
        if (data?.image) {
          setBackgroundImage(data.image);
        }
      } catch (error) {
        console.error("Failed to generate background image:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateBackgroundImage();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background Image */}
      {isLoading ? (
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
      ) : backgroundImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center">
          <img 
            src={keystateLogoUrl} 
            alt="KEYSTATE" 
            className="h-16 md:h-20 mb-8"
          />
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl">
            Premium Branded Keyrings for Your Business
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
            High-quality, custom-branded keyrings that make a lasting impression. 
            Simple ordering, fast delivery, exceptional craftsmanship.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
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
      </div>
    </section>
  );
}
