import { useState } from "react";
import { Search } from "lucide-react";
import ProductCard from "../components/ProductCard.jsx";

export default function Collection({ products, loading, loadError, reload }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const cats = [
    "All",
    "Set",
    "Ring",
    "Necklace",
    "Earrings",
    "Bangles",
    "Bridal Set",
  ];
  const shown = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.name} ${p.category} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="page section collectionPage">
      <div className="pageHead">
        <span className="eyebrow">AMIR JEWELLERS · THE GOLD COLLECTION</span>
        <h1>The art of gold.</h1>
        <p>
          Discover pieces that reflect elegance, heritage, and individuality.
          Displayed prices are estimates based on the latest owner-entered rates.
        </p>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <span className="srOnly">Search the collection</span>
          <input
            placeholder="Search collection"
            value={search}
            aria-label="Search collection"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="chips">
          {cats.map((c) => (
            <button
              className={category === c ? "chip active" : "chip"}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {loadError && (
        <p className="publicPageError" role="alert">
          The collection could not be loaded. <button type="button" onClick={reload}>Try again</button>
        </p>
      )}
      {loading ? (
        <p className="publicPageState" role="status">Loading the collection…</p>
      ) : shown.length ? (
        <div className="grid">
          {shown.map((p) => (
            <ProductCard p={p} key={p._id} />
          ))}
        </div>
      ) : (
        <div className="empty publicEmpty">
          <h3>{loadError ? "The collection is unavailable." : products.length ? "No pieces match your search." : "A collection awaits."}</h3>
          <p>{loadError ? "Please try again shortly." : "Try another search or category."}</p>
        </div>
      )}
    </section>
  );
}
