import { ArrowRight, MapPin, Phone } from "lucide-react";
import { address, mapUrl, phone, whatsappUrl } from "../config.js";

export default function Contact() {
  const whatsapp = whatsappUrl(
    "Hello, I would like to enquire about AMIR JEWELLERS.",
  );
  const hasAddress = address && !address.startsWith("Add verified");
  const hasPhone = phone && !phone.startsWith("Add business");
  const hasMapUrl = mapUrl && mapUrl !== "https://maps.google.com/";
  return (
    <section className="page section contactPage">
      <div className="pageHead">
        <span className="eyebrow">AMIR JEWELLERS · PERSONAL ENQUIRIES</span>
        <h1>We would love to hear from you.</h1>
        <p>Contact the team for availability and confirmed final pricing.</p>
      </div>
      <div className="contactGrid">
        <div className="contactCard">
          <MapPin />
          <span className="eyebrow">OUR LOCATION</span>
          <h3>Visit AMIR JEWELLERS</h3>
          <p>
            {hasAddress ? (
              hasMapUrl ? (
                <a
                  href={"https://maps.app.goo.gl/XTrSXY2wxyJ7Krav9"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {"Smosa chowk kotli Azad Kashmir Pakistan"}
                </a>
              ) : (
                address
              )
            ) : (
              "Verified shop location details are not currently available."
            )}
          </p>
          {hasMapUrl && (
            <a
              className="textLink"
              href={"https://maps.app.goo.gl/XTrSXY2wxyJ7Krav9"}
              target="_blank"
              rel="noreferrer"
            >
              Open map &amp; directions <ArrowRight size={15} />
            </a>
          )}
        </div>
        <div className="contactCard">
          <Phone />
          <span className="eyebrow">GET IN TOUCH</span>
          <h3>Talk to our team</h3>
          <p>
            {hasPhone ? (
              <a href={`tel:${phone.replace(/[^\d+]/g, "+923453819346")}`}>
                {+923453819346}
              </a>
            ) : (
              "Verified contact details are not currently available."
            )}
          </p>
          {whatsapp ? (
            <a
              className="textLink"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Chat on WhatsApp <ArrowRight size={15} />
            </a>
          ) : null}
        </div>
      </div>
      {hasMapUrl && (
        <div className="mapPanel">
          <div>
            <MapPin />
            <h2>Find us</h2>
            {hasAddress && (
              <p>
                {hasAddress && (
                  <a
                    href={"https://maps.app.goo.gl/XTrSXY2wxyJ7Krav9"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {"Smosa chowk kotli Azad Kashmir Pakistan"}
                  </a>
                )}
              </p>
            )}
            <a
              className="btn gold"
              href={"https://maps.app.goo.gl/XTrSXY2wxyJ7Krav9"}
              target="_blank"
              rel="noreferrer"
            >
              Open map &amp; directions <ArrowRight size={15} />
            </a>
          </div>
          <div className="mapGraphic" aria-hidden="true">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26610.176088107313!2d73.88258422423625!3d33.52031279511604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38e0216facc7956b%3A0xa94f11da6a5d789d!2sSamosa%20Chowk%2C%20Kotli!5e0!3m2!1sen!2s!4v1793786131095!5m2!1sen!2s"
              title="AMIR JEWELLERS Location"
              width="100%"
              height="350"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <MapPin size={38} />
            <small>AMIR JEWELLERS</small>
          </div>
        </div>
      )}
    </section>
  );
}
