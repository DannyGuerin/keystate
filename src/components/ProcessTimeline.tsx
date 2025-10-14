import { Palette, Calculator, Package } from "lucide-react";

export default function ProcessTimeline() {
  const steps = [
    {
      icon: Palette,
      title: "Select Keyring Logo Design",
      description: "Choose from our range of designs or upload your custom logo",
    },
    {
      icon: Calculator,
      title: "Choose the Right Amount",
      description: "Select the quantity that matches your campaign needs",
    },
    {
      icon: Package,
      title: "Get Quality Keyrings Delivered",
      description: "Receive your premium branded keyrings ready for distribution",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your journey to quality keyrings in three simple steps
          </p>
        </div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden md:flex items-start justify-between max-w-5xl mx-auto relative">
          {/* Connecting line */}
          <div className="absolute top-12 left-[16.666%] right-[16.666%] h-0.5 bg-border" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex flex-col items-center w-1/3 relative z-10">
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg">
                  <Icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-primary mb-4">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">{step.title}</h3>
                <p className="text-muted-foreground text-center text-sm px-4">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden space-y-8 max-w-md mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={index} className="flex gap-4 relative">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-border -mb-8" />
                )}
                
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-primary text-sm">
                    {index + 1}
                  </div>
                </div>
                
                <div className="pt-2 flex-1">
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
