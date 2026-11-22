import { useEffect, useState } from "react";
import { api } from "../api.js";
import { money } from "../config.js";

const purities = [24, 22, 21];

export default function GoldRateManagement({ rates, loading, loadError, reload }) {
  const [values, setValues] = useState({});
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(Object.fromEntries(purities.map((purity) => {
      const current = rates.find((rate) => Number(rate.purityKarat) === purity);
      return [purity, {
        ratePerGram: current?.ratePerGram > 0 ? String(current.ratePerGram) : "",
        ratePerTola: current?.ratePerTola > 0 ? String(current.ratePerTola) : "",
      }];
    })));
  }, [rates]);

  useEffect(() => {
    let active = true;
    api("/gold-rates/history")
      .then((result) => {
        if (active) setHistory(Array.isArray(result.history) ? result.history : []);
      })
      .catch((historyLoadError) => {
        if (active) setHistoryError(historyLoadError.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, []);

  function update(purity, field, value) {
    setValues((current) => ({
      ...current,
      [purity]: { ...current[purity], [field]: value },
    }));
  }

  async function saveRates(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const submittedRates = purities.map((purity) => ({
      purityKarat: purity,
      ratePerGram: Number(values[purity]?.ratePerGram),
      ratePerTola: Number(values[purity]?.ratePerTola),
    }));
    if (submittedRates.some((rate) =>
      !Number.isFinite(rate.ratePerGram) || rate.ratePerGram <= 0 ||
      !Number.isFinite(rate.ratePerTola) || rate.ratePerTola <= 0
    )) {
      setError("Enter positive numerical per-gram and per-tola rates for all three purities.");
      return;
    }

    setSaving(true);
    try {
      const result = await api("/gold-rates", {
        method: "PUT",
        body: JSON.stringify({ rates: submittedRates }),
      });
      setMessage(result.message || "Gold rates updated successfully.");
      await Promise.all([reload(), refreshHistory()]);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function refreshHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const result = await api("/gold-rates/history");
      setHistory(Array.isArray(result.history) ? result.history : []);
    } catch (loadError) {
      setHistoryError(loadError.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <section className="adminPage">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">MANUAL MARKET REFERENCE</span>
          <h1>Gold rates</h1>
          <p>Update verified Pakistan gold rates. Prices are entered manually by the owner.</p>
        </div>
      </div>

      {message && <p className="adminFeedback success" role="status">{message}</p>}
      {error && <p className="adminFeedback error" role="alert">{error}</p>}
      {loadError && (
        <p className="adminFeedback error" role="alert">
          Could not load the latest rates: {loadError}
          <button type="button" onClick={reload}>Try again</button>
        </p>
      )}

      <section className="adminPanel">
        <div className="adminPanelHeading">
          <div><span className="adminEyebrow">CURRENT REFERENCE</span><h2>Rates by purity</h2></div>
        </div>
        <div className="adminCurrentRates">
          {purities.map((purity) => {
            const rate = rates.find((entry) => Number(entry.purityKarat) === purity);
            return (
              <article className="adminCurrentRate" key={purity}>
                <span>{purity}K</span>
                <b>{rate && Number(rate.ratePerGram) > 0 ? money(rate.ratePerGram) : "Not entered"}</b>
                <small>PKR per gram</small>
                {rate?.updatedAt && <small>Updated {new Date(rate.updatedAt).toLocaleString()}</small>}
              </article>
            );
          })}
        </div>
      </section>

      <form className="adminPanel adminRatesForm" onSubmit={saveRates}>
        <div className="adminPanelHeading">
          <div><span className="adminEyebrow">OWNER UPDATE</span><h2>Enter daily rates</h2></div>
        </div>
        <p className="adminMuted">The existing Gold Rate Service requires both the per-gram and per-tola value for each purity.</p>
        {purities.map((purity) => (
          <fieldset className="adminRateFields" key={purity}>
            <legend>{purity}K gold</legend>
            <label className="adminField">
              Rate per gram (PKR)
              <input
                type="number" min="0.01" step="0.01" required
                value={values[purity]?.ratePerGram ?? ""}
                onChange={(event) => update(purity, "ratePerGram", event.target.value)}
              />
            </label>
            <label className="adminField">
              Rate per tola (PKR)
              <input
                type="number" min="0.01" step="0.01" required
                value={values[purity]?.ratePerTola ?? ""}
                onChange={(event) => update(purity, "ratePerTola", event.target.value)}
              />
            </label>
          </fieldset>
        ))}
        <button className="adminPrimaryButton" type="submit" disabled={saving || loading}>
          {saving ? "Saving rates…" : "Save all rates"}
        </button>
      </form>

      <section className="adminPanel adminHistoryPanel">
        <div className="adminPanelHeading">
          <div><span className="adminEyebrow">SERVICE RECORD</span><h2>Rate history</h2></div>
        </div>
        {historyLoading ? (
          <p className="adminMuted" role="status">Loading rate history…</p>
        ) : historyError ? (
          <p className="adminFeedback error" role="alert">Could not load rate history: {historyError}</p>
        ) : history.length ? (
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead><tr><th>Purity</th><th>Previous / gram</th><th>New / gram</th><th>Updated</th></tr></thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={`${entry.updatedAt}-${entry.purityKarat}-${index}`}>
                    <td>{entry.purityKarat}K</td>
                    <td>{money(entry.previousRatePerGram)}</td>
                    <td>{money(entry.newRatePerGram)}</td>
                    <td>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adminEmptyState">No rate changes have been recorded yet.</p>
        )}
      </section>
    </section>
  );
}
