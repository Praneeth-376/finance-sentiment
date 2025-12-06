import express from "express";
import SentimentHistory from "../models/SentimentHistory.js";

const router = express.Router();

// GET /api/history/:ticker → last 50 sentiment records
router.get("/:ticker", async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();

    const records = await SentimentHistory.find({ ticker })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(records.reverse()); // oldest → newest order
  } catch (err) {
    console.error("History route error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
