import { SiteShell } from "../components/site-shell";

const values = [
  { title: "Home-Based Setting", text: "Dogs enjoy a more relaxed environment with routine, supervision, and space to settle in comfortably." },
  { title: "Thoughtful Updates", text: "Pet parents stay informed through photos, notes, and clear communication about how the day is going." },
  { title: "Care That Feels Personal", text: "Each booking is approached with attention to temperament, pace, and the routines that help each dog feel safe." },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card about-anchor-section" id="mission">
            <div className="team-section">
              <span className="eyebrow">Our Mission</span>
              <h1 className="section-title">Personal, home-based care with a calm routine</h1>
              <p className="section-copy">Pawsome Care is built around the belief that dogs thrive in environments where calm structure meets genuine companionship. We aim to create a small-group, attentive care experience in Davis, CA that feels more personal, comfortable, and thoughtfully paced than a large, high-volume facility.</p>
              <div className="about-grid">
                {values.map((value) => (
                  <article className="about-card" key={value.title}><h3>{value.title}</h3><p>{value.text}</p></article>
                ))}
              </div>
            </div>
          </section>

          <section className="page-card about-anchor-section" id="team">
            <div className="team-section">
              <span className="eyebrow">Meet the Team</span>
              <article className="about-card team-profile">
                <div className="team-photo-stack">
                  <img className="team-photo team-photo-main" src="/Jennifer-dog.jpeg" alt="Jennifer with a dog at Pawsome Care" />
                  <div className="team-photo-secondary">
                    <img className="team-photo team-photo-small" src="/images/gallery/IMG_8876.JPG" alt="Jennifer sitting outdoors with two dogs" />
                    <img className="team-photo team-photo-small" src="/images/gallery/IMG_8602.JPG" alt="A dog resting in Jennifer's arms" />
                  </div>
                </div>
                <div className="team-copy">
                  <h3>Jennifer</h3>
                  <p>I'm a graduate of University of California, Davis and a lifelong dog owner who has always felt most grounded in a dog-centered environment. I currently live with two resident dogs, who, in true spirit, serve as the CEOs of our home-based care environment, setting the tone for a calm, structured, and dog-first lifestyle.</p>
                  <p>Caring for them, along with many other dogs over the years, has shaped the way I think about structure, consistency, and what it truly means to create a space where dogs feel safe, understood, and at ease.</p>
                  <p>Over time, I've cared for dogs across a wide range of sizes, temperaments, and life stages, from high-energy puppies to senior dogs who require a slower, more predictable rhythm. These experiences have shaped a more intentional, systems-oriented approach to pet care, where routine, behavioral awareness, and individual needs are thoughtfully balanced.</p>
                  <p>Pawsome Care is intentionally designed as a calm, structured, and low-stress home environment. Dogs are not simply hosted, they are carefully observed and supported according to their comfort levels and personalities. Some thrive in social settings, while others benefit from quiet space and decompression, and both are equally respected.</p>
                  <p>Safety, structure, and clear communication are foundational to my care philosophy. Dogs are separated when I step out, group outings such as dog parks are avoided unless specifically requested, and each day is managed with consistency to reduce stress and uncertainty for both dogs and their owners. I also provide intentional, detailed updates as part of a transparent and reliable care experience.</p>
                  <p>At its core, my approach is simple: thoughtful structure creates calm dogs, and calm dogs feel at home.</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
