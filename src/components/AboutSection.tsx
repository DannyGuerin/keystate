import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutSection() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const generateImage = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            prompt: "Photorealistic image of a British estate agent in professional attire handing keys to a happy couple outside a modern UK house, warm natural lighting, professional photography style, focus on the key handover moment, UK residential property in background, contemporary British architecture" 
          }
        });

        if (error) throw error;
        
        if (data?.image) {
          setImageUrl(data.image);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Error generating image:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    generateImage();
  }, []);

  return (
    <section className="py-16 md:py-24 bg-[hsl(14,100%,97%)]">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
          {/* Left Column - Text */}
          <div className="space-y-4">
            <p className="text-lg leading-relaxed text-foreground">
              KEYSTATE helps estate agents strengthen their brand and client relationships with high-quality, custom-branded keyrings. Each keyring is designed to leave a lasting impression long after the handover, combining durable materials with your agency's logo for a professional, trustworthy finish.
            </p>
            <p className="text-lg leading-relaxed text-foreground">
              Whether for property completions, promotions, or local events, KEYSTATE provides a simple, reliable way to keep your name in your clients' hands — literally.
            </p>
          </div>

          {/* Right Column - Image */}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-lg">
            {isLoading && (
              <Skeleton className="w-full h-full" />
            )}
            {!isLoading && hasError && (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Image unavailable</p>
              </div>
            )}
            {!isLoading && !hasError && imageUrl && (
              <img 
                src={imageUrl} 
                alt="British estate agent handing keys to a couple at their new UK home"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
