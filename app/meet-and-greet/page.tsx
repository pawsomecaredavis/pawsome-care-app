import { SiteShell } from "../components/site-shell";

export default function MeetAndGreetPage() {
  return (
    <SiteShell>
      <main className="page-main">
        <div className="page-shell">
          <section className="page-card">
            <span className="eyebrow">New Client Form</span>
            <h1 className="page-title">Request a Meet & Greet</h1>
            <p className="page-intro">Ready to bring your pup in for daycare? Fill out the form below and we will follow up with the next available introduction appointment.</p>
            <div className="form-layout">
              <form className="form-card">
                <input className="hidden-field" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
                <div className="field-grid">
                  <div className="field"><label htmlFor="firstName">First Name *</label><input type="text" id="firstName" name="firstName" required /></div>
                  <div className="field"><label htmlFor="lastName">Last Name *</label><input type="text" id="lastName" name="lastName" required /></div>
                  <div className="field"><label htmlFor="email">Email *</label><input type="email" id="email" name="email" required /></div>
                  <div className="field"><label htmlFor="phone">Phone *</label><input type="tel" id="phone" name="phone" placeholder="(___)-___-____" required /></div>
                  <div className="field"><label htmlFor="dogName">Dog Name *</label><input type="text" id="dogName" name="dogName" required /></div>
                  <div className="field"><label htmlFor="dogAge">Dog Age *</label><input type="text" id="dogAge" name="dogAge" placeholder="For example: 2 years old" required /></div>
                  <div className="field"><label htmlFor="breed">Breed *</label><input type="text" id="breed" name="breed" required /></div>
                  <div className="field field-full"><label htmlFor="preferredDates">Preferred Meet & Greet Dates *</label><textarea id="preferredDates" name="preferredDates" rows={3} placeholder="List one or more dates that work for you. Example: April 2, April 4, or April 6 after 3 PM." required /></div>
                  <div className="field"><label htmlFor="vaccinationStatus">Vaccination Status *</label><input type="text" id="vaccinationStatus" name="vaccinationStatus" placeholder="Up to date, Rabies, DHPP, Bordetella" required /></div>
                  <div className="field"><label htmlFor="additionalDog">Add Another Dog (Optional)</label><input type="text" id="additionalDog" name="additionalDog" /></div>
                  <div className="field"><label htmlFor="referral">Referral Code (Optional)</label><input type="text" id="referral" name="referral" /></div>
                  <div className="field field-full"><label htmlFor="behaviorNotes">Behavior or Special Care Notes</label><textarea id="behaviorNotes" name="behaviorNotes" rows={4} placeholder="Anything we should know about energy level, socialization, medication, allergies, or routines?" /></div>
                  <div className="field field-full"><label htmlFor="message">Message (Optional)</label><textarea id="message" name="message" rows={4} /></div>
                </div>
                <div className="checkbox-group">
                  <label className="checkbox-item" htmlFor="privacy"><input type="checkbox" id="privacy" name="privacy" required /><span className="checkbox-text">Yes, I agree that Pawsome Care may contact me and I have read and agree with the privacy policy.*</span></label>
                  <label className="checkbox-item" htmlFor="requirements"><input type="checkbox" id="requirements" name="requirements" required /><span className="checkbox-text">I confirm my dog meets the age and health requirements for daycare and boarding.*</span></label>
                </div>
                <button className="submit-button" type="submit">I'm ready to book my Meet & Greet</button>
              </form>
              <aside className="helper-card">
                <h2>What happens next?</h2>
                <p>After you submit this request, Pawsome Care can review your details, confirm that your dog meets daycare requirements, and reach out to schedule the visit.</p>
                <p className="helper-extra">Please be ready to share vaccination records and any behavior notes that would help us make the visit safe and comfortable.</p>
                <p className="helper-note">This is the visual form in the new app. We will connect it to the database when we set up Supabase.</p>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
