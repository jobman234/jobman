import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Shield, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Nigerian construction site"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary-foreground/90">Verified & Trusted Artisans</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-primary-foreground">
              Find Trusted Construction{" "}
              <span className="text-secondary">Artisans</span>{" "}
              Near You
            </h1>

            <p className="text-lg sm:text-xl text-primary-foreground/70 mb-8 max-w-lg font-body">
              Skilled. Verified. Reliable. Connect with identity-verified construction professionals across Nigeria.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button
                size="lg"
                className="bg-gradient-accent text-accent-foreground hover:opacity-90 font-semibold text-base px-8 shadow-lg"
                asChild
              >
                <Link to="/find-artisan">
                  <Search className="w-5 h-5 mr-2" />
                  Find an Artisan
                </Link>
              </Button>
              <Button
                size="lg"
                className="bg-gradient-accent text-accent-foreground hover:opacity-90 font-semibold text-base px-8 shadow-lg"
                asChild
              >
                <Link to="/register?role=artisan">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Register as an Artisan
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8">
              {[
                { icon: Star, value: "2,500+", label: "Verified Artisans" },
                { icon: MapPin, value: "36", label: "States Covered" },
                { icon: Shield, value: "100%", label: "Escrow Protected" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg text-primary-foreground">{stat.value}</div>
                    <div className="text-xs text-primary-foreground/60">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
