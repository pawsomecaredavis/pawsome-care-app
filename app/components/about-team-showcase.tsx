"use client";

import { useState } from "react";

const jenniferPhotos = [
  {
    src: "/Jennifer-dog.jpeg",
    alt: "Jennifer with a dog at Pawsome Care",
  },
  {
    src: "/images/gallery/IMG_8876.JPG",
    alt: "Jennifer sitting outdoors with two dogs",
  },
];

export function AboutTeamShowcase() {
  const [photoIndex, setPhotoIndex] = useState(0);
  const activePhoto = jenniferPhotos[photoIndex];
  const nextPhoto = jenniferPhotos[(photoIndex + 1) % jenniferPhotos.length];

  return (
    <div className="team-showcase">
      <article className="about-story-column">
        <div className="team-copy">
          <h2 className="team-name">Meet Jennifer</h2>
          <p>
            I&apos;m a UC Davis graduate and a lifelong dog owner, and Pawsome Care grew out of the
            kind of environment I have always believed dogs do best in: calm, home-based, and
            thoughtfully structured.
          </p>
          <p>
            Over the years, caring for my own dogs and many others has shaped a routine centered on
            consistency, behavioral awareness, and clear communication, with care always adjusted
            to each dog&apos;s pace and comfort level.
          </p>
        </div>

        <div className="team-photo-carousel">
          <button
            className="team-photo-frame"
            type="button"
            onClick={() => setPhotoIndex((current) => (current + 1) % jenniferPhotos.length)}
            aria-label="Show next Jennifer photo"
          >
            <div className="team-photo-stack" aria-hidden="true">
              <img className="team-photo team-photo-back" src={nextPhoto.src} alt="" />
            </div>
            <img className="team-photo team-photo-main" src={activePhoto.src} alt={activePhoto.alt} />
          </button>
          <div className="team-photo-dots" aria-hidden="true">
            {jenniferPhotos.map((photo, index) => (
              <span
                key={photo.src}
                className={`team-photo-dot${index === photoIndex ? " is-active" : ""}`}
              />
            ))}
          </div>
        </div>
      </article>

      <aside className="about-dogs-column">
        <div className="paw-print paw-print-one" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span className="paw-pad" />
        </div>
        <div className="paw-print paw-print-two" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span className="paw-pad" />
        </div>

        <div className="resident-dogs-stage">
          <div className="resident-dogs-photo-wrap">
            <img
              className="resident-dogs-photo"
              src="/images/charcoal-beanie-cutout-final.png"
              alt="Charcoal and Beanie sitting together outdoors"
            />
          </div>
        </div>

        <div className="resident-dogs-copy">
          <h3>Meet Charcoal and Beanie</h3>
          <div className="resident-dogs-notes">
            <article className="resident-dog-blurb">
              <h4>Charcoal</h4>
              <p>
                A friendly five-year-old Yorkie who usually brings the first bit of curiosity and
                warmth when a new dog is settling in.
              </p>
            </article>

            <article className="resident-dog-blurb">
              <h4>Beanie</h4>
              <p>
                A six-year-old Mini Aussie who is politely uninterested in most dogs and naturally
                reinforces the calmer, more respectful pace of the home.
              </p>
            </article>
          </div>
        </div>
      </aside>
    </div>
  );
}
