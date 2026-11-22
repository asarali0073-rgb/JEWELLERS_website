import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { money, whatsappUrl } from "../config.js";
import Status from "./Status.jsx";

export default function ProductCard({ p, showCta = false }) {
  const inquiryUrl = whatsappUrl(
    `Hello, I'm interested in ${p.name} (${p.purityKarat}K ${p.category}). Please share its availability and confirmed price.`,
  );

  return (
    <article className="productCard">
      <Link to={`/product/${p._id}`} className="product">
        <div className="productImg">
          <img
            src={
              p.images?.[0] ||
              "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80"
            }
            alt={p.name}
            loading="lazy"
            decoding="async"
          />
          <span>{p.purityKarat}K GOLD</span>
          <Status status={p.isAvailable ? "available" : "unavailable"} />
        </div>
        <div className="productTitle">
          <div>
            <h3>{p.name}</h3>
            <small>{p.category} · {p.weightGrams}g · {p.purityKarat}K gold</small>
          </div>
          <ArrowRight size={18} aria-hidden="true" />
        </div>
        <p className="price">
          {p.rateUpdatedAt ? money(p.estimatedPrice) : "Rate unavailable"}{" "}
          <small>{p.rateUpdatedAt ? "estimated price" : "enter current gold rate"}</small>
        </p>
        {showCta && (
          <span className="productDiscover">
            View details <ArrowRight size={13} aria-hidden="true" />
          </span>
        )}
      </Link>
      {inquiryUrl && (
        <a
          className="productInquiry"
          href={inquiryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ask about ${p.name} on WhatsApp`}
        >
          <MessageCircle size={15} aria-hidden="true" />
          Enquire on WhatsApp
        </a>
      )}
    </article>
  );
}
