import { Hammer, Paintbrush, Wrench, Zap, Droplets, Blocks, Home, Ruler, Sofa, TreePine, Wind, ShowerHead, Fence, SunMedium, Pipette, DoorOpen } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  { icon: Blocks, title: "Bricklaying & Masonry", color: "bg-primary" },
  { icon: Paintbrush, title: "Painting & Finishing", color: "bg-secondary" },
  { icon: Zap, title: "Electrical Work", color: "bg-info" },
  { icon: Droplets, title: "Plumbing", color: "bg-primary" },
  { icon: Hammer, title: "Carpentry", color: "bg-secondary" },
  { icon: Wrench, title: "Welding & Fabrication", color: "bg-info" },
  { icon: Home, title: "Roofing", color: "bg-primary" },
  { icon: Ruler, title: "Tiling & Flooring", color: "bg-secondary" },
  { icon: Hammer, title: "POP & Screeding", color: "bg-info" },
  { icon: Blocks, title: "Aluminium & Glass", color: "bg-primary" },
  { icon: Wrench, title: "Iron Bending", color: "bg-secondary" },
  { icon: Hammer, title: "Contractor", color: "bg-info" },
  { icon: Home, title: "General Construction", color: "bg-primary" },
  { icon: Wrench, title: "Engineer", color: "bg-secondary" },
  { icon: Ruler, title: "Architect", color: "bg-info" },
  { icon: Blocks, title: "Surveyor", color: "bg-primary" },
  { icon: Ruler, title: "Quantity Surveyor", color: "bg-secondary" },
  { icon: Sofa, title: "Interior Design", color: "bg-info" },
  { icon: TreePine, title: "Landscaping", color: "bg-primary" },
  { icon: Wind, title: "HVAC", color: "bg-secondary" },
  { icon: ShowerHead, title: "Bathroom Fitting", color: "bg-info" },
  { icon: Fence, title: "Fencing & Gates", color: "bg-primary" },
  { icon: SunMedium, title: "Solar Installation", color: "bg-secondary" },
  { icon: Pipette, title: "Waterproofing", color: "bg-info" },
  { icon: DoorOpen, title: "Doors & Windows", color: "bg-primary" },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Our Categories</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 mb-4 text-foreground">
              Services You Can Find
            </h2>
            <p className="text-muted-foreground text-lg">
              From foundation to finishing — find skilled professionals for every construction need.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="group cursor-pointer p-5 sm:p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-center"
            >
              <div className={`w-14 h-14 rounded-xl ${service.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <service.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">{service.title}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
