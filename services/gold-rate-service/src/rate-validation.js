const purities = [24, 22, 21];

export function validateRateUpdates(body) {
  if (
    body !== undefined &&
    (!body || typeof body !== "object" || Array.isArray(body))
  )
    return { error: "Rate details must be a JSON object." };

  const updates = Array.isArray(body?.rates) ? body.rates : [body];
  if (!updates.length || updates.some((item) => !item || typeof item !== "object"))
    return { error: "Provide at least one valid gold rate." };

  const seenPurities = new Set();
  const validated = [];
  for (const item of updates) {
    const purityKarat = Number(item.purityKarat);
    const ratePerTola = Number(item.ratePerTola);
    const ratePerGram = Number(item.ratePerGram);

    if (!purities.includes(purityKarat))
      return { error: "Purity must be 21K, 22K or 24K." };
    if (seenPurities.has(purityKarat))
      return { error: `Purity ${purityKarat}K was provided more than once.` };
    seenPurities.add(purityKarat);
    if (
      !Number.isFinite(ratePerTola) ||
      ratePerTola <= 0 ||
      !Number.isFinite(ratePerGram) ||
      ratePerGram <= 0
    )
      return {
        error: `Both rates for ${purityKarat}K must be positive.`,
      };
    validated.push({ purityKarat, ratePerTola, ratePerGram });
  }

  return { updates: validated };
}
