import { SiteShell } from "../components/site-shell";
import { AboutTeamShowcase } from "../components/about-team-showcase";

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
          <section className="about-open-section about-anchor-section" id="team">
            <div className="team-section">
              <span className="eyebrow">Meet the Team</span>
              <AboutTeamShowcase />
            </div>
          </section>

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
        </div>
      </main>
    </SiteShell>
  );
}
