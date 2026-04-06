import Link from "next/link";
import { GalleryCarousel } from "../components/gallery-carousel";
import { SiteShell } from "../components/site-shell";

export default function GalleryPage() {
  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card gallery-page">
            <div className="gallery-hero">
              <figure className="gallery-hero-arch gallery-hero-left"><img src="/images/gallery/IMG_8876.JPG" alt="Jennifer outdoors with two dogs" /></figure>
              <div className="gallery-hero-copy"><span className="eyebrow">Photo Gallery</span><h1 className="gallery-title">A closer look at daily life inside Pawsome Care.</h1><p className="gallery-lead">Quiet moments, playful routines, and a home environment designed to feel calm, personal, and familiar.</p></div>
              <figure className="gallery-hero-arch gallery-hero-right"><img src="/images/gallery/IMG_8602.JPG" alt="A dog relaxing in Jennifer's arms" /></figure>
            </div>
            <section className="gallery-carousel-section" aria-label="Gallery highlights"><GalleryCarousel /></section>
            <section className="gallery-about-strip" aria-label="Know more about us">
              <div className="gallery-about-copy"><span className="eyebrow">Know More About Us</span><h2 className="gallery-section-title">The people and dogs behind the calm, home-based routine</h2><p className="gallery-lead">A few more moments that reflect the personality, warmth, and structure behind Pawsome Care.</p></div>
              <div className="gallery-about-grid">
                <Link className="gallery-about-card" href="/about#team"><img src="/Jennifer-dog.jpeg" alt="Jennifer with a dog" /><span>Meet Jennifer</span></Link>
                <Link className="gallery-about-card" href="/about#team"><img src="/images/gallery/IMG_8876.JPG" alt="Jennifer with two dogs outdoors" /><span>Life with resident dogs</span></Link>
                <Link className="gallery-about-card" href="/about#mission"><img src="/homepage-dogs.png" alt="Three dogs at Pawsome Care" /><span>See our care philosophy</span></Link>
              </div>
            </section>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
