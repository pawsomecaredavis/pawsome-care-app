"use client";

import { useState } from "react";
import { AvailabilityCalendar } from "../components/availability-calendar";
import { SiteShell } from "../components/site-shell";
import {
  BOARDING_LATE_PICKUP_FULL_DAY_RATE,
  BOARDING_LATE_PICKUP_HALF_DAY_RATE,
  BOARDING_NIGHT_RATE,
  DAYCARE_BASE_RATE,
  formatCurrency,
  MEET_AND_GREET_RATE,
} from "../../lib/booking-pricing";

const services = [
  { name: "Dog Daycare", price: `${formatCurrency(DAYCARE_BASE_RATE)}/day`, text: "Daytime home-based care with play, rest, and potty breaks." },
  { name: "Dog Boarding", price: `${formatCurrency(BOARDING_NIGHT_RATE)}/night`, text: "Overnight care in a calm home setting with consistent routines." },
  { name: "Dog Walking", price: "$25/walk", text: "30-minute neighborhood walks focused on movement and routine." },
  { name: "Pet Drop-In", price: "$25/visit", text: "30-minute home visits for feeding, potty breaks, and check-ins." },
];

const faqs = [
  ["Do new clients need a meet and greet first?", "Yes. A meet and greet helps confirm fit, review routines, and make the first stay feel smoother for everyone."],
  ["What is a Meet & Greet and why do I need one?", "A Meet & Greet usually takes about 20 to 30 minutes and helps confirm that your dog is a good fit for a home-based social care environment. Dogs should be current on required vaccinations, and dogs older than 7 months should be spayed or neutered."],
  ["What vaccinations do you require?", "Dogs should be up to date on core vaccinations. You can share current vaccination details in the meet and greet form."],
  ["How long are dog walks and drop-in visits?", "Standard bookings are 30 minutes. Extended 60-minute dog walks and drop-in visits are also available."],
  ["Do rates change during holiday periods?", "Yes. Holiday periods have adjusted rates because of higher demand. Exact dates and holiday pricing are listed above in the Services section."],
  ["Will I get updates while my dog is in care?", "Yes. Pet parents can view a structured daily update in the Pet Parent Portal, including care notes, activity highlights, and photos when available."],
  ["Where are you located?", "Pawsome Care is based in Davis, California and provides a calm, home-based pet care environment."],
];

export default function ServicesPage() {
  const [modal, setModal] = useState<"holiday" | "walking" | "dropin" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card">
            <div className="services-page-head">
              <h1 className="section-title services-page-title">Pet care services in Davis, CA</h1>
              <p className="section-copy services-page-copy">
                Home-based care options designed to feel calm, clear, and easy to book.
              </p>
            </div>
            <div className="services-grid">
              {services.map((service) => (
                <article className="service-card" key={service.name}>
                  <div className="service-head">
                    <h3>
                      {service.name}
                      {service.name === "Dog Walking" ? <button className="inline-info service-info" type="button" aria-label="More about dog walking rates" onClick={() => setModal("walking")}><span>i</span></button> : null}
                      {service.name === "Pet Drop-In" ? <button className="inline-info service-info" type="button" aria-label="More about pet drop-in rates" onClick={() => setModal("dropin")}><span>i</span></button> : null}
                    </h3>
                    <span className="service-price">{service.price}</span>
                  </div>
                  <p>{service.text}</p>
                </article>
              ))}
            </div>
            <div className="rates-note">
              <h3>Additional Rates</h3>
              <p>Second dog is 30% off the base rate for the same booking.</p>
              <p>
                Meet &amp; Greets are complimentary. Boarding regular rate is{" "}
                {formatCurrency(BOARDING_NIGHT_RATE)}/night. Late pickup adds{" "}
                {formatCurrency(BOARDING_LATE_PICKUP_HALF_DAY_RATE)} for 2-8 extra hours or{" "}
                {formatCurrency(BOARDING_LATE_PICKUP_FULL_DAY_RATE)} for more than 8 hours.
              </p>
              <p>Holiday rates <button className="inline-info" type="button" aria-label="More about holiday rates" onClick={() => setModal("holiday")}><span>i</span></button></p>
            </div>
            <AvailabilityCalendar />
            <div className="team-section" id="faq">
              <span className="eyebrow">Frequently Asked Questions</span>
              <div className="faq-list">
                {faqs.map(([question, answer], index) => {
                  const isOpen = openFaq === index;

                  return (
                    <article className={`faq-card faq-accordion-item${isOpen ? " is-open" : ""}`} key={question}>
                      <button
                        className="faq-question"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                      >
                        <span className={`faq-arrow${isOpen ? " is-open" : ""}`} aria-hidden="true">
                          &#8250;
                        </span>
                        <span>{question}</span>
                      </button>
                      {isOpen ? <p className="faq-answer">{answer}</p> : null}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
          {modal ? <div className="modal-backdrop" onClick={() => setModal(null)}><div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="modal-header"><button className="modal-back" type="button" onClick={() => setModal(null)} aria-label="Close modal">&#8592;</button><h2>{modal === "holiday" ? "Holiday Rate" : modal === "walking" ? "Dog Walking Rates" : "Pet Drop-In Rates"}</h2></div><div className="modal-body">{modal === "holiday" ? <><p>Stays that include any of the following dates will be priced at the holiday rate:</p><ul className="modal-list"><li>May 22-25, 2026</li><li>Jun 19-21, 2026</li><li>Jul 3-5, 2026</li><li>Sep 4-7, 2026</li><li>Nov 26-29, 2026</li><li>Dec 24, 2026 - Jan 3, 2027</li></ul><div className="modal-rates"><p>Daycare: $64/day</p><p>Boarding: $87/night</p><p>Meet &amp; Greet: {formatCurrency(MEET_AND_GREET_RATE)}</p><p>Dog Walking: $30/walk</p><p>Pet Drop-In: $30/visit</p></div></> : null}{modal === "walking" ? <div className="modal-rates"><p>Standard dog walking bookings are 30 minutes.</p><p>Dog Walking: 60 minutes for $40</p></div> : null}{modal === "dropin" ? <div className="modal-rates"><p>Standard pet drop-in bookings are 30 minutes.</p><p>Pet Drop-In: 60 minutes for $40</p></div> : null}</div><button className="modal-close" type="button" onClick={() => setModal(null)}>Close</button></div></div> : null}
        </div>
      </main>
    </SiteShell>
  );
}
