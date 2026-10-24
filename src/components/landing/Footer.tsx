import { Link } from "react-router-dom";
import { HardHat } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground/70 py-12">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <HardHat className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-primary-foreground">Jobman</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Nigeria's trusted marketplace for verified construction artisans.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#how-it-works" className="hover:text-primary-foreground transition-colors">How It Works</a></li>
              <li><a href="#services" className="hover:text-primary-foreground transition-colors">Services</a></li>
              <li><Link to="/find-artisan" className="hover:text-primary-foreground transition-colors">Find an Artisan</Link></li>
              <li><Link to="/register" className="hover:text-primary-foreground transition-colors">Register</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/help" className="hover:text-primary-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">Contact Us</Link></li>
              <li><Link to="/dispute-resolution" className="hover:text-primary-foreground transition-colors">Dispute Resolution</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal" className="hover:text-primary-foreground transition-colors">Legal Notice</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Jobman. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
