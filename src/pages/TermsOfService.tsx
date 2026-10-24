import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Jobman Terms of Service</p>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By using Jobman, you agree to these Terms of Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">2. User Eligibility</h2>
            <p className="text-muted-foreground mb-2">Users must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Be at least 18 years old.</li>
              <li>Provide accurate and truthful information.</li>
              <li>Complete identity verification if required.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Account Responsibility</h2>
            <p className="text-muted-foreground mb-2">Users are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Maintaining account security.</li>
              <li>Keeping login credentials confidential.</li>
              <li>Ensuring accuracy of uploaded documents.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Payments & Escrow</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Customers must fund escrow before work begins.</li>
              <li>Escrow funds are held until completion confirmation.</li>
              <li>Disputes freeze funds automatically.</li>
              <li>Withdrawal fees may apply.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Negotiation & Agreements</h2>
            <p className="text-muted-foreground mb-2">Once both parties accept a digital agreement:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Scope, price, and timeline are locked.</li>
              <li>Changes require mutual consent.</li>
              <li>Work outside the agreed scope is not covered by escrow.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Prohibited Conduct</h2>
            <p className="text-muted-foreground mb-2">Users may not:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Engage in fraud or misrepresentation.</li>
              <li>Circumvent platform payments.</li>
              <li>Harass or threaten other users.</li>
              <li>Upload false documents.</li>
              <li>Attempt off-platform payment arrangements.</li>
            </ul>
            <p className="text-muted-foreground mt-2">Violation may result in suspension or permanent ban.</p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">7. Reviews</h2>
            <p className="text-muted-foreground">
              Users must leave honest and factual reviews. Fake or malicious reviews may result in account penalties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">8. Termination</h2>
            <p className="text-muted-foreground">
              Jobman reserves the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms periodically. Continued use of the platform indicates acceptance of updates.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
