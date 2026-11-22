import assert from "node:assert/strict";
import test from "node:test";
import { Product } from "../src/models/product.js";
import {
  completeProductFilter,
  productFields,
  validateProduct,
} from "../src/product-validation.js";

const validProduct = {
  name: "Gold ring",
  category: "Ring",
  description: "Handcrafted gold ring",
  images: ["https://res.cloudinary.com/example/ring.jpg"],
  purityKarat: 22,
  weightGrams: 4.5,
  makingCharges: 1200,
  isAvailable: true,
};

test("accepts valid product payloads and maps form fields to the schema", async () => {
  assert.equal(validateProduct(validProduct), null);
  assert.equal(
    validateProduct({
      ...validProduct,
      images: ["/api/products/uploads/123e4567-e89b-42d3-a456-426614174000.jpg"],
    }),
    null,
  );
  const product = new Product(productFields(validProduct));
  await product.validate();
  assert.equal(Product.collection.name, "products");
});

test("rejects missing and malformed product data with a useful validation error", () => {
  assert.equal(validateProduct(undefined), "Product details must be a JSON object.");
  assert.equal(validateProduct([]), "Product details must be a JSON object.");
  assert.equal(validateProduct({ ...validProduct, purityKarat: 18 }), "Purity must be 21K, 22K or 24K.");
  assert.equal(validateProduct({ ...validProduct, weightGrams: "" }), "Weight must be positive.");
  assert.equal(validateProduct({ ...validProduct, makingCharges: -1 }), "Making charges must be zero or more.");
  assert.equal(validateProduct({ ...validProduct, images: ["file:///tmp/image.jpg"] }), "Product images must be valid HTTP or HTTPS URLs or local uploaded-image paths.");
  assert.equal(
    validateProduct({ ...validProduct, images: ["/api/products/uploads/../../secret.jpg"] }),
    "Product images must be valid HTTP or HTTPS URLs or local uploaded-image paths.",
  );
});

test("complete-product query excludes the manually inserted empty document", () => {
  const filter = completeProductFilter();
  assert.equal(filter.name.$type, "string");
  assert.equal(filter.description.$type, "string");
  assert.deepEqual(filter.category.$in, [
    "Set",
    "Ring",
    "Necklace",
    "Earrings",
    "Bangles",
    "Bridal Set",
  ]);
  assert.equal(validateProduct({}), "Product name is required.");
});
