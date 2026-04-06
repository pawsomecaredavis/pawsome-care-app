import Link from "next/link";
import { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <header className="site-header">
        <nav className="nav">
          <Link className="logo" href="/" aria-label="Pawsome Care home">
            <img src="/nav-logo.png" alt="Pawsome Care logo" />
            <span className="brand-lockup">
              <span className="brand-wordmark">Pawsome Care</span>
              <span className="brand-tag">Davis, California</span>
            </span>
          </Link>

          <div className="nav-links">
            <Link href="/#home">Home</Link>
            <Link href="/gallery">Photo Gallery</Link>
            <Link href="/services">Services</Link>
            <Link href="/#contact">Contact Us</Link>
            <div className="nav-dropdown">
              <Link href="/about">About Us</Link>
              <div className="nav-dropdown-menu">
                <Link href="/about#mission">Our Mission</Link>
                <Link href="/about#team">Meet the Team</Link>
              </div>
            </div>
            <div className="nav-stack">
              <Link className="nav-cta" href="/meet-and-greet">Book A Meet & Greet</Link>
              <Link className="nav-subcta" href="/portal">Pet Parent Portal</Link>
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
