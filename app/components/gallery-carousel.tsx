"use client";

import { useEffect, useState } from "react";

const galleryImages = [
  "/images/gallery/IMG_0053.JPG",
  "/images/gallery/IMG_0256.JPG",
  "/images/gallery/IMG_0301.JPG",
  "/images/gallery/IMG_1165.JPG",
  "/images/gallery/IMG_1167.JPG",
  "/images/gallery/IMG_1171.JPG",
  "/images/gallery/IMG_1959.JPG",
  "/images/gallery/IMG_2430.JPG",
  "/images/gallery/IMG_3518.JPG",
  "/images/gallery/IMG_3733.JPG",
  "/images/gallery/IMG_3973.JPG",
  "/images/gallery/IMG_4097.JPG",
  "/images/gallery/IMG_4142.JPG",
  "/images/gallery/IMG_4914.JPG",
  "/images/gallery/IMG_5442.JPG",
  "/images/gallery/IMG_6145.JPG",
  "/images/gallery/IMG_6557.JPG",
  "/images/gallery/IMG_7861.JPG",
  "/images/gallery/IMG_7862.JPG",
  "/images/gallery/IMG_7939.JPG",
  "/images/gallery/IMG_8164.JPG",
  "/images/gallery/IMG_8223.JPG",
  "/images/gallery/IMG_8602.JPG",
  "/images/gallery/IMG_8630.JPG",
  "/images/gallery/IMG_8876.JPG",
  "/images/gallery/IMG_9363.JPG",
  "/images/gallery/07c90a44deede7f9970d9b9504bdc4f3.jpeg",
  "/images/gallery/741018f462f175a4e9a502ee96f28ca0.jpg",
  "/images/gallery/88b6218dd1bd52a65176dcaef2bb8e58.jpeg",
  "/images/gallery/cf959a15375feeaecaa0d39d15789350.jpeg",
];

export function GalleryCarousel() {
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % galleryImages.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <>
      <div className="gallery-carousel-center gallery-carousel-center-stack">
        <div className="gallery-carousel-shell gallery-stack-shell">
          <button className="review-arrow gallery-stack-arrow gallery-stack-arrow-left" type="button" aria-label="Previous photo" onClick={() => setIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length)}>&#8249;</button>
          <div className="gallery-carousel-track"><figure className="gallery-slide is-active"><img src={galleryImages[index]} alt="Dog photo from Pawsome Care" /></figure></div>
          <button className="review-arrow gallery-stack-arrow gallery-stack-arrow-right" type="button" aria-label="Next photo" onClick={() => setIndex((current) => (current + 1) % galleryImages.length)}>&#8250;</button>
        </div>
        <div className="review-dots">{galleryImages.map((image, imageIndex) => <button key={image} type="button" className={`review-dot${imageIndex === index ? " is-active" : ""}`} aria-label={`Go to photo ${imageIndex + 1}`} onClick={() => setIndex(imageIndex)} />)}</div>
      </div>
      <div className="gallery-actions"><button className="button button-primary" type="button" onClick={() => setIsModalOpen(true)}>Explore More</button></div>
      {isModalOpen ? <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}><div className="modal-card gallery-modal-card" role="dialog" aria-modal="true" aria-labelledby="gallery-modal-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><button className="modal-back" type="button" aria-label="Close photo gallery" onClick={() => setIsModalOpen(false)}>&larr;</button><h2 id="gallery-modal-title">All Photos</h2></div><div className="gallery-modal-grid">{galleryImages.map((image) => <img key={image} src={image} alt="Dog photo from Pawsome Care" />)}</div><button className="modal-close-button" type="button" onClick={() => setIsModalOpen(false)}>Close</button></div></div> : null}
    </>
  );
}
