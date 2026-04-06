import Link from "next/link";
import { ReviewsCarousel } from "./components/reviews-carousel";
import { SiteShell } from "./components/site-shell";

export default function Home() {
  return (
    <SiteShell>
      <section className="hero" id="home">
        <div className="hero-inner">
          <div className="hero-card">
            <div className="hero-content">
              <div className="hero-copy-block">
                <span className="eyebrow">Located in Davis, CA</span>
                <h1 className="brand-name">A calmer, friendlier daycare experience for your dog.</h1>
                <p className="hero-copy">Pawsome Care offers attentive daytime care, a welcoming introduction process, and a smooth booking experience for pet parents who want something personal instead of generic.</p>
                <div className="hero-highlights">
                  <span>Daycare</span>
                  <span>Boarding</span>
                  <span>Walks & Drop-Ins</span>
                  <span>Home-Based Care</span>
                </div>
                <div className="hero-actions">
                  <Link className="button button-primary" href="/meet-and-greet">Request a Meet & Greet</Link>
                  <a className="button button-secondary" href="#contact">Contact Us</a>
                </div>
              </div>
              <div className="hero-media">
                <img src="/homepage-dogs.png" alt="Three happy dogs relaxing together at Pawsome Care" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card" id="reviews">
            <span className="eyebrow">Client Reviews</span>
            <h2 className="section-title">Kind words from pet parents</h2>
            <p className="section-copy">A few highlights from past clients who trusted Pawsome Care with boarding, house sitting, and consistent daily updates.</p>
            <ReviewsCarousel />
          </section>
          <section className="page-card" id="contact">
            <span className="eyebrow">Contact Us</span>
            <h2 className="section-title">Get in touch with Pawsome Care</h2>
            <p className="section-copy">Reach out to ask questions, check availability, or follow up on a meet and greet request.</p>
            <div className="contact-grid">
              <a className="contact-card" href="tel:5302173287">
                <span className="contact-head"><span className="contact-icon">&#9742;</span><span className="contact-label">Phone</span></span>
                <strong>(530) 217-3287</strong>
              </a>
              <a className="contact-card" href="mailto:pawsomecaredavis@gmail.com">
                <span className="contact-head"><span className="contact-icon">&#9993;</span><span className="contact-label">Email</span></span>
                <strong>pawsomecaredavis@gmail.com</strong>
              </a>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
