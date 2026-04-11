import { GalleryPageContent } from "../components/gallery-page-content";
import { SiteShell } from "../components/site-shell";

export default function GalleryPage() {
  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <GalleryPageContent />
        </div>
      </main>
    </SiteShell>
  );
}
