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
    const firstTimeAnswer = String(formData.get("isFirstTimeClient") || "").trim();
    const phone = normalizePhoneForStorage(phoneInput);
    const isFirstTimeClient = firstTimeAnswer === "yes";

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

    if (!firstTimeAnswer) {
      setIsSubmitting(false);
      setErrorMessage("Please tell us whether this is your first time booking with Pawsome Care.");
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
          is_first_time_client: isFirstTimeClient,
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

    setSuccessMessage("Account created. Redirecting you back to the portal...");
    event.currentTarget.reset();
    router.push(`/portal?registered=1${isFirstTimeClient ? "&firstTime=1" : ""}`);
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
              Create your portal account here, then we will guide first-time clients into
              the meet and greet flow before they request daycare or boarding stays.
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
                  <label htmlFor="isFirstTimeClient">Have you booked with Pawsome Care before?</label>
                  <select
                    id="isFirstTimeClient"
                    name="isFirstTimeClient"
                    className="admin-select"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="yes">No, I am brand new</option>
                    <option value="no">Yes, I am an existing client</option>
                  </select>
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

              <p className="portal-subcopy" style={{ marginTop: "4px" }}>
                Brand new clients will be routed to book a meet and greet after login. Existing
                clients can continue straight into the normal portal flow.
              </p>

              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

              <p className="auth-switch">
                Already have an account? <Link href="/portal">Log in here</Link>.
              </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
