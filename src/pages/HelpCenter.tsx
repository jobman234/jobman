import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Search, ShieldCheck, Wallet, Users, MessageSquare, FileText, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";

const categories = [
  {
    icon: Users,
    title: "Getting Started",
    faqs: [
      { q: "How do I create an account?", a: "Tap 'Register' on the homepage, fill in your details, and verify your email. You can register as a customer or artisan." },
      { q: "How do I complete onboarding?", a: "After registration, you'll be guided through onboarding where you set your profile, location, and preferences." },
      { q: "Can I be both a customer and artisan?", a: "Currently each account is tied to one role. You can create a separate account for the other role." },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Verification",
    faqs: [
      { q: "Why do artisans need to be verified?", a: "Verification builds trust. Customers want assurance that artisans are who they say they are and have real skills." },
      { q: "What documents are needed for verification?", a: "You'll need a valid government-issued ID, NIN, proof of address, a selfie, and work references." },
      { q: "How long does verification take?", a: "Verification is typically reviewed within 24–48 hours after submission." },
    ],
  },
  {
    icon: Wallet,
    title: "Payments & Escrow",
    faqs: [
      { q: "How does escrow work?", a: "The customer funds escrow before work begins. Funds are held securely and released to the artisan only after the customer confirms satisfactory completion." },
      { q: "When are funds released?", a: "Funds are released when the customer marks the job as completed, or automatically after the escrow deadline if no dispute is raised." },
      { q: "Are there withdrawal fees?", a: "Withdrawal fees may apply depending on the payment method. Check the Wallet page for current rates." },
    ],
  },
  {
    icon: MessageSquare,
    title: "Jobs & Communication",
    faqs: [
      { q: "How do I request an artisan?", a: "Open the Jobman Concierge chat from your dashboard, describe the work, your location and budget. You can request several artisans across different trades in one chat." },
      { q: "How do I get a price?", a: "The Jobman team contacts suitable artisans on your behalf, agrees a price and timeline, and confirms it back to you in your chat before any payment is made." },
      { q: "Can I message an artisan before hiring?", a: "Yes, the in-app messaging system lets you communicate with artisans directly on any job." },
    ],
  },
  {
    icon: FileText,
    title: "Disputes",
    faqs: [
      { q: "How do I raise a dispute?", a: "On the job detail page, click 'Raise Dispute', select a category, describe the issue, and upload evidence. The dispute must be raised within 72 hours." },
      { q: "What happens to escrow during a dispute?", a: "Escrow funds are immediately frozen and neither party can access them until the dispute is resolved." },
      { q: "Are dispute decisions final?", a: "Yes, all dispute resolutions made by Jobman are final and binding within the platform." },
    ],
  },
  {
    icon: HelpCircle,
    title: "Account & Safety",
    faqs: [
      { q: "How do I reset my password?", a: "Click 'Forgot Password' on the login page and follow the email instructions to set a new password." },
      { q: "How is my data protected?", a: "Jobman uses encrypted storage, secure HTTPS connections, and role-based access controls. See our Privacy Policy for full details." },
      { q: "Can I delete my account?", a: "You can request account deletion by contacting support@jobman.ng. Some data may be retained for legal compliance." },
    ],
  },
];

const HelpCenter = () => {
  const [search, setSearch] = useState("");
  const lowerSearch = search.toLowerCase();

  const filtered = categories
    .map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (f) => f.q.toLowerCase().includes(lowerSearch) || f.a.toLowerCase().includes(lowerSearch)
      ),
    }))
    .filter((cat) => cat.faqs.length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Help Center</h1>
          <p className="text-muted-foreground mb-6">Find answers to common questions about Jobman.</p>

          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No results found. Try a different search or contact us directly.</p>
          )}

          {filtered.map((cat) => (
            <section key={cat.title} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <cat.icon className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">{cat.title}</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {cat.faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`${cat.title}-${i}`}>
                    <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}

          <div className="mt-12 p-6 rounded-xl bg-muted/50 text-center">
            <h3 className="font-display font-semibold text-foreground mb-2">Still need help?</h3>
            <p className="text-muted-foreground text-sm mb-3">Our support team is here for you.</p>
            <a href="/contact" className="text-primary font-medium hover:underline">Contact Us →</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCenter;
