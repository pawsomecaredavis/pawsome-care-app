import { SiteShell } from "../components/site-shell";
import { PortalDemo } from "../components/portal-demo";

export default function PortalPage() {
  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card portal-page">
            <span className="eyebrow">Pet Parent Portal</span>
            <h1 className="section-title">Your secure home for pet updates and bookings</h1>
            <p className="section-copy">
              This is now the real portal entry point for pet parents. Sign in to
              access your account, or create one if you are new.
            </p>
            <PortalDemo />
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
