import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const DisputeResolution = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Dispute Resolution Policy</h1>
          <p className="text-muted-foreground mb-8">Jobman Dispute Resolution Policy</p>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Purpose</h2>
            <p className="text-muted-foreground">
              Jobman provides an escrow-enabled marketplace that connects verified construction artisans with customers. This Dispute Resolution Policy outlines the process for handling disagreements between users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">2. When a Dispute Can Be Raised</h2>
            <p className="text-muted-foreground mb-2">A dispute may be initiated if:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>The work delivered does not match the agreed scope.</li>
              <li>The artisan fails to complete the job within the agreed timeframe without valid reason.</li>
              <li>The customer refuses to release payment after satisfactory completion.</li>
              <li>There is suspected fraud, misrepresentation, or misconduct.</li>
              <li>Safety concerns arise during project execution.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">3. How to Raise a Dispute</h2>
            <p className="text-muted-foreground mb-2">Users must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Submit a detailed written explanation.</li>
              <li>Upload supporting evidence (photos, videos, screenshots, documents).</li>
              <li>Select a dispute category.</li>
              <li>Submit within 72 hours of job completion or issue occurrence.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Escrow Protection</h2>
            <p className="text-muted-foreground mb-2">Upon dispute initiation:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>All escrow funds are immediately frozen.</li>
              <li>Neither party can withdraw or access the funds.</li>
              <li>The case is marked as "Under Review."</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Investigation Process</h2>
            <p className="text-muted-foreground mb-2">Jobman will:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Review submitted evidence.</li>
              <li>Review chat history and digital agreement.</li>
              <li>Contact both parties for clarification.</li>
              <li>Assess adherence to agreed scope and timeline.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Resolution Outcomes</h2>
            <p className="text-muted-foreground mb-2">Jobman may decide to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Release full payment to artisan.</li>
              <li>Refund full payment to customer.</li>
              <li>Split payment partially.</li>
              <li>Suspend one or both accounts.</li>
              <li>Permanently ban a user in cases of fraud or misconduct.</li>
            </ul>
            <p className="text-muted-foreground mt-2 font-medium">All decisions are final and binding within the platform.</p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">7. False Claims</h2>
            <p className="text-muted-foreground">
              Users submitting false or malicious disputes may face suspension or permanent removal from Jobman.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DisputeResolution;
