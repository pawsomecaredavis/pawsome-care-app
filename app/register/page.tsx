"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "../components/site-shell";
import { isLikelyValidPhone, normalizePhoneForStorage } from "../../lib/phone";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const phoneInput = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const phone = normalizePhoneForStorage(phoneInput);

    if (password !== confirmPassword) {
      setIsSubmitting(false);
      setErrorMessage("Your passwords do not match yet. Please enter the same password twice.");
      return;
    }

    if (!isLikelyValidPhone(phoneInput)) {
      setIsSubmitting(false);
      setErrorMessage("Please enter a valid mobile phone number.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role: "parent",
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setErrorMessage("That email or phone number is already connected to an account.");
        return;
      }

      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Account created. Redirecting you to the login page...");
    event.currentTarget.reset();
    router.push("/login?registered=1");
    router.refresh();
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="page-shell">
          <section className="page-card auth-page-card">
            <span className="eyebrow">Create Account</span>
            <h1 className="page-title">Register as a pet parent</h1>
            <p className="page-intro">
              Use a normal client registration flow: full name, email, mobile phone,
              and password confirmation before entering the portal.
            </p>

            <form className="form-card auth-form" onSubmit={handleSubmit}>
              <div className="field-grid auth-grid">
                <div className="field field-full">
                  <label htmlFor="fullName">Full Name</label>
                  <input type="text" id="fullName" name="fullName" required />
                </div>
                <div className="field field-full">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required />
                </div>
                <div className="field field-full">
                  <label htmlFor="phone">Mobile Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="(530) 555-1234"
                    required
                  />
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
                <div className="field field-full">
                  <label htmlFor="confirmPassword">Confirm Password</label>
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
              {successMessage ? (
                <p className="auth-success">{successMessage}</p>
              ) : null}

              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link href="/login">Log in here</Link>.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
