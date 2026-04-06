"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  function handleCloseMenus() {
    setIsMenuOpen(false);
    setIsAboutOpen(false);
  }

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
              <Link className="nav-subcta" href="/portal" onClick={handleCloseMenus}>Pet Parent Portal</Link>
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
