import express from "express";
import yahooFinance from "yahoo-finance2";

const router = express.Router();

router.get("/:ticker/:interval", async (req, res) => {
  try {
    const { ticker, interval } = req.params;

    const allowedIntervals = {
      "1m": "1m",
      "5m": "5m",
      "1h": "60m",
      "1d": "1d",
    };

    if (!allowedIntervals[interval]) {
      return res.status(400).json({ error: "Invalid interval" });
    }

    const result = await yahooFinance.chart(ticker, {
      period1: "1d",
      interval: allowedIntervals[interval],
    });

    const candles = result.quotes.map((q) => ({
      time: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));

    res.json(candles);
  } catch (err) {
    console.error("Candle fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
