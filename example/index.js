"use strict";

const { fetchRate, fetchRates, CURRENCIES } = require("../src/index");

(async () => {
  // --- Single currency ---
  console.log("Fetching USD/LKR rate...\n");
  try {
    const rate = await fetchRate("usd");
    console.log(rate);
  } catch (err) {
    console.error(err.message);
  }

  console.log("\n--- Multiple currencies ---\n");

  // --- Multiple currencies (all supported) ---
  try {
    const rates = await fetchRates(CURRENCIES);
    console.table(rates);
  } catch (err) {
    console.error(err.message);
  }

  console.log("\nAll supported currency codes:");
  console.log(CURRENCIES.join(", "));
})();
