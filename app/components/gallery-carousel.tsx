"use client";

import { useEffect, useState } from "react";
import { fallbackGalleryImages, type GalleryImage } from "../../lib/gallery";

type GalleryCarouselProps = {
  images?: GalleryImage[];
};

export function GalleryCarousel({ images = fallbackGalleryImages }: GalleryCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const galleryImages = images.length > 0 ? images : fallbackGalleryImages;

  useEffect(() => {
    if (galleryImages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % galleryImages.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [galleryImages.length]);

  useEffect(() => {
    setIndex((current) => (current >= galleryImages.length ? 0 : current));
  }, [galleryImages.length]);

  return (
    <>
      <div className="gallery-carousel-center gallery-carousel-center-stack">
        <div className="gallery-carousel-shell gallery-stack-shell">
          <button className="review-arrow gallery-stack-arrow gallery-stack-arrow-left" type="button" aria-label="Previous photo" onClick={() => setIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length)}>&#8249;</button>
          <div className="gallery-carousel-track"><figure className="gallery-slide is-active"><img src={galleryImages[index].image_url} alt={galleryImages[index].alt_text || "Dog photo from Pawsome Care"} /></figure></div>
          <button className="review-arrow gallery-stack-arrow gallery-stack-arrow-right" type="button" aria-label="Next photo" onClick={() => setIndex((current) => (current + 1) % galleryImages.length)}>&#8250;</button>
        </div>
        <div className="review-dots">{galleryImages.map((image, imageIndex) => <button key={String(image.id)} type="button" className={`review-dot${imageIndex === index ? " is-active" : ""}`} aria-label={`Go to photo ${imageIndex + 1}`} onClick={() => setIndex(imageIndex)} />)}</div>
      </div>
      <div className="gallery-actions"><button className="button button-primary" type="button" onClick={() => setIsModalOpen(true)}>Explore More</button></div>
      {isModalOpen ? <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}><div className="modal-card gallery-modal-card" role="dialog" aria-modal="true" aria-labelledby="gallery-modal-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><button className="modal-back" type="button" aria-label="Close photo gallery" onClick={() => setIsModalOpen(false)}>&larr;</button><h2 id="gallery-modal-title">All Photos</h2></div><div className="gallery-modal-grid">{galleryImages.map((image) => <img key={String(image.id)} src={image.image_url} alt={image.alt_text || "Dog photo from Pawsome Care"} />)}</div><button className="modal-close-button" type="button" onClick={() => setIsModalOpen(false)}>Close</button></div></div> : null}
    </>
  );
}
