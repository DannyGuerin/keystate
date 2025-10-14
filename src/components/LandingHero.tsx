import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import keystateLogoUrl from "@/assets/keystate-logo.png";
import heroBackgroundUrl from "@/assets/hero-background.jpg";

export default function LandingHero() {

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
      />
      
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
