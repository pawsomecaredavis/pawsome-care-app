"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteShell } from "../components/site-shell";
import { getCurrentProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabase";

export default function MeetAndGreetPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function routeSignedInUsers() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const profile = await getCurrentProfile(user.id);

        if (profile.role === "admin") {
          router.replace("/admin");
          return;
        }

        router.replace("/portal/bookings/request?service=meet-and-greet");
      } catch {
        setIsCheckingSession(false);
      }
    }

    void routeSignedInUsers();
  }, [router]);

  return (
    <SiteShell>
      <main className="page-main">
        <div className="page-shell">
          <section className="page-card">
            <span className="eyebrow">New Client Form</span>
            <h1 className="page-title">Request a Meet &amp; Greet</h1>
            <p className="page-intro">
              Meet &amp; greets now flow through the same booking system as your other requests,
              so they appear in the admin dashboard as upcoming tasks.
            </p>

            {isCheckingSession ? (
              <p className="portal-loading-text">
                Checking your account and opening the meet &amp; greet request...
              </p>
            ) : (
              <div className="form-layout">
                <section className="form-card">
                  <h2>How this works now</h2>
                  <p>
                    Sign in to your portal and submit a meet &amp; greet request through the
                    booking form. First-time clients can book this before adding a pet profile,
                    so your intro visit stays easy to schedule.
                  </p>
                  <div className="portal-inline-actions" style={{ marginTop: "18px" }}>
                    <Link className="submit-button" href="/login">
                      Log In to Continue
                    </Link>
                    <Link className="button button-secondary" href="/register">
                      Create Account
                    </Link>
                  </div>
                </section>

                <aside className="helper-card">
                  <h2>What happens next?</h2>
                  <p>
                    After you sign in, the booking form will already be set to
                    <strong> Meet &amp; Greet</strong>. Pick an available date and submit the
                    request. If you already have a pet profile on file, you can attach it there,
                    but it is not required for the first intro request.
                  </p>
                  <p className="helper-extra">
                    Meet &amp; greet requests will show up in the admin dashboard as upcoming
                    appointments, but they do not go through the daily update workflow.
                  </p>
                </aside>
              </div>
            )}
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
