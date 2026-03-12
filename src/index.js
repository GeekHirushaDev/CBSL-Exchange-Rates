"use strict";

const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Supported CBSL currency codes (lowercase).
 */
const CURRENCIES = ["usd", "eur", "gbp", "jpy", "aud", "cny"];

const BASE_URL = "https://www.cbsl.gov.lk/cbsl_custom/charts";

/**
 * Fetch the exchange rate for a single currency against LKR.
 *
 * @param {string} currency - ISO 4217 currency code (e.g. "usd", "eur").
 * @returns {Promise<{currency: string, indicative: number, buy: number, sell: number}>}
 * @throws {Error} When the network request fails or the page cannot be parsed.
 */
async function fetchRate(currency) {
  if (!currency || typeof currency !== "string") {
    throw new Error("currency must be a non-empty string");
  }

  const code = currency.toLowerCase().trim();
  const url = `${BASE_URL}/${code}/indexsmall.php`;

  let data;
  try {
    ({ data } = await axios.get(url, { timeout: 10000 }));
  } catch (err) {
    throw new Error(`Failed to fetch rate for ${code.toUpperCase()}: ${err.message}`);
  }

  const $ = cheerio.load(data);

  let indicative = null;
  let buy = null;
  let sell = null;

  $("p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();

    if (text.includes("Indicative")) {
      const val = parseFloat(text.split(" ").pop());
      if (!isNaN(val)) indicative = val;
    } else if (text.includes("Buy")) {
      const val = parseFloat(text.split(" ").pop());
      if (!isNaN(val)) buy = val;
    } else if (text.includes("Sell")) {
      const val = parseFloat(text.split(" ").pop());
      if (!isNaN(val)) sell = val;
    }
  });

  if (indicative === null && buy === null && sell === null) {
    throw new Error(`No rate data found for ${code.toUpperCase()}. The currency code may be unsupported.`);
  }

  return {
    currency: `${code.toUpperCase()}/LKR`,
    indicative,
    buy,
    sell
  };
}

/**
 * Fetch exchange rates for multiple currencies concurrently.
 *
 * @param {string[]} currencies - Array of ISO 4217 currency codes.
 * @returns {Promise<Array<{currency: string, indicative: number, buy: number, sell: number} | {currency: string, error: string}>>}
 */
async function fetchRates(currencies) {
  if (!Array.isArray(currencies) || currencies.length === 0) {
    throw new Error("currencies must be a non-empty array of currency codes");
  }

  const results = await Promise.allSettled(
    currencies.map((code) => fetchRate(code))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      currency: `${currencies[i].toUpperCase()}/LKR`,
      error: result.reason.message
    };
  });
}

module.exports = { fetchRate, fetchRates, CURRENCIES };
