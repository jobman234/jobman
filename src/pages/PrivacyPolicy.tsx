import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Jobman Privacy Policy — Last Updated: February 2026</p>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              Jobman is committed to protecting your personal data in compliance with the Nigeria Data Protection Act (NDPA).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">2. Information We Collect</h2>

            <h3 className="font-display text-lg font-medium text-foreground mt-4">Personal Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Full name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Government ID details</li>
              <li>NIN</li>
              <li>Address information</li>
              <li>Proof of address documents</li>
              <li>Selfie verification image</li>
            </ul>

            <h3 className="font-display text-lg font-medium text-foreground mt-4">Transaction Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Wallet activity</li>
              <li>Escrow transactions</li>
              <li>Withdrawal records</li>
            </ul>

            <h3 className="font-display text-lg font-medium text-foreground mt-4">Usage Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>IP address</li>
              <li>Device information</li>
              <li>Platform activity logs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Why We Collect Data</h2>
            <p className="text-muted-foreground mb-2">We collect data to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Verify user identity</li>
              <li>Prevent fraud</li>
              <li>Facilitate secure payments</li>
              <li>Improve platform safety</li>
              <li>Resolve disputes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Data Protection Measures</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Encrypted storage of sensitive information</li>
              <li>Secure cloud document storage</li>
              <li>Role-based admin access</li>
              <li>Regular security audits</li>
              <li>Secure HTTPS connections</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Data Sharing</h2>
            <p className="text-muted-foreground mb-2">We do not sell personal data. We may share limited information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Payment processors</li>
              <li>Identity verification partners</li>
              <li>Law enforcement if legally required</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground">
              User verification data is retained only as long as necessary to comply with legal and security obligations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground">7. Your Rights</h2>
            <p className="text-muted-foreground mb-2">Under NDPA, you have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Access your personal data</li>
              <li>Request correction</li>
              <li>Request deletion (subject to legal obligations)</li>
              <li>Withdraw consent</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Requests may be sent to: <a href="mailto:support@jobman.ng" className="text-primary hover:underline">support@jobman.ng</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
