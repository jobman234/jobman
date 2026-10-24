import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-20 lg:py-28 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8">
            Join thousands of Nigerians using Jobman to build with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-accent text-accent-foreground hover:opacity-90 font-semibold text-base px-8"
              asChild
            >
              <Link to="/register">
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold"
              asChild
            >
              <Link to="/find-artisan">Browse Artisans</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
