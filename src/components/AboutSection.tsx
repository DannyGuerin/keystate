import estateAgentImage from "@/assets/estate-agent-keyhandover.jpg";

export default function AboutSection() {

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
            <img 
              src={estateAgentImage} 
              alt="British estate agent handing keys to a couple at their new UK home"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
