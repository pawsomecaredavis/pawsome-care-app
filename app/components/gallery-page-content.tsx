"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fallbackGalleryImages, type GalleryImage, uploadGalleryImage } from "../../lib/gallery";
import { getCurrentProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabase";
import { GalleryCarousel } from "./gallery-carousel";

type GalleryRecord = {
  id: number;
  image_url: string;
  alt_text: string | null;
  storage_path: string | null;
  sort_order: number | null;
  created_at: string | null;
};

function normalizeGalleryRecord(record: GalleryRecord): GalleryImage {
  return {
    id: record.id,
    image_url: record.image_url,
    alt_text: record.alt_text || "Dog photo from Pawsome Care",
    storage_path: record.storage_path,
    sort_order: record.sort_order,
    created_at: record.created_at,
  };
}

export function GalleryPageContent() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(fallbackGalleryImages);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [setupMessage, setSetupMessage] = useState("");

  const heroLeftImage = galleryImages[0] ?? fallbackGalleryImages[0];
  const heroRightImage = galleryImages[1] ?? heroLeftImage;
  const manageableGalleryImages = useMemo(
    () => galleryImages.filter((image): image is GalleryImage & { id: number } => typeof image.id === "number"),
    [galleryImages],
  );

  async function loadGalleryImages() {
    setIsLoadingGallery(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("gallery_images")
      .select("id, image_url, alt_text, storage_path, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setSetupMessage(
        "Gallery management is not set up in Supabase yet, so the page is still showing the built-in photos.",
      );
      setGalleryImages(fallbackGalleryImages);
      setIsLoadingGallery(false);
      return;
    }

    const rows = (data as GalleryRecord[] | null) ?? [];

    if (rows.length === 0) {
      setSetupMessage(
        "No online gallery photos have been added yet, so the page is still showing the built-in photos.",
      );
      setGalleryImages(fallbackGalleryImages);
      setIsLoadingGallery(false);
      return;
    }

    setSetupMessage("");
    setGalleryImages(rows.map(normalizeGalleryRecord));
    setIsLoadingGallery(false);
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setIsAdmin(false);
        setIsLoadingAdmin(false);
        await loadGalleryImages();
        return;
      }

      try {
        const profile = await getCurrentProfile(user.id);
        setIsAdmin(profile.role === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoadingAdmin(false);
      }

      await loadGalleryImages();
    }

    void loadPage();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const altTextInput = String(formData.get("galleryAltText") || "").trim();
    const photo = formData.get("galleryPhoto");

    if (!(photo instanceof File) || photo.size === 0) {
      setErrorMessage("Please choose one photo to add to the gallery.");
      return;
    }

    setIsUploading(true);

    try {
      const { filePath, publicUrl } = await uploadGalleryImage(photo);
      const nextSortOrder = manageableGalleryImages.length;
      const altText =
        altTextInput || photo.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Dog photo from Pawsome Care";

      const { error } = await supabase.from("gallery_images").insert({
        image_url: publicUrl,
        storage_path: filePath,
        alt_text: altText,
        sort_order: nextSortOrder,
      });

      if (error) {
        throw error;
      }

      form.reset();
      setSuccessMessage("Gallery photo added successfully.");
      await loadGalleryImages();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload the gallery photo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(image: GalleryImage) {
    if (typeof image.id !== "number") {
      return;
    }

    const confirmed = window.confirm("Remove this photo from the online gallery?");

    if (!confirmed) {
      return;
    }

    setDeletingImageId(image.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (image.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("gallery-images")
          .remove([image.storage_path]);

        if (storageError) {
          throw storageError;
        }
      }

      const { error } = await supabase.from("gallery_images").delete().eq("id", image.id);

      if (error) {
        throw error;
      }

      setSuccessMessage("Gallery photo removed.");
      await loadGalleryImages();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the gallery photo.");
    } finally {
      setDeletingImageId(null);
    }
  }

  return (
    <section className="page-card gallery-page">
      <div className="gallery-hero">
        <figure className="gallery-hero-arch gallery-hero-left">
          <img src={heroLeftImage.image_url} alt={heroLeftImage.alt_text} />
        </figure>
        <div className="gallery-hero-copy">
          <span className="eyebrow">Photo Gallery</span>
          <h1 className="gallery-title">A closer look at daily life inside Pawsome Care.</h1>
          <p className="gallery-lead">
            Quiet moments, playful routines, and a home environment designed to feel calm,
            personal, and familiar.
          </p>
        </div>
        <figure className="gallery-hero-arch gallery-hero-right">
          <img src={heroRightImage.image_url} alt={heroRightImage.alt_text} />
        </figure>
      </div>

      {isAdmin && !isLoadingAdmin ? (
        <section className="gallery-admin-panel">
          <div className="gallery-admin-copy">
            <span className="eyebrow">Admin Controls</span>
            <h2 className="gallery-section-title">Manage gallery photos online</h2>
            <p className="gallery-lead">
              Upload or remove public gallery photos here so you do not need to edit the codebase
              every time you want to refresh the gallery.
            </p>
          </div>

          {setupMessage ? <p className="portal-subcopy">{setupMessage}</p> : null}
          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
          {successMessage ? <p className="auth-success">{successMessage}</p> : null}

          <div className="gallery-admin-layout">
            <form className="form-card gallery-admin-form" onSubmit={handleUpload}>
              <div className="field-grid auth-grid">
                <div className="field field-full">
                  <label htmlFor="galleryPhoto">Add Photo</label>
                  <input id="galleryPhoto" name="galleryPhoto" type="file" accept="image/*" required />
                </div>
                <div className="field field-full">
                  <label htmlFor="galleryAltText">Alt Text</label>
                  <input
                    id="galleryAltText"
                    name="galleryAltText"
                    type="text"
                    placeholder="Short description for accessibility"
                  />
                </div>
              </div>
              <p className="portal-subcopy" style={{ marginTop: "14px" }}>
                Photos are compressed before upload. If you leave alt text blank, we will create a
                simple label from the file name.
              </p>
              <button className="submit-button" type="submit" disabled={isUploading}>
                {isUploading ? "Uploading photo..." : "Add Gallery Photo"}
              </button>
            </form>

            <aside className="helper-card gallery-admin-list">
              <h3>Current Online Gallery</h3>
              <p className="portal-subcopy" style={{ marginTop: "8px" }}>
                {manageableGalleryImages.length} managed photo{manageableGalleryImages.length === 1 ? "" : "s"} currently live.
              </p>
              <div className="gallery-admin-grid">
                {manageableGalleryImages.length === 0 ? (
                  <p className="portal-subcopy">No managed gallery photos yet. Upload your first one above.</p>
                ) : (
                  manageableGalleryImages.map((image) => (
                    <article className="gallery-admin-item" key={image.id}>
                      <img src={image.image_url} alt={image.alt_text} />
                      <div>
                        <strong>{image.alt_text}</strong>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleDelete(image)}
                          disabled={deletingImageId === image.id}
                        >
                          {deletingImageId === image.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      <section className="gallery-carousel-section" aria-label="Gallery highlights">
        {isLoadingGallery ? <p className="portal-loading-text">Loading gallery photos...</p> : <GalleryCarousel images={galleryImages} />}
      </section>

      <section className="gallery-about-strip" aria-label="Know more about us">
        <div className="gallery-about-copy">
          <span className="eyebrow">Know More About Us</span>
          <h2 className="gallery-section-title">The people and dogs behind the calm, home-based routine</h2>
          <p className="gallery-lead">
            A few more moments that reflect the personality, warmth, and structure behind Pawsome Care.
          </p>
        </div>
        <div className="gallery-about-grid">
          <Link className="gallery-about-card" href="/about#team">
            <img src="/Jennifer-dog.jpeg" alt="Jennifer with a dog" />
            <span>Meet Jennifer</span>
          </Link>
          <Link className="gallery-about-card" href="/about#team">
            <img src={heroLeftImage.image_url} alt={heroLeftImage.alt_text} />
            <span>Life with resident dogs</span>
          </Link>
          <Link className="gallery-about-card" href="/about#mission">
            <img src="/homepage-dogs.png" alt="Three dogs at Pawsome Care" />
            <span>See our care philosophy</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
