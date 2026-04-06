"use client";

import { useState } from "react";
import { AvailabilityCalendar } from "../components/availability-calendar";
import { SiteShell } from "../components/site-shell";

const services = [
  { name: "Dog Daycare", price: "$44/day", text: "Structured daytime care in a home setting with potty breaks, supervision, play, rest time, and photo updates throughout the day." },
  { name: "Dog Boarding", price: "$67/night", text: "Overnight care for dogs who do best with a personal home environment, regular routines, and close attention instead of a crowded kennel setup." },
  { name: "Dog Walking", price: "$25/walk", text: "Reliable 30-minute neighborhood walks focused on exercise, enrichment, and consistency for dogs who need a midday break or extra movement." },
  { name: "Pet Drop-In", price: "$25/visit", text: "Quick but attentive 30-minute home visits for feeding, potty breaks, water refresh, medication routines, and check-ins while you are away." },
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

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card">
            <span className="eyebrow">Services</span>
            <h1 className="section-title">Flexible pet care for busy Davis pet parents</h1>
            <p className="section-copy">Every service is designed around safety, communication, and a calmer experience for your pet in Davis, CA.</p>
            <div className="services-grid">
              {services.map((service) => (
                <article className="service-card" key={service.name}>
                  <div className="service-head">
                    <h3>
                      {service.name}
                      {service.name === "Dog Walking" ? <button className="inline-info service-info" type="button" onClick={() => setModal("walking")}>!</button> : null}
                      {service.name === "Pet Drop-In" ? <button className="inline-info service-info" type="button" onClick={() => setModal("dropin")}>!</button> : null}
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
              <p>Holiday rates <button className="inline-info" type="button" onClick={() => setModal("holiday")}>!</button></p>
            </div>
            <AvailabilityCalendar />
            <div className="team-section" id="faq">
              <span className="eyebrow">Frequently Asked Questions</span>
              <div className="faq-grid">
                {faqs.map(([question, answer]) => <article className="faq-card" key={question}><h3>{question}</h3><p>{answer}</p></article>)}
              </div>
            </div>
          </section>
          {modal ? <div className="modal-backdrop" onClick={() => setModal(null)}><div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="modal-header"><button className="modal-back" type="button" onClick={() => setModal(null)} aria-label="Close modal">&#8592;</button><h2>{modal === "holiday" ? "Holiday Rate" : modal === "walking" ? "Dog Walking Rates" : "Pet Drop-In Rates"}</h2></div><div className="modal-body">{modal === "holiday" ? <><p>Stays that include any of the following dates will be priced at the holiday rate:</p><ul className="modal-list"><li>May 22-25, 2026</li><li>Jun 19-21, 2026</li><li>Jul 3-5, 2026</li><li>Sep 4-7, 2026</li><li>Nov 26-29, 2026</li><li>Dec 24, 2026 - Jan 3, 2027</li></ul><div className="modal-rates"><p>Daycare: $64/day</p><p>Boarding: $87/night</p><p>Dog Walking: $30/walk</p><p>Pet Drop-In: $30/visit</p></div></> : null}{modal === "walking" ? <div className="modal-rates"><p>Standard dog walking bookings are 30 minutes.</p><p>Dog Walking: 60 minutes for $40</p></div> : null}{modal === "dropin" ? <div className="modal-rates"><p>Standard pet drop-in bookings are 30 minutes.</p><p>Pet Drop-In: 60 minutes for $40</p></div> : null}</div><button className="modal-close" type="button" onClick={() => setModal(null)}>Close</button></div></div> : null}
        </div>
      </main>
    </SiteShell>
  );
}
