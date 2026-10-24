import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ServicesSection from "@/components/landing/ServicesSection";
import FeaturedArtisansSection from "@/components/landing/FeaturedArtisansSection";
import WhyChooseUsSection from "@/components/landing/WhyChooseUsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturedArtisansSection />
        <HowItWorksSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
