"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteShell } from "../components/site-shell";
import { getCurrentProfile, getIsFirstTimeClient } from "../../lib/profile";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredNotice, setRegisteredNotice] = useState(false);
  const [firstTimeNotice, setFirstTimeNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setRegisteredNotice(params.get("registered") === "1");
    setFirstTimeNotice(params.get("firstTime") === "1");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const profile = user?.id ? await getCurrentProfile(user.id) : null;
      const role = profile?.role;
      const isFirstTimeClient = getIsFirstTimeClient(user);
      let destination = role === "admin" ? "/admin" : "/portal";

      if (role !== "admin" && isFirstTimeClient) {
        const householdResult = await supabase.rpc("get_my_household");
        const householdRows = Array.isArray(householdResult.data)
          ? householdResult.data
          : householdResult.data
            ? [householdResult.data]
            : [];
        const household = householdRows[0] as { id: number } | undefined;

        if (!householdResult.error && household?.id) {
          const meetAndGreetResult = await supabase
            .from("bookings")
            .select("id")
            .eq("household_id", household.id)
            .eq("service_type", "meet-and-greet")
            .limit(1);

          if (!meetAndGreetResult.error && (meetAndGreetResult.data?.length ?? 0) === 0) {
            destination = "/portal/bookings/request?service=meet-and-greet&required=1";
          }
        } else {
          destination = "/portal/bookings/request?service=meet-and-greet&required=1";
        }
      }

      setSuccessMessage(
        role === "admin"
          ? "Login successful. Redirecting to the admin dashboard..."
          : destination.includes("meet-and-greet")
            ? "Login successful. Redirecting you to book your meet and greet..."
            : "Login successful. Redirecting to your portal...",
      );
      router.push(destination);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to finish logging you in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="page-shell">
          <section className="page-card auth-page-card">
            <span className="eyebrow">Pet Parent Login</span>
            <h1 className="page-title">Log in to your account</h1>
            <p className="page-intro">
              Use your email and password to access your portal. If you are new here,
              create your account from the dedicated registration page first.
            </p>

            {registeredNotice ? (
              <p className="auth-success">
                Account created. If email confirmation is required, check your inbox first, then
                log in here.
              </p>
            ) : null}
            {firstTimeNotice ? (
              <p className="portal-subcopy" style={{ marginTop: registeredNotice ? "12px" : 0 }}>
                Because you marked yourself as a first-time client, we will send you to book your
                meet and greet after login.
              </p>
            ) : null}

            <form className="form-card auth-form" onSubmit={handleSubmit}>
              <div className="field-grid auth-grid">
                <div className="field field-full">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required />
                </div>
                <div className="field field-full">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
              {successMessage ? (
                <p className="auth-success">{successMessage}</p>
              ) : null}

              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Log In"}
              </button>
            </form>

            <p className="auth-switch">
              Forgot your password? <Link href="/forgot-password">Reset it here</Link>.
            </p>
            <p className="auth-switch">
              Need an account? <Link href="/register">Create one here</Link>.
            </p>
            <div style={{ marginTop: "16px" }}>
              <Link className="button button-secondary" href="/register">
                Create Account
              </Link>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
