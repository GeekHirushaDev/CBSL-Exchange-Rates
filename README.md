# cbsl-exchange-rates

> A lightweight Node.js package to fetch **live foreign exchange rates** published by the **[Central Bank of Sri Lanka (CBSL)](https://www.cbsl.gov.lk/)**. Returns **Indicative**, **Buy**, and **Sell** rates for any supported currency against the Sri Lankan Rupee (LKR).

[![npm version](https://img.shields.io/npm/v/cbsl-exchange-rates)](https://www.npmjs.com/package/cbsl-exchange-rates)
[![license](https://img.shields.io/npm/l/cbsl-exchange-rates)](LICENSE)
[![node](https://img.shields.io/node/v/cbsl-exchange-rates)](https://nodejs.org)

---

## Table of Contents

- [What is this?](#what-is-this)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [fetchRate(currency)](#fetchratecurrency)
  - [fetchRates(currencies)](#fetchratescurrencies)
  - [CURRENCIES](#currencies)
- [Supported Currencies](#supported-currencies)
- [Error Handling](#error-handling)
- [Express.js Integration](#expressjs-integration)
- [How It Works](#how-it-works)
- [Data Source](#data-source)
- [License](#license)

---

## What is this?

The Central Bank of Sri Lanka publishes daily exchange rates on their website. This package scrapes those rates programmatically so you can use them in your own Node.js applications — whether you are building a finance app, a currency converter, a REST API, or just need quick LKR exchange rate data.

No API key required. No registration needed.

---

## Installation

```bash
npm install cbsl-exchange-rates
```

**Requirements:** Node.js >= 14.0.0

---

## Quick Start

```js
const { fetchRate, fetchRates } = require("cbsl-exchange-rates");

// Single currency
const rate = await fetchRate("usd");
console.log(rate);
// { currency: 'USD/LKR', indicative: 310.94, buy: 307.17, sell: 314.87 }

// Multiple currencies at once
const rates = await fetchRates(["usd", "eur", "gbp"]);
console.log(rates);
// [
//   { currency: 'USD/LKR', indicative: 310.94, buy: 307.17, sell: 314.87 },
//   { currency: 'EUR/LKR', indicative: 358.86, buy: 353.19, sell: 364.81 },
//   { currency: 'GBP/LKR', indicative: 415.98, buy: 409.65, sell: 422.49 }
// ]
```

---

## API Reference

### `fetchRate(currency)`

Fetches the exchange rate for a **single currency** against LKR.

**Parameter:**

| Name       | Type     | Required | Description                                                        |
|------------|----------|----------|--------------------------------------------------------------------|
| `currency` | `string` | Yes      | ISO 4217 currency code. Case-insensitive (e.g. `"usd"`, `"USD"`)  |

**Returns:** `Promise<RateResult>`

```ts
{
  currency:   string,   // Pair label, e.g. "USD/LKR"
  indicative: number,   // Mid-market indicative rate
  buy:        number,   // Bank buying rate
  sell:       number    // Bank selling rate
}
```

**Example:**

```js
const { fetchRate } = require("cbsl-exchange-rates");

const rate = await fetchRate("jpy");
console.log(rate);
// { currency: 'JPY/LKR', indicative: 2.07, buy: 2.04, sell: 2.10 }
```

**Throws:** `Error` if the network request fails or the currency is not supported by CBSL.

---

### `fetchRates(currencies)`

Fetches exchange rates for **multiple currencies concurrently**. All requests are made in parallel for maximum speed.

**Parameter:**

| Name         | Type       | Required | Description                       |
|--------------|------------|----------|-----------------------------------|
| `currencies` | `string[]` | Yes      | Array of ISO 4217 currency codes  |

**Returns:** `Promise<Array<RateResult | ErrorResult>>`

Each item in the returned array is either a successful `RateResult` (see above), or an `ErrorResult` if that particular currency failed:

```ts
{
  currency: string,   // e.g. "XYZ/LKR"
  error:    string    // Reason the fetch failed
}
```

**Example:**

```js
const { fetchRates } = require("cbsl-exchange-rates");

const rates = await fetchRates(["usd", "eur", "gbp", "inr"]);

rates.forEach(rate => {
  if (rate.error) {
    console.log(`${rate.currency} - Failed: ${rate.error}`);
  } else {
    console.log(`${rate.currency} → Buy: ${rate.buy}, Sell: ${rate.sell}`);
  }
});
```

> Unlike `fetchRate()`, this function **never throws** even if individual currencies fail — errors are returned inline per currency so the rest of your results are unaffected.

---

### `CURRENCIES`

A pre-defined array of all currency codes known to be supported by CBSL.

```js
const { CURRENCIES } = require("cbsl-exchange-rates");

console.log(CURRENCIES);
// ['usd', 'eur', 'gbp', 'jpy', 'aud', 'cny']
```

Use this to fetch **all supported rates** at once:

```js
const { fetchRates, CURRENCIES } = require("cbsl-exchange-rates");

const allRates = await fetchRates(CURRENCIES);
console.table(allRates);
```

---

## Supported Currencies

These are the currencies verified to have active pages on the CBSL website:

| Code  | Currency                |
|-------|-------------------------|
| `usd` | US Dollar               |
| `eur` | Euro                    |
| `gbp` | British Pound Sterling  |
| `jpy` | Japanese Yen            |
| `aud` | Australian Dollar       |
| `cny` | Chinese Yuan Renminbi   |

> Currency codes are **case-insensitive** — `"USD"`, `"usd"`, and `"Usd"` all work.

> **Note:** CBSL does not publish pages for all world currencies. If you need a currency not listed above, pass it to `fetchRate()` directly — it will throw an error if the page does not exist.

---

## Error Handling

### Single currency — use try/catch

```js
const { fetchRate } = require("cbsl-exchange-rates");

try {
  const rate = await fetchRate("usd");
  console.log(rate);
} catch (err) {
  console.error("Error:", err.message);
  // e.g. "Failed to fetch rate for USD: timeout of 10000ms exceeded"
  //      "No rate data found for XYZ. The currency code may be unsupported."
}
```

### Multiple currencies — errors returned inline

```js
const { fetchRates } = require("cbsl-exchange-rates");

const rates = await fetchRates(["usd", "xyz"]);
// [
//   { currency: 'USD/LKR', indicative: 310.94, buy: 307.17, sell: 314.87 },
//   { currency: 'XYZ/LKR', error: 'No rate data found for XYZ...' }
// ]
```

---

## Express.js Integration

Wrap the package inside an Express route to expose exchange rates as a REST API:

```js
const express = require("express");
const { fetchRate, fetchRates, CURRENCIES } = require("cbsl-exchange-rates");

const app = express();

// GET /api/rate/usd  →  single rate
app.get("/api/rate/:currency", async (req, res) => {
  try {
    const data = await fetchRate(req.params.currency);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rates  →  all supported rates
app.get("/api/rates", async (req, res) => {
  try {
    const data = await fetchRates(CURRENCIES);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("CBSL FX API running on http://localhost:3000");
});
```

**Sample response for `GET /api/rate/usd`:**

```json
{
  "currency": "USD/LKR",
  "indicative": 310.9475,
  "buy": 307.1786,
  "sell": 314.8701
}
```

---

## How It Works

1. Sends an HTTP GET request to the CBSL currency page for the requested currency:
   ```
   https://www.cbsl.gov.lk/cbsl_custom/charts/{currency}/indexsmall.php
   ```
2. Parses the returned HTML using **cheerio** (a lightweight jQuery-style HTML parser).
3. Searches all `<p>` tags for the keywords `Indicative`, `Buy`, and `Sell`.
4. Extracts the numeric value from the end of each matching line.
5. Returns a plain JavaScript object with the parsed values.

No DOM rendering. No headless browser. Fast and lightweight.

---

## Data Source

All exchange rate data is sourced directly from the **Central Bank of Sri Lanka**:

- Website: [https://www.cbsl.gov.lk](https://www.cbsl.gov.lk)
- Rates are updated periodically on Sri Lanka business days.
- This package does **not** cache data — every call fetches fresh data from CBSL.

> **Disclaimer:** This package is not affiliated with or endorsed by the Central Bank of Sri Lanka. Use the data at your own discretion for informational purposes.

---

## License

[MIT](LICENSE) © [GeekHirushaDev](https://github.com/GeekHirushaDev)
