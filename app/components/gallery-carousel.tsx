"use client";

import { useEffect, useMemo, useState } from "react";
import { fallbackGalleryImages, type GalleryImage } from "../../lib/gallery";

type GalleryCarouselProps = {
  images?: GalleryImage[];
};

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}

export function GalleryCarousel({ images = fallbackGalleryImages }: GalleryCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const galleryImages = images.length > 0 ? images : fallbackGalleryImages;
  const safeIndex = index >= galleryImages.length ? 0 : index;
  const activeImage = galleryImages[safeIndex];

  const visibleCards = useMemo(() => {
    const offsets = [-2, -1, 0, 1, 2];
    return offsets.map((offset) => {
      const image = galleryImages[wrapIndex(safeIndex + offset, galleryImages.length)];
      const positionClass =
        offset === 0
          ? "is-active"
          : offset === -1
            ? "is-left"
            : offset === 1
              ? "is-right"
              : offset === -2
                ? "is-far-left"
                : "is-far-right";
      return {
        offset,
        image,
        positionClass,
      };
    });
  }, [galleryImages, safeIndex]);

  useEffect(() => {
    if (galleryImages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % galleryImages.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [galleryImages.length]);

  return (
    <>
      <section className="gallery-cinematic">
        <div
          className="gallery-cinematic-backdrop"
          style={{ backgroundImage: `url(${activeImage.image_url})` }}
          aria-hidden="true"
        />
        <div className="gallery-cinematic-overlay" aria-hidden="true" />

        <div className="gallery-cinematic-copy">
          <h1 className="gallery-title">
            <span>A closer look at</span>
            <span>daily life with</span>
            <span>Pawsome Care.</span>
          </h1>
        </div>

        <div className="gallery-cinematic-stage">
          <button
            className="gallery-cinematic-arrow gallery-cinematic-arrow-left"
            type="button"
            aria-label="Previous photo"
            onClick={() =>
              setIndex((current) => wrapIndex(current - 1, galleryImages.length))
            }
          >
            &#8249;
          </button>

          <div className="gallery-cinematic-track">
            {visibleCards.map(({ offset, image, positionClass }) => (
              <button
                key={`${String(image.id)}-${offset}`}
                type="button"
                className={`gallery-cinematic-card ${positionClass}`}
                onClick={() => setIndex(wrapIndex(safeIndex + offset, galleryImages.length))}
                aria-label={
                  offset === 0
                    ? "Current photo"
                    : offset < 0
                      ? "View previous photo"
                      : "View next photo"
                }
              >
                <img
                  src={image.image_url}
                  alt={image.alt_text || "Dog photo from Pawsome Care"}
                />
              </button>
            ))}
          </div>

          <button
            className="gallery-cinematic-arrow gallery-cinematic-arrow-right"
            type="button"
            aria-label="Next photo"
            onClick={() =>
              setIndex((current) => wrapIndex(current + 1, galleryImages.length))
            }
          >
            &#8250;
          </button>
        </div>

        <div className="review-dots gallery-cinematic-dots">
          {galleryImages.map((image, imageIndex) => (
            <button
              key={String(image.id)}
              type="button"
              className={`review-dot${imageIndex === safeIndex ? " is-active" : ""}`}
              aria-label={`Go to photo ${imageIndex + 1}`}
              onClick={() => setIndex(imageIndex)}
            />
          ))}
        </div>

        <div className="gallery-actions">
          <button className="button button-primary" type="button" onClick={() => setIsModalOpen(true)}>
            Explore More
          </button>
        </div>
      </section>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card gallery-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <button
                className="modal-back"
                type="button"
                aria-label="Close photo gallery"
                onClick={() => setIsModalOpen(false)}
              >
                &larr;
              </button>
              <h2 id="gallery-modal-title">All Photos</h2>
            </div>
            <div className="gallery-modal-grid">
              {galleryImages.map((image) => (
                <img
                  key={String(image.id)}
                  src={image.image_url}
                  alt={image.alt_text || "Dog photo from Pawsome Care"}
                />
              ))}
            </div>
            <button className="modal-close-button" type="button" onClick={() => setIsModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
