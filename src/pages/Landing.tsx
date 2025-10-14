import LandingHero from "@/components/LandingHero";
import AboutSection from "@/components/AboutSection";
import FeaturesSection from "@/components/FeaturesSection";
import ProcessTimeline from "@/components/ProcessTimeline";
import CodeEntrySection from "@/components/CodeEntrySection";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHero />
      <AboutSection />
      <FeaturesSection />
      <ProcessTimeline />
      <CodeEntrySection />
      <LeadForm />
      <Footer />
    </div>
  );
}
