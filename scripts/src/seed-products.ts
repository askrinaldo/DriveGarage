import { getUncachableStripeClient } from "./stripeClient";

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Sjekker og oppretter Stripe-produkter for Vintage Garage...\n");

  // ── STANDARD ──────────────────────────────────────────────────────────────
  const existingStandard = await stripe.products.search({
    query: "name:'Vintage Garage Standard' AND active:'true'",
  });

  let standardProduct;
  if (existingStandard.data.length > 0) {
    standardProduct = existingStandard.data[0]!;
    console.log(`✓ Standard-produkt finnes allerede: ${standardProduct.id}`);
  } else {
    standardProduct = await stripe.products.create({
      name: "Vintage Garage Standard",
      description: "Ubegrenset kjøretøy, 10 GB lagring, klubber og arrangementer",
      metadata: { tier: "standard" },
    });
    console.log(`✓ Opprettet Standard-produkt: ${standardProduct.id}`);
  }

  const existingStandardMonthly = await stripe.prices.list({
    product: standardProduct.id,
    active: true,
    type: "recurring",
  });
  const standardMonthlyExists = existingStandardMonthly.data.some(
    (p) => p.recurring?.interval === "month" && p.unit_amount === 5000
  );

  let standardMonthlyId: string;
  if (standardMonthlyExists) {
    standardMonthlyId = existingStandardMonthly.data.find(
      (p) => p.recurring?.interval === "month" && p.unit_amount === 5000
    )!.id;
    console.log(`✓ Standard månedlig pris finnes: ${standardMonthlyId}`);
  } else {
    const p = await stripe.prices.create({
      product: standardProduct.id,
      unit_amount: 5000,
      currency: "nok",
      recurring: { interval: "month" },
      metadata: { tier: "standard", interval: "month" },
    });
    standardMonthlyId = p.id;
    console.log(`✓ Opprettet Standard månedlig (kr 50/mnd): ${p.id}`);
  }

  const standardYearlyExists = existingStandardMonthly.data.some(
    (p) => p.recurring?.interval === "year" && p.unit_amount === 30000
  );

  if (standardYearlyExists) {
    console.log(`✓ Standard årlig pris finnes`);
  } else {
    const p = await stripe.prices.create({
      product: standardProduct.id,
      unit_amount: 30000,
      currency: "nok",
      recurring: { interval: "year" },
      metadata: { tier: "standard", interval: "year" },
    });
    console.log(`✓ Opprettet Standard årlig (kr 300/år): ${p.id}`);
  }

  // ── PREMIUM ───────────────────────────────────────────────────────────────
  const existingPremium = await stripe.products.search({
    query: "name:'Vintage Garage Premium' AND active:'true'",
  });

  let premiumProduct;
  if (existingPremium.data.length > 0) {
    premiumProduct = existingPremium.data[0]!;
    console.log(`✓ Premium-produkt finnes allerede: ${premiumProduct.id}`);
  } else {
    premiumProduct = await stripe.products.create({
      name: "Vintage Garage Premium",
      description: "Ubegrenset lagring, AI-assistent, PDF-rapporter og prioritert support",
      metadata: { tier: "premium" },
    });
    console.log(`✓ Opprettet Premium-produkt: ${premiumProduct.id}`);
  }

  const existingPremiumPrices = await stripe.prices.list({
    product: premiumProduct.id,
    active: true,
    type: "recurring",
  });

  const premiumMonthlyExists = existingPremiumPrices.data.some(
    (p) => p.recurring?.interval === "month" && p.unit_amount === 9900
  );

  let premiumMonthlyId: string;
  if (premiumMonthlyExists) {
    premiumMonthlyId = existingPremiumPrices.data.find(
      (p) => p.recurring?.interval === "month" && p.unit_amount === 9900
    )!.id;
    console.log(`✓ Premium månedlig pris finnes: ${premiumMonthlyId}`);
  } else {
    const p = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 9900,
      currency: "nok",
      recurring: { interval: "month" },
      metadata: { tier: "premium", interval: "month" },
    });
    premiumMonthlyId = p.id;
    console.log(`✓ Opprettet Premium månedlig (kr 99/mnd): ${p.id}`);
  }

  const premiumYearlyExists = existingPremiumPrices.data.some(
    (p) => p.recurring?.interval === "year" && p.unit_amount === 79900
  );

  if (premiumYearlyExists) {
    console.log(`✓ Premium årlig pris finnes`);
  } else {
    const p = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 79900,
      currency: "nok",
      recurring: { interval: "year" },
      metadata: { tier: "premium", interval: "year" },
    });
    console.log(`✓ Opprettet Premium årlig (kr 799/år): ${p.id}`);
  }

  console.log("\n✅ Alle produkter og priser er klare!");
  console.log("Webhooks synkroniserer dette til databasen automatisk.");
}

seedProducts().catch((err) => {
  console.error("Feil:", err.message);
  process.exit(1);
});
