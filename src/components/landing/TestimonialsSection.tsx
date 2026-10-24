import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Adebayo Olanrewaju",
    role: "Homeowner, Lagos",
    text: "Jobman connected me with a verified tiler who did an amazing job. The escrow payment gave me total peace of mind.",
    rating: 5,
  },
  {
    name: "Chioma Nwosu",
    role: "Electrician, Abuja",
    text: "Since joining Jobman, I get consistent work. The verification badge makes customers trust me more.",
    rating: 5,
  },
  {
    name: "Emeka Okoro",
    role: "Property Developer, Enugu",
    text: "I just told the assistant what I needed and Jobman came back with a verified artisan and a clear price. No stress.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Testimonials</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 mb-4 text-foreground">
              What Our Users Say
            </h2>
          </motion.div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="p-6 rounded-xl bg-card border border-border shadow-sm"
            >
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              <p className="text-foreground mb-4 leading-relaxed">{t.text}</p>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-secondary text-secondary" />
                ))}
              </div>
              <div>
                <div className="font-display font-semibold text-foreground">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
