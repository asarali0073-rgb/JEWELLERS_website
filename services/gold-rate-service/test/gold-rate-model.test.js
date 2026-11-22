import assert from "node:assert/strict";
import test from "node:test";
import { GoldRate, GoldRateHistory } from "../src/models/gold-rate.js";
import { validateRateUpdates } from "../src/rate-validation.js";

test("uses the established rates and rate_history collections", () => {
  assert.equal(GoldRate.collection.name, "rates");
  assert.equal(GoldRateHistory.collection.name, "rate_history");
});

test("rejects empty, malformed, invalid, and duplicate rate updates", () => {
  assert.equal(validateRateUpdates(undefined).error, "Provide at least one valid gold rate.");
  assert.equal(validateRateUpdates({ rates: [] }).error, "Provide at least one valid gold rate.");
  assert.equal(validateRateUpdates({ rates: [{ purityKarat: 22 }] }).error, "Both rates for 22K must be positive.");
  assert.equal(
    validateRateUpdates({
      rates: [
        { purityKarat: 22, ratePerTola: 250000, ratePerGram: 21434 },
        { purityKarat: 22, ratePerTola: 250000, ratePerGram: 21434 },
      ],
    }).error,
    "Purity 22K was provided more than once.",
  );
  assert.deepEqual(
    validateRateUpdates({
      rates: [{ purityKarat: 22, ratePerTola: 250000, ratePerGram: 21434 }],
    }).updates,
    [{ purityKarat: 22, ratePerTola: 250000, ratePerGram: 21434 }],
  );
});

test("validates gold rates and history entries without a database connection", async () => {
  const validRate = new GoldRate({
    purityKarat: 22,
    ratePerTola: 250000,
    ratePerGram: 21434,
  });
  await validRate.validate();
  await assert.rejects(() => new GoldRate({ purityKarat: 18 }).validate());

  const validHistory = new GoldRateHistory({
    purityKarat: 22,
    previousRatePerTola: 240000,
    newRatePerTola: 250000,
    previousRatePerGram: 20576,
    newRatePerGram: 21434,
    updatedBy: "owner-admin",
    updatedAt: new Date(),
  });
  await validHistory.validate();
});
