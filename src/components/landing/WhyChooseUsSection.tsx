import { ShieldCheck, Clock, Banknote, HeadphonesIcon, BadgeCheck, FileText } from "lucide-react";
import { motion } from "framer-motion";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Full Identity Verification",
    description: "NIN, government ID, live selfie matching, address verification, and client references.",
  },
  {
    icon: Banknote,
    title: "Secure Escrow System",
    description: "Funds held in escrow until job completion. No more payment disputes.",
  },
  {
    icon: FileText,
    title: "Digital Agreements",
    description: "Locked-in scope, price, and timeline with legally-binding digital contracts.",
  },
  {
    icon: Clock,
    title: "Fast & Transparent",
    description: "Real-time quotes, instant notifications, and clear project timelines.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dispute Resolution",
    description: "Dedicated admin support to fairly resolve any issues between parties.",
  },
  {
    icon: BadgeCheck,
    title: "Boost Your Profile",
    description: "Artisans can invest in profile boosts for higher visibility and more jobs.",
  },
];

const WhyChooseUsSection = () => {
  return (
    <section id="why-us" className="py-20 lg:py-28 bg-gradient-dark text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Why Jobman</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 mb-4">
              Why Choose Us
            </h2>
            <p className="text-primary-foreground/60 text-lg">
              Built specifically for Nigeria's construction industry, with trust at the core.
            </p>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="p-6 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm hover:bg-primary-foreground/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-4">
                <reason.icon className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{reason.title}</h3>
              <p className="text-sm text-primary-foreground/60 leading-relaxed">{reason.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
