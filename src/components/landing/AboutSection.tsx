import { Shield, Wallet, Scale, Star } from "lucide-react";
import { motion } from "framer-motion";

const pillars = [
  {
    icon: Shield,
    title: "Identity Verified",
    description: "Every artisan undergoes NIN verification, live selfie matching, and reference checks.",
  },
  {
    icon: Wallet,
    title: "Escrow Payments",
    description: "Your funds are held safely until the job is completed to your satisfaction.",
  },
  {
    icon: Scale,
    title: "Concierge Matching",
    description: "Our team sources and vets the right artisan for you — no haggling, no guesswork.",
  },
  {
    icon: Star,
    title: "Rated & Reviewed",
    description: "Make informed decisions with genuine reviews from verified customers.",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">About Jobman</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 mb-4 text-foreground">
              Nigeria's Most Trusted Artisan Marketplace
            </h2>
            <p className="text-muted-foreground text-lg">
              We're bridging the trust gap in Nigeria's construction industry with identity verification, secure payments, and fair dispute resolution.
            </p>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <pillar.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
