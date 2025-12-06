// backend/src/routes/compare.js
import express from "express";
import { fetchRecentPrices } from "../services/prices.js";

const router = express.Router();

// POST /api/compare - Get historical prices for multiple tickers
router.post("/", async (req, res) => {
  try {
    const { tickers } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: "tickers array required" });
    }

    console.log(`📊 Fetching compare data for: ${tickers.join(", ")}`);

    const result = {};

    for (const ticker of tickers) {
      try {
        const prices = await fetchRecentPrices(ticker);
        result[ticker] = prices;
        console.log(`✅ ${ticker}: ${prices.length} price points`);
      } catch (err) {
        console.error(`❌ Error fetching ${ticker}:`, err.message);
        result[ticker] = [];
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Compare route error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compare (legacy support for query params)
router.get("/", async (req, res) => {
  const { tickers } = req.query;
  
  if (!tickers) {
    return res.status(400).json({ error: "tickers parameter required" });
  }

  const symbols = tickers.split(",").map(s => s.trim().toUpperCase());

  try {
    const result = {};

    for (const ticker of symbols) {
      try {
        const prices = await fetchRecentPrices(ticker);
        result[ticker] = prices;
      } catch (err) {
        console.error(`Error fetching ${ticker}:`, err.message);
        result[ticker] = [];
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "comparison failed" });
  }
});

export default router;