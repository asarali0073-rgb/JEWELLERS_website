import { useEffect, useState } from "react";
import { uploadProductImage } from "../api.js";

const categories = ["Set", "Ring", "Necklace", "Earrings", "Bangles", "Bridal Set"];
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const uploadedImagePath =
  /^\/api\/products\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
const initialProduct = {
  name: "",
  description: "",
  category: "Ring",
  purityKarat: "22",
  weightGrams: "",
  makingCharges: "",
  isAvailable: true,
};

export default function ProductForm({ product, onSave, onCancel, saving }) {
  const [values, setValues] = useState(product ? {
    name: product.name || "",
    description: product.description || "",
    category: product.category || "Ring",
    purityKarat: String(product.purityKarat || 22),
    weightGrams: String(product.weightGrams ?? ""),
    makingCharges: String(product.makingCharges ?? ""),
    isAvailable: product.isAvailable !== false,
  } : initialProduct);
  const [images, setImages] = useState(product?.images || []);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function selectImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setUploadError("");
    setValidationError("");
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > maxImageSize) {
      setUploadError("Choose an image that is 5 MB or smaller.");
      return;
    }
    setImageFile(file);
  }

  async function submit(event) {
    event.preventDefault();
    setValidationError("");
    setUploadError("");
    const weight = Number(values.weightGrams);
    const makingCharges = Number(values.makingCharges);

    if (!values.name.trim() || !values.description.trim()) {
      setValidationError("Complete the product name and description.");
      return;
    }
    if (!product && !imageFile && images.length === 0) {
      setValidationError("Choose a product image before saving.");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setValidationError("Weight must be a positive number.");
      return;
    }
    if (!Number.isFinite(makingCharges) || makingCharges < 0) {
      setValidationError("Making charges must be zero or more.");
      return;
    }

    let savedImages = images;
    if (imageFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const result = await uploadProductImage(imageFile, setUploadProgress);
        const validImageUrl =
          typeof result.url === "string" &&
          (/^https?:\/\/\S+$/i.test(result.url) ||
            uploadedImagePath.test(result.url));
        if (!validImageUrl) {
          throw new Error("The image service returned an invalid image URL.");
        }
        savedImages = [result.url];
        setImages(savedImages);
        setImageFile(null);
      } catch (error) {
        setUploadError(error.message);
        setUploading(false);
        setUploadProgress(null);
        return;
      }
      setUploading(false);
      setUploadProgress(null);
    }

    await onSave({
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      images: savedImages,
      purityKarat: Number(values.purityKarat),
      weightGrams: weight,
      makingCharges,
      isAvailable: values.isAvailable,
    });
  }

  const displayedImage = previewUrl || images[0] || "";
  const busy = saving || uploading;

  return (
    <form className="adminFormPanel" onSubmit={submit}>
      <div className="adminPanelHeading">
        <div>
          <span className="adminEyebrow">{product ? "EDIT LISTING" : "NEW LISTING"}</span>
          <h2>{product ? "Edit product" : "Product details"}</h2>
        </div>
        <button className="adminCloseButton" type="button" onClick={onCancel} aria-label="Close product form" disabled={busy}>×</button>
      </div>
      {validationError && <p className="adminFeedback error" role="alert">{validationError}</p>}
      {uploadError && <p className="adminFeedback error" role="alert">{uploadError}</p>}
      <div className="adminFormGrid">
        <label className="adminField adminFieldWide">
          Product name
          <input value={values.name} onChange={(event) => update("name", event.target.value)} required maxLength={120} disabled={busy} />
        </label>
        <label className="adminField adminFieldWide">
          Description
          <textarea value={values.description} onChange={(event) => update("description", event.target.value)} required rows={3} disabled={busy} />
        </label>
        <label className="adminField">
          Category
          <select value={values.category} onChange={(event) => update("category", event.target.value)} disabled={busy}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="adminField">
          Gold karat / purity
          <select value={values.purityKarat} onChange={(event) => update("purityKarat", event.target.value)} disabled={busy}>
            {[24, 22, 21].map((purity) => <option key={purity} value={purity}>{purity}K</option>)}
          </select>
        </label>
        <div className="adminField adminFieldWide">
          <span>Product image</span>
          <div className="adminImagePicker">
            {displayedImage ? (
              <img className="adminImagePreview" src={displayedImage} alt="Product image preview" />
            ) : (
              <div className="adminImagePlaceholder">Choose a jewellery photo from your device</div>
            )}
            <div className="adminImagePickerActions">
              <input
                id="product-image-file"
                className="adminImageFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={selectImage}
                disabled={busy}
              />
              <label className="adminSecondaryButton adminImageChoose" htmlFor="product-image-file">
                {displayedImage ? "Choose another image" : "Choose Image"}
              </label>
              {displayedImage && (
                <button
                  className="adminDangerButton"
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImages([]);
                    setUploadError("");
                    setValidationError("");
                  }}
                  disabled={busy}
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
          <small className="adminImageHelp">JPG, PNG, or WEBP · Maximum 5 MB</small>
          {imageFile && <small className="adminImageHelp">{imageFile.name}</small>}
          {uploading && (
            <div className="adminUploadProgress">
              <progress max="100" value={uploadProgress ?? 0} aria-label="Image upload progress" />
              <span role="status">Uploading image… {uploadProgress ?? 0}%</span>
            </div>
          )}
        </div>
        <label className="adminField">
          Weight (grams)
          <input type="number" min="0.01" step="0.01" value={values.weightGrams} onChange={(event) => update("weightGrams", event.target.value)} required disabled={busy} />
        </label>
        <label className="adminField">
          Making charges (PKR)
          <input type="number" min="0" step="1" value={values.makingCharges} onChange={(event) => update("makingCharges", event.target.value)} required disabled={busy} />
        </label>
      </div>
      <label className="adminCheckbox">
        <input type="checkbox" checked={values.isAvailable} onChange={(event) => update("isAvailable", event.target.checked)} disabled={busy} />
        <span>Available for customers</span>
      </label>
      <div className="adminFormActions">
        <button className="adminPrimaryButton" type="submit" disabled={busy}>
          {uploading ? "Uploading image…" : saving ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
        <button className="adminSecondaryButton" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
