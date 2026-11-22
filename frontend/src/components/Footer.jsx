import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { address, mapUrl, phone, shop, whatsappUrl } from "../config.js";

const hasAddress = address && !address.startsWith("Add verified");
const hasPhone = phone && !phone.startsWith("Add business");
const hasMapUrl = mapUrl && mapUrl !== "https://maps.google.com/";

export default function Footer() {
  const whatsapp = whatsappUrl(
    "Hello, I would like to enquire about AMIR JEWELLERS.",
  );

  return (
    <footer className="siteFooter">
      <div className="siteFooterMain">
        <div className="footerBrand">
          <Link to="/" className="footerWordmark">
            {shop}
          </Link>
          <p>Crafted to be timeless.</p>
        </div>
        <div className="footerColumn">
          <h2>Explore</h2>
          <Link to="/collection">Collections</Link>
          <Link to="/gold-rates">Gold rates</Link>
          <Link to="/about">About us</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footerColumn footerContact">
          <h2>Visit & enquire</h2>
          {hasAddress &&
            (hasMapUrl ? (
              <p>
                <a
                  href={"https://maps.app.goo.gl/XTrSXY2wxyJ7Krav9"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {"Smosa chowk kotli Azad Kashmir Pakistan"}
                </a>
              </p>
            ) : (
              <p>{address}</p>
            ))}
          {hasPhone && (
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "+923453819346")}`}
              className="footerContactLink"
            >
              {+923453819346}
            </a>
          )}
          {whatsapp && (
            <a
              className="footerContactLink"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={14} aria-hidden="true" /> Chat on WhatsApp
            </a>
          )}
          {!hasAddress && !hasPhone && (
            <p>For verified shop details, visit our contact page.</p>
          )}
          <Link to="/contact" className="footerContactLink">
            Get in touch <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="footerMark" aria-hidden="true">
          A
        </div>
      </div>
      <div className="siteFooterBottom">
        <span>
          © {new Date().getFullYear()} {shop}
        </span>
        <span>Gold that carries a story.</span>
      </div>
    </footer>
  );
}
