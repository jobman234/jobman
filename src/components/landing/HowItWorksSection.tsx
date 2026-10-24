import { Search, MessageSquare, Handshake, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Tell Our Assistant",
    description: "Chat with the Jobman Concierge. Describe the work, your location and budget — request as many trades as you need.",
  },
  {
    icon: MessageSquare,
    step: "02",
    title: "We Match You",
    description: "The Jobman team finds verified artisans near you, agrees price and timeline, and confirms it in your chat.",
  },
  {
    icon: Handshake,
    step: "03",
    title: "Agree & Fund Escrow",
    description: "You approve the match and fund escrow. Payment stays protected until the work is done.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Job Done, Payment Released",
    description: "Once work is approved, funds are released to the artisan. Leave a review.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Simple Process</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 mb-4 text-foreground">
              How Jobman Works
            </h2>
            <p className="text-muted-foreground text-lg">
              From posting a job to paying securely — we've made it seamless.
            </p>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-primary/5" />
              )}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card border-2 border-primary/20 mb-5 shadow-md">
                <item.icon className="w-8 h-8 text-primary" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
