"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SiteShell } from "../components/site-shell";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Password reset email sent. Check your inbox and spam folder.");
    event.currentTarget.reset();
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="page-shell">
          <section className="page-card auth-page-card">
            <span className="eyebrow">Password Help</span>
            <h1 className="page-title">Reset your password</h1>
            <p className="page-intro">
              Enter the email tied to your pet parent account and we&apos;ll send you a reset link.
            </p>

            <form className="form-card auth-form" onSubmit={handleSubmit}>
              <div className="field-grid auth-grid">
                <div className="field field-full">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required />
                </div>
              </div>

              {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
              {successMessage ? <p className="auth-success">{successMessage}</p> : null}

              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending reset link..." : "Send Reset Link"}
              </button>
            </form>

            <p className="auth-switch">
              Remembered it? <Link href="/portal">Back to portal login</Link>.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
