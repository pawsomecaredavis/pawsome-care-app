import { SiteShell } from "../components/site-shell";
import { PortalDemo } from "../components/portal-demo";

export default function PortalPage() {
  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card portal-page">
            <PortalDemo />
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
