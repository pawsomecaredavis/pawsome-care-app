"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getCurrentProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabase";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [portalHref, setPortalHref] = useState("/portal");
  const [portalLabel, setPortalLabel] = useState("Pet Parent Portal");

  function handleCloseMenus() {
    setIsMenuOpen(false);
    setIsAboutOpen(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function syncPortalLink() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        if (!isMounted) {
          return;
        }

        setPortalHref("/portal");
        setPortalLabel("Pet Parent Portal");
        return;
      }

      try {
        const profile = await getCurrentProfile(user.id);

        if (!isMounted) {
          return;
        }

        if (profile.role === "admin") {
          setPortalHref("/admin");
          setPortalLabel("Admin Dashboard");
          return;
        }
      } catch {
        // Fall back to the standard portal link if the profile lookup fails.
      }

      if (!isMounted) {
        return;
      }

      setPortalHref("/portal");
      setPortalLabel("Pet Parent Portal");
    }

    void syncPortalLink();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncPortalLink();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <header className="site-header">
        <nav className="nav">
          <Link className="logo" href="/" aria-label="Pawsome Care home" onClick={handleCloseMenus}>
            <img src="/nav-logo.png" alt="Pawsome Care logo" />
            <span className="brand-lockup">
              <span className="brand-wordmark">Pawsome Care</span>
              <span className="brand-tag">Davis, California</span>
            </span>
          </Link>

          <button
            className={`nav-menu-button ${isMenuOpen ? "is-open" : ""}`}
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="site-nav-links"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => {
              setIsMenuOpen((current) => !current);
              setIsAboutOpen(false);
            }}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`nav-links ${isMenuOpen ? "is-open" : ""}`} id="site-nav-links">
            <Link href="/#home" onClick={handleCloseMenus}>Home</Link>
            <Link href="/gallery" onClick={handleCloseMenus}>Photo Gallery</Link>
            <Link href="/services" onClick={handleCloseMenus}>Services</Link>
            <Link href="/#contact" onClick={handleCloseMenus}>Contact Us</Link>
            <div
              className={`nav-dropdown ${isAboutOpen ? "is-open" : ""}`}
              onMouseEnter={() => setIsAboutOpen(true)}
              onMouseLeave={() => setIsAboutOpen(false)}
            >
              <button
                className="nav-dropdown-trigger"
                type="button"
                aria-expanded={isAboutOpen}
                onClick={() => setIsAboutOpen((current) => !current)}
              >
                <span>About Us</span>
                <span className="nav-dropdown-caret">&#9662;</span>
              </button>
              <div className="nav-dropdown-menu">
                <Link href="/about" onClick={handleCloseMenus}>About Us</Link>
                <Link href="/about#mission" onClick={handleCloseMenus}>Our Mission</Link>
                <Link href="/about#team" onClick={handleCloseMenus}>Meet the Team</Link>
              </div>
            </div>
            <div className="nav-stack">
              <Link className="nav-cta" href="/meet-and-greet" onClick={handleCloseMenus}>Book A Meet & Greet</Link>
              <Link className="nav-subcta" href={portalHref} onClick={handleCloseMenus}>{portalLabel}</Link>
            </div>
          </div>
        </nav>
      </header>

      {children}

      <footer className="site-footer">
        <div className="footer-shell">
          <p className="footer-location">Located in Davis, CA</p>
        </div>
      </footer>
    </>
  );
}
