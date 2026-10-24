import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const LegalNotice = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Legal Notice</h1>
          <p className="text-muted-foreground mb-8">Jobman Legal Statement</p>

          <p className="text-muted-foreground mb-6">
            Jobman operates as a digital marketplace facilitating connections between customers and independent artisans. Jobman is not a contractor and does not directly provide construction services.
          </p>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Independent Contractors</h2>
            <p className="text-muted-foreground mb-2">
              All artisans operate as independent service providers. Jobman does not employ artisans and is not liable for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Work quality issues</li>
              <li>Project delays beyond platform mediation</li>
              <li>Injuries occurring on job sites</li>
              <li>Off-platform agreements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">2. Platform Role</h2>
            <p className="text-muted-foreground mb-2">Jobman provides:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Identity verification services</li>
              <li>Escrow payment processing</li>
              <li>Communication tools</li>
              <li>Dispute mediation</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Jobman does not guarantee workmanship but enforces structured agreements and fair dispute handling.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-2">
              To the fullest extent permitted by Nigerian law, Jobman shall not be liable for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Indirect damages</li>
              <li>Loss of profit</li>
              <li>Consequential damages</li>
              <li>Actions taken outside the platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Governing Law</h2>
            <p className="text-muted-foreground">
              This platform operates under the laws of the Federal Republic of Nigeria.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalNotice;
