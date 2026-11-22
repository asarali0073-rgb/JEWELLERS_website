import { useEffect, useState } from "react";
import { money } from "../config.js";
import { api } from "../api.js";

export default function GoldRate({ rates, loading, loadError, reload }) {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;
    api("/gold-rates/history")
      .then((result) => {
        if (active) setHistory(Array.isArray(result.history) ? result.history : []);
      })
      .catch((error) => {
        if (active) setHistoryError(error.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <section className="page section goldRatesPage">
      <div className="pageHead">
        <span className="eyebrow">DAILY MARKET REFERENCE · PAKISTAN</span>
        <h1>Today&apos;s gold rates.</h1>
        <p>
          Rates are entered manually by the shop owner. Confirm the current rate
          before purchase.
        </p>
      </div>
      <div className="rateCards" aria-label="Current gold rates per gram">
        {[24, 22, 21].map((purity) => {
          const rate = rates.find((entry) => Number(entry.purityKarat) === purity);
          const hasRate = Number(rate?.ratePerGram) > 0;
          const loadingRates = loading && !rates.length;
          return (
            <article className="rateCard" key={purity}>
              <span className="rateCardPurity">{purity}K</span>
              <h2>{loadingRates ? "Loading" : hasRate ? money(rate.ratePerGram) : "Not entered"}</h2>
              <p>PKR per gram</p>
              <small role={loadingRates ? "status" : undefined}>
                {loadingRates
                  ? "Fetching current rates"
                  : rate?.updatedAt
                  ? `Updated ${new Date(rate.updatedAt).toLocaleDateString()}`
                  : "Current rate unavailable"}
              </small>
            </article>
          );
        })}
      </div>
      <div className="publicRatesPanel">
        {loadError && <p className="publicPageError" role="alert">Could not load the latest rates.{" "}
          <button type="button" onClick={reload}>Try again</button></p>}
        <div className="tableWrap publicTableWrap">
          <table>
          <thead>
            <tr>
              <th>Purity</th>
              <th>Rate per gram</th>
              <th>Rate per tola</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {[24, 22, 21].map((purity) => {
              const r = rates.find((entry) => Number(entry.purityKarat) === purity);
              return (
              <tr key={purity}>
                <td>
                  <b>{purity}K Gold</b>
                </td>
                <td>{Number(r?.ratePerGram) > 0 ? money(r.ratePerGram) : "Not entered"}</td>
                <td>{Number(r?.ratePerTola) > 0 ? money(r.ratePerTola) : "Not entered"}</td>
                <td>
                  {r?.updatedAt
                    ? new Date(r.updatedAt).toLocaleString()
                    : "Not updated"}
                </td>
              </tr>
              );
            })}
            </tbody>
          </table>
          {loading && <p className="publicPageState" role="status">Loading current rates…</p>}
          {!loading && !loadError && !rates.length && <p className="publicPageState">No rates entered yet.</p>}
        </div>
      </div>
      <section className="publicRateHistory">
        <div className="publicRateHistoryHeading">
          <span className="eyebrow">SERVICE RECORD</span>
          <h2>Rate history</h2>
        </div>
        {historyLoading ? (
          <p className="publicPageState" role="status">Loading rate history…</p>
        ) : historyError ? (
          <p className="publicPageError" role="alert">Rate history is unavailable: {historyError}</p>
        ) : history.length ? (
          <div className="tableWrap publicTableWrap">
            <table>
              <thead><tr><th>Purity</th><th>Previous / gram</th><th>New / gram</th><th>Updated</th></tr></thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={`${entry.updatedAt}-${entry.purityKarat}-${index}`}>
                    <td><b>{entry.purityKarat}K Gold</b></td>
                    <td>{money(entry.previousRatePerGram)}</td>
                    <td>{money(entry.newRatePerGram)}</td>
                    <td>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="publicPageState">No rate changes have been recorded yet.</p>
        )}
      </section>
    </section>
  );
}
