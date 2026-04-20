"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteShell } from "../components/site-shell";
import { supabase } from "../../lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setIsRecoveryReady(Boolean(session));
      setIsCheckingSession(false);
    }

    void checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password.length < 6) {
      setIsSubmitting(false);
      setErrorMessage("Please choose a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setIsSubmitting(false);
      setErrorMessage("Your new password and confirmation do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Password updated. Redirecting you back to the portal...");
    event.currentTarget.reset();

    setTimeout(() => {
      router.push("/portal?reset=1");
      router.refresh();
    }, 1200);
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="page-shell">
          <section className="page-card auth-page-card">
            <span className="eyebrow">Password Help</span>
            <h1 className="page-title">Set a new password</h1>
            <p className="page-intro">
              Choose a new password for your account, then head back to the portal login.
            </p>

            {isCheckingSession ? (
              <p className="portal-loading-text">Checking your reset link...</p>
            ) : !isRecoveryReady ? (
              <>
                <p className="auth-error">
                  This reset link is no longer active. Request a fresh password reset email to continue.
                </p>
                <p className="auth-switch">
                  Need a new reset link? <Link href="/forgot-password">Request one here</Link>.
                </p>
              </>
            ) : (
              <form className="form-card auth-form" onSubmit={handleSubmit}>
                <div className="field-grid auth-grid">
                  <div className="field field-full">
                    <label htmlFor="password">New Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="field field-full">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
                {successMessage ? <p className="auth-success">{successMessage}</p> : null}

                <button className="submit-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating password..." : "Save New Password"}
                </button>
              </form>
            )}

            <p className="auth-switch">
              Back to <Link href="/portal">portal login</Link>.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
