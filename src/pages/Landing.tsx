import LandingHero from "@/components/LandingHero";
import FeaturesSection from "@/components/FeaturesSection";
import CodeEntrySection from "@/components/CodeEntrySection";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHero />
      <FeaturesSection />
      <CodeEntrySection />
      <LeadForm />
      <Footer />
    </div>
  );
}
