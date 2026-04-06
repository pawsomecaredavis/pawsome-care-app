"use client";

import { useEffect, useState } from "react";

const reviews = [
  {
    text: "Jiajie was incredibly attentive, sent frequent photo and video updates, and made the entire stay feel easy and reassuring. My puppy came home happy, relaxed, and clearly well cared for.",
    name: "Yujun P.",
    role: "Boarding client",
  },
  {
    text: "She was thoughtful and observant, even finding a gentle way to help my dog eat comfortably. The regular updates gave me real peace of mind, and I always felt my dog was safe and happy.",
    name: "Elmira A.",
    role: "Boarding client",
  },
  {
    text: "Communication was top-notch while we were away, and our puppy had a fantastic time. The care felt genuinely warm, dependable, and easy to trust from start to finish.",
    name: "Janette M.",
    role: "House sitting client",
  },
  {
    text: "She really paid attention to my dog's habits, preferences, and comfort. The steady stream of photos and messages made it feel like my dog was on a little vacation of his own.",
    name: "Yudi M.",
    role: "Boarding client",
  },
  {
    text: "Even with shy dogs, she stayed patient, nurturing, and communicative. The updates were detailed, the dogs looked comfortable, and the overall experience felt caring and professional.",
    name: "Stephanie S.",
    role: "Boarding client",
  },
  {
    text: "She sent photos and videos constantly, paid close attention to Penny's needs, and made her feel comfortable and cared for the entire time. The experience felt warm, attentive, and genuinely personal.",
    name: "Jennifer B.",
    role: "Boarding client",
  },
];

export function ReviewsCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % reviews.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="reviews-carousel" aria-label="Client reviews carousel">
      <button className="review-arrow review-arrow-left" type="button" aria-label="Previous review" onClick={() => setIndex((current) => (current - 1 + reviews.length) % reviews.length)}>&#8249;</button>
      <article className="review-card review-card-active">
        <p className="review-text">&ldquo;{reviews[index].text}&rdquo;</p>
        <div className="review-meta">
          <strong>{reviews[index].name}</strong>
          <span>{reviews[index].role}</span>
        </div>
      </article>
      <button className="review-arrow review-arrow-right" type="button" aria-label="Next review" onClick={() => setIndex((current) => (current + 1) % reviews.length)}>&#8250;</button>
      <div className="review-dots" aria-label="Review pagination">
        {reviews.map((review, reviewIndex) => (
          <button key={review.name} type="button" className={`review-dot${reviewIndex === index ? " is-active" : ""}`} aria-label={`Go to review ${reviewIndex + 1}`} aria-current={reviewIndex === index ? "true" : "false"} onClick={() => setIndex(reviewIndex)} />
        ))}
      </div>
    </div>
  );
}
