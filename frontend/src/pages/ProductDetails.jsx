import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { money, whatsappUrl } from "../config.js";

export default function ProductDetails({ products, rates = [], loading, loadError }) {
  const { id } = useParams();
  const p = products.find((x) => x._id === id);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => setSelectedImage(0), [id]);

  if (loading)
    return (
      <section className="section page productDetailsPage">
        <p role="status">Loading product…</p>
      </section>
    );
  if (!p)
    return (
      <section className="section page productDetailsPage">
        <div className="empty">
          <h2>{loadError ? "Product details are unavailable." : "Product not found"}</h2>
          {loadError && <p role="alert">Could not load the product catalogue: {loadError}</p>}
          <Link to="/collection">Back to collection</Link>
        </div>
      </section>
    );
  const goldRate = rates.find(
    (entry) => Number(entry.purityKarat) === Number(p.purityKarat),
  );
  const images = Array.isArray(p.images)
    ? p.images.filter((image) => typeof image === "string" && image)
    : [];
  const activeImage =
    images[selectedImage] ||
    images[0] ||
    "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85";
  const inquiryUrl = whatsappUrl(
    `Hello, I'm interested in ${p.name} (${p.purityKarat}K ${p.category}). Please confirm availability and final pricing.`,
  );

  return (
    <section className="detail section productDetailsPage">
      <div className="detailGallery">
        <div className="detailImage">
        <img
          src={activeImage}
          alt={p.name}
          loading="eager"
          decoding="async"
        />
        </div>
        {images.length > 1 && (
          <div className="detailThumbnails" role="group" aria-label="Product images">
            {images.map((image, index) => (
              <button
                className={`detailThumbnail${selectedImage === index ? " active" : ""}`}
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelectedImage(index)}
                aria-label={`Show product image ${index + 1}`}
                aria-pressed={selectedImage === index}
              >
                <img src={image} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="detailText">
        <span className="eyebrow">
          {p.purityKarat}K GOLD · {p.category}
        </span>
        <h1>{p.name}</h1>
        <p>{p.description}</p>
        <div className="detailPrice">
          {p.rateUpdatedAt ? money(p.estimatedPrice) : "Rate unavailable"}
          <small>{p.rateUpdatedAt ? "Estimated price" : "Enter a current gold rate to calculate an estimate"}</small>
        </div>
        <div className="specs">
          <div>
            <span>Current gold rate</span>
            <b>
              {goldRate && Number(goldRate.ratePerGram) > 0
                ? `${money(goldRate.ratePerGram)} / gram`
                : "Not currently listed"}
            </b>
          </div>
          <div>
            <span>Gold purity</span>
            <b>{p.purityKarat} Karat</b>
          </div>
          <div>
            <span>Weight</span>
            <b>{p.weightGrams} grams</b>
          </div>
          <div>
            <span>Making charges</span>
            <b>{money(p.makingCharges)}</b>
          </div>
          <div>
            <span>Availability</span>
            <b>{p.isAvailable ? "Available" : "Currently unavailable"}</b>
          </div>
        </div>
        <p className="notice">
          Displayed price is an estimate. Final price, taxes, wastage and
          additional charges must be confirmed by the shop.
        </p>
        <div className="detailActions">
          {inquiryUrl ? (
            <a className="btn gold" href={inquiryUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={16} aria-hidden="true" /> Enquire on WhatsApp
            </a>
          ) : (
            <Link className="btn gold" to="/contact">
              Enquire with the shop <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          {inquiryUrl && <Link className="detailContactLink" to="/contact">Other ways to contact us</Link>}
        </div>
      </div>
    </section>
  );
}
