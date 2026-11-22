import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import ProductCard from "../components/ProductCard.jsx";
import Reveal from "../components/Reveal.jsx";
import { money } from "../config.js";

const heroImage =
  "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=2400&q=88";
const storyImage =
  "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1400&q=85";

const highlights = [
  {
    number: "01",
    title: "Timeless craftsmanship",
    description: "Considered details and enduring forms, made to be treasured.",
  },
  {
    number: "02",
    title: "Transparent gold pricing",
    description: "Estimates are guided by the current rates entered by our team.",
  },
  {
    number: "03",
    title: "Made for your moments",
    description: "Meaningful pieces for the occasions that become your story.",
  },
];

export default function Home({
  products,
  rates,
  loading,
  productLoadError,
  rateLoadError,
  reload,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="homePage">
      {(productLoadError || rateLoadError) && (
        <p className="homeDataNotice" role="alert">
          Some shop information could not be loaded.{" "}
          <button type="button" onClick={reload}>Retry</button>
        </p>
      )}

      <section className="cinematicHero" aria-labelledby="home-hero-title">
        <motion.img
          className="cinematicHeroImage"
          src={heroImage}
          alt="Gold jewellery arranged in warm, dramatic light"
          fetchpriority="high"
          decoding="async"
          initial={reduceMotion ? false : { scale: 1.035, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 1.1, ease: "easeOut" }}
        />
        <div className="cinematicHeroShade" aria-hidden="true" />
        <div className="cinematicHeroContent">
          <motion.span
            className="cinematicBrand"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.45 }}
          >
            AMIR JEWELLERS
          </motion.span>
          <motion.h1
            id="home-hero-title"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.6, delay: 0.08 }}
          >
            Crafted to be
            <br />
            <em>timeless.</em>
          </motion.h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.5, delay: 0.18 }}
          >
            Discover the enduring beauty of gold, crafted to celebrate life&apos;s most precious
            moments.
          </motion.p>
          <motion.div
            className="cinematicHeroActions"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.45, delay: 0.26 }}
          >
            <Link className="luxuryButton luxuryButton--gold" to="/collection">
              Explore collection <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link className="luxuryTextLink" to="/about">
              Discover our story <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
        <span className="cinematicCaption">AN EXPRESSION OF TIMELESS ELEGANCE</span>
        <a className="cinematicScroll" href="#featured-collection" aria-label="Scroll to the featured collection">
          <span>DISCOVER THE COLLECTION</span>
          <ArrowDown size={14} aria-hidden="true" />
        </a>
      </section>

      <Reveal className="homeFeatured luxurySection">
        <div className="luxurySectionHeading">
          <div>
            <span className="luxuryEyebrow">A CURATED COLLECTION</span>
            <h2 id="featured-collection">The art of gold</h2>
            <p>Exceptional pieces for life&apos;s most meaningful moments.</p>
          </div>
          <Link className="luxuryTextLink" to="/collection">
            View all pieces <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {loading ? (
          <p className="luxuryState" role="status">Discovering the collection…</p>
        ) : products.length ? (
          <div className="grid">
            {products.slice(0, 3).map((product) => (
              <ProductCard p={product} key={product._id} showCta />
            ))}
          </div>
        ) : (
          <div className="luxuryState">
            <h3>{productLoadError ? "The collection is unavailable right now." : "A collection awaits."}</h3>
            <p>
              {productLoadError
                ? "Please try again shortly to see the latest pieces."
                : "New pieces will appear here when they are added to the catalogue."}
            </p>
            {productLoadError ? (
              <button className="luxuryTextLink luxuryRetry" type="button" onClick={reload}>Retry</button>
            ) : (
              <Link className="luxuryTextLink" to="/collection">
                Browse collection <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </Reveal>

      <Reveal className="homeRates luxuryRates">
        <div className="luxuryRatesHeading">
          <span className="luxuryEyebrow">MARKET REFERENCE · PKR PER GRAM</span>
          <h2>Today&apos;s gold rates</h2>
        </div>
        {loading && !rates.length ? (
          <p className="luxuryState" role="status">Loading current gold rates…</p>
        ) : rateLoadError && !rates.length ? (
          <div className="luxuryRateError" role="alert">
            <p>Current rates are unavailable.</p>
            <button type="button" onClick={reload}>Retry</button>
          </div>
        ) : (
          <div className="homeRateValues">
            {[24, 22, 21].map((purity) => {
              const rate = rates.find((entry) => Number(entry.purityKarat) === purity);
              const hasRate = rate && Number(rate.ratePerGram) > 0;
              return (
                <article className="homeRate" key={purity}>
                  <span>{purity}K gold</span>
                  <b>{hasRate ? money(rate.ratePerGram) : "Not currently listed"}</b>
                  <small>
                    {hasRate
                      ? `PKR per gram${rate.updatedAt ? ` · Updated ${new Date(rate.updatedAt).toLocaleDateString()}` : ""}`
                      : "PKR per gram"}
                  </small>
                </article>
              );
            })}
          </div>
        )}
        <Link className="luxuryTextLink" to="/gold-rates">
          View all gold rates <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <p className="luxuryRatesNote">Rates are entered manually and may change.</p>
      </Reveal>

      <Reveal className="homeStory luxuryStory">
        <div className="homeStoryImage luxuryStoryImage">
          <img
            src={storyImage}
            alt="Sculptural gold jewellery reflecting the details of fine craftsmanship"
            loading="lazy"
            decoding="async"
          />
          <span className="luxuryImageIndex">THE AMIR JEWELLERS STORY</span>
        </div>
        <div className="homeStoryCopy luxuryStoryCopy">
          <span className="luxuryEyebrow">CRAFTED WITH MEANING</span>
          <h2>More than gold.<br /><em>A legacy.</em></h2>
          <p>
            At AMIR JEWELLERS, every piece represents more than precious metal. It reflects
            craftsmanship, meaningful moments, and a tradition of timeless elegance.
          </p>
          <Link className="luxuryButton luxuryButton--outline" to="/about">
            Discover our story <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>

      <Reveal className="luxuryHighlights">
        {highlights.map((highlight) => (
          <article className="luxuryHighlight" key={highlight.number}>
            <span>{highlight.number}</span>
            <h2>{highlight.title}</h2>
            <p>{highlight.description}</p>
          </article>
        ))}
      </Reveal>

      <Reveal className="homeClosing luxuryClosing">
        <span className="luxuryEyebrow">AMIR JEWELLERS</span>
        <h2>Your next treasure awaits</h2>
        <p>Find a piece that becomes part of your story.</p>
        <Link className="luxuryButton luxuryButton--gold" to="/collection">
          Explore the collection <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </Reveal>
    </div>
  );
}
