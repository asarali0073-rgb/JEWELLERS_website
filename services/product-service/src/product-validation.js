const categories = [
  "Set",
  "Ring",
  "Necklace",
  "Earrings",
  "Bangles",
  "Bridal Set",
];
const purities = [21, 22, 24];
const uploadedImagePath =
  /^\/api\/products\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

function isSupportedImageReference(image) {
  if (uploadedImagePath.test(image)) return true;
  try {
    return ["http:", "https:"].includes(new URL(image).protocol);
  } catch {
    return false;
  }
}

export function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Product details must be a JSON object.";
  if (!String(body.name || "").trim()) return "Product name is required.";
  if (!categories.includes(body.category)) return "Invalid category.";
  if (!purities.includes(Number(body.purityKarat)))
    return "Purity must be 21K, 22K or 24K.";
  if (
    body.weightGrams === "" ||
    !Number.isFinite(Number(body.weightGrams)) ||
    Number(body.weightGrams) <= 0
  )
    return "Weight must be positive.";
  if (
    body.makingCharges === "" ||
    !Number.isFinite(Number(body.makingCharges)) ||
    Number(body.makingCharges) < 0
  )
    return "Making charges must be zero or more.";
  if (!String(body.description || "").trim()) return "Description is required.";
  if (
    body.images !== undefined &&
    (!Array.isArray(body.images) ||
      body.images.some((image) => {
        if (typeof image !== "string") return true;
        return !isSupportedImageReference(image);
      }))
  )
    return "Product images must be valid HTTP or HTTPS URLs or local uploaded-image paths.";
  if (
    body.isAvailable !== undefined &&
    typeof body.isAvailable !== "boolean"
  )
    return "Product availability must be true or false.";
  return null;
}

export function productFields(body) {
  return {
    name: String(body.name).trim(),
    category: body.category,
    description: String(body.description).trim(),
    images: body.images || [],
    purityKarat: Number(body.purityKarat),
    weightGrams: Number(body.weightGrams),
    makingCharges: Number(body.makingCharges),
    isAvailable: body.isAvailable !== false,
  };
}

export function completeProductFilter() {
  return {
    name: { $type: "string", $ne: "" },
    description: { $type: "string", $ne: "" },
    category: { $in: categories },
    purityKarat: { $in: purities },
    weightGrams: { $gt: 0 },
    makingCharges: { $gte: 0 },
  };
}
