import { useEffect, useState } from "react";
import { api } from "../api.js";
import { money } from "../config.js";
import ProductForm from "../components/ProductForm.jsx";

export default function ProductManagement({ products, loading, loadError, reload }) {
  const [search, setSearch] = useState("");
  const [formProduct, setFormProduct] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deleteTarget) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape" && !deleting) setDeleteTarget(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, deleting]);

  const visibleProducts = products.filter((product) =>
    typeof product.name === "string" &&
    product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function startCreate() {
    setFormProduct(null);
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  async function saveProduct(payload) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api(formProduct ? `/products/${formProduct._id}` : "/products", {
        method: formProduct ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setMessage(formProduct ? "Product updated successfully." : "Product added successfully.");
      setFormOpen(false);
      setFormProduct(null);
      await reload();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      await api(`/products/${deleteTarget._id}`, { method: "DELETE" });
      setMessage(`${deleteTarget.name} was deleted.`);
      setDeleteTarget(null);
      await reload();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="adminPage">
      <div className="adminPageHeading">
        <div>
          <span className="adminEyebrow">CATALOGUE</span>
          <h1>Manage jewellery</h1>
          <p>Add, update, and curate the pieces shown in your public collection.</p>
        </div>
        {!formOpen && (
          <button className="adminPrimaryButton" type="button" onClick={startCreate}>＋ Add product</button>
        )}
      </div>

      {message && <p className="adminFeedback success" role="status">{message}</p>}
      {error && <p className="adminFeedback error" role="alert">{error}</p>}
      {loadError && (
        <p className="adminFeedback error" role="alert">
          Could not load the latest catalogue: {loadError}
          <button type="button" onClick={reload}>Try again</button>
        </p>
      )}
      {formOpen && (
        <ProductForm
          key={formProduct?._id || "new"}
          product={formProduct}
          onSave={saveProduct}
          onCancel={() => { setFormOpen(false); setFormProduct(null); }}
          saving={saving}
        />
      )}

      <section className="adminPanel">
        <div className="adminListToolbar">
          <div>
            <h2>Product catalogue</h2>
            <p>{loading ? "Loading products…" : `${visibleProducts.length} of ${products.length} products`}</p>
          </div>
          <label className="adminSearch">
            <span className="srOnly">Search products by name</span>
            <input type="search" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>

        {loading && !products.length ? (
          <p className="adminEmptyState" role="status">Loading product catalogue…</p>
        ) : visibleProducts.length ? (
          <div className="adminProductGrid">
            {visibleProducts.map((product) => (
              <article className="adminProductCard" key={product._id}>
                <div className="adminProductImage">
                  {product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" /> : <span>No image</span>}
                  <span className={product.isAvailable ? "adminAvailability available" : "adminAvailability unavailable"}>
                    {product.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="adminProductInfo">
                  <div className="adminProductTitle"><h3>{product.name}</h3><span>{product.purityKarat}K</span></div>
                  <p>{product.category} · {product.weightGrams}g</p>
                  <b>
                    {product.rateUpdatedAt ? money(product.estimatedPrice) : "Rate unavailable"}{" "}
                    <small>{product.rateUpdatedAt ? "estimated" : "enter current rate"}</small>
                  </b>
                  <div className="adminProductActions">
                    <button className="adminSecondaryButton" type="button" onClick={() => { setFormProduct(product); setFormOpen(true); setMessage(""); setError(""); }}>Edit</button>
                    <button className="adminDangerButton" type="button" onClick={() => setDeleteTarget(product)}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="adminEmptyState">
            <h3>{products.length ? "No matching products" : "No products yet"}</h3>
            <p>{products.length ? "Try another name." : "Add your first jewellery listing to get started."}</p>
          </div>
        )}
      </section>

      {deleteTarget && (
        <div className="adminDialogBackdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deleting) setDeleteTarget(null);
        }}>
          <section className="adminConfirmDialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" tabIndex={-1} autoFocus>
            <span className="adminEyebrow">CONFIRM DELETION</span>
            <h2 id="delete-title">Delete this product?</h2>
            <p id="delete-description">“{deleteTarget.name}” will be removed from the catalogue. This action cannot be undone.</p>
            <div className="adminFormActions">
              <button className="adminDangerButton" type="button" onClick={deleteProduct} disabled={deleting}>{deleting ? "Deleting…" : "Delete product"}</button>
              <button className="adminSecondaryButton" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Keep product</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
