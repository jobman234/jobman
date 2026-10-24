import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ArrowLeft, Mail, Phone, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ContactUs = () => {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim();

    if (!name || !email || !subject || !message) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("contact_submissions").insert({
      name,
      email,
      subject,
      message,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Message sent!", description: "We'll get back to you within 24–48 hours." });
    form.reset();
    setSubject("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground mb-8">Have a question, concern, or feedback? Reach out to us.</p>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Contact Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Email</h3>
                  <p className="text-muted-foreground text-sm">support@jobman.ng</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Phone</h3>
                  <p className="text-muted-foreground text-sm">+234 800 JOBMAN (562626)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Office</h3>
                  <p className="text-muted-foreground text-sm">Lagos, Nigeria</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Business Hours</h3>
                  <p className="text-muted-foreground text-sm">Mon – Fri: 8am – 6pm WAT</p>
                  <p className="text-muted-foreground text-sm">Sat: 9am – 2pm WAT</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4 p-6 rounded-xl border bg-card">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="Your name" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required maxLength={255} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                    <SelectItem value="Account Issue">Account Issue</SelectItem>
                    <SelectItem value="Payment / Escrow">Payment / Escrow</SelectItem>
                    <SelectItem value="Dispute">Dispute</SelectItem>
                    <SelectItem value="Verification">Verification</SelectItem>
                    <SelectItem value="Feedback">Feedback</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" placeholder="Describe your issue or question..." rows={5} required maxLength={2000} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactUs;
