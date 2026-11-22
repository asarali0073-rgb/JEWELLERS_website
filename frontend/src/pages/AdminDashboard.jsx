import { Link } from "react-router-dom";
import { ArrowRight, Package, Percent, RefreshCw, Sparkles } from "lucide-react";
import { money } from "../config.js";

export default function AdminDashboard({
  products,
  rates,
  loading,
  productLoadError,
  rateLoadError,
  reload,
}) {
  const availableCount = products.filter((product) => product.isAvailable).length;

  return (
    <section className="adminPage">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">OVERVIEW</span>
          <h1>Good day.</h1>
          <p>Here is the current view of your jewellery catalogue and rates.</p>
        </div>
        <button className="adminRefresh" type="button" onClick={reload} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>

      {(productLoadError || rateLoadError) && (
        <div className="adminFeedback error" role="alert">
          {productLoadError && <p>Could not load the catalogue: {productLoadError}</p>}
          {rateLoadError && <p>Could not load gold rates: {rateLoadError}</p>}
          <button type="button" onClick={reload}>Try again</button>
        </div>
      )}

      <div className="adminStats">
        <article className="adminStatCard">
          <span><Package size={18} aria-hidden="true" /> CATALOGUE</span>
          <b>{loading ? "—" : products.length}</b>
          <small>Total jewellery products</small>
        </article>
        <article className="adminStatCard">
          <span><Sparkles size={18} aria-hidden="true" /> AVAILABLE</span>
          <b>{loading ? "—" : availableCount}</b>
          <small>Currently listed as available</small>
        </article>
        <article className="adminStatCard">
          <span><Percent size={18} aria-hidden="true" /> GOLD RATES</span>
          <b>{loading ? "—" : `${rates.filter((rate) => Number(rate.ratePerGram) > 0).length}/3`}</b>
          <small>Purities with an entered rate</small>
        </article>
      </div>

      <div className="adminOverviewGrid">
        <section className="adminPanel">
          <div className="adminPanelHeading">
            <div><span className="adminEyebrow">MANUAL MARKET REFERENCE</span><h2>Gold rates</h2></div>
            <Link to="/admin/gold-rates" className="adminTextLink">Manage <ArrowRight size={14} /></Link>
          </div>
          {loading && !rates.length ? (
            <p className="adminMuted" role="status">Loading current rates…</p>
          ) : rates.length ? (
            <div className="adminRateList">
              {[24, 22, 21].map((purity) => {
                const rate = rates.find((entry) => Number(entry.purityKarat) === purity);
                return (
                  <div className="adminRateRow" key={purity}>
                    <span>{purity}K gold <small>per gram</small></span>
                    <b>{rate && Number(rate.ratePerGram) > 0 ? money(rate.ratePerGram) : "Not entered"}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="adminMuted">No rates are available right now.</p>
          )}
        </section>

        <section className="adminPanel adminQuickActions">
          <span className="adminEyebrow">QUICK NAVIGATION</span>
          <h2>Manage your shop</h2>
          <Link to="/admin/products"><Package size={17} /> Manage jewellery <ArrowRight size={15} /></Link>
          <Link to="/admin/gold-rates"><Percent size={17} /> Update gold rates <ArrowRight size={15} /></Link>
          <Link to="/"><ArrowRight size={17} /> View public website <ArrowRight size={15} /></Link>
        </section>
      </div>

      <p className="adminDataNote">Catalogue and rate changes are stored in their respective MongoDB databases.</p>
    </section>
  );
}
