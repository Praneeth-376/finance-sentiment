import express from "express";
import Portfolio from "../models/Portfolio.js";
import Trade from "../models/Trade.js";
import Watchlist from "../models/Watchlist.js";
import { io } from "../server.js"; // ensure server exports io

const router = express.Router();

// Helper: upsert portfolio doc (single doc)
async function getPortfolioDoc() {
  let p = await Portfolio.findOne();
  if (!p) {
    p = await Portfolio.create({ holdings: [] });
  }
  return p;
}

// GET portfolio
router.get("/", async (req, res) => {
  try {
    const p = await getPortfolioDoc();
    return res.json(p);
  } catch (err) {
    console.error("portfolio:get", err);
    res.status(500).json({ error: err.message });
  }
});

// GET trades
router.get("/trades", async (req, res) => {
  try {
    const trades = await Trade.find().sort({ time: -1 }).limit(200);
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST trade (simulated buy/sell)
router.post("/trade", async (req, res) => {
  try {
    const { ticker, type, quantity, price } = req.body;
    if (!ticker || !type || !quantity || !price) {
      return res.status(400).json({ error: "ticker,type,quantity,price required" });
    }

    const trade = await Trade.create({
      ticker: ticker.toUpperCase(),
      type,
      quantity,
      price
    });

    // Update portfolio holdings
    const p = await getPortfolioDoc();
    const tkr = trade.ticker;
    let h = p.holdings.find(h => h.ticker === tkr);

    if (trade.type === "BUY") {
      if (!h) {
        h = {
          ticker: tkr,
          quantity: trade.quantity,
          avgPrice: trade.price,
          invested: trade.price * trade.quantity,
          currentPrice: trade.price,
          pnl: 0
        };
        p.holdings.push(h);
      } else {
        // new avg price
        const totalQty = h.quantity + trade.quantity;
        const totalInvested = (h.avgPrice * h.quantity) + (trade.price * trade.quantity);
        h.quantity = totalQty;
        h.avgPrice = totalInvested / totalQty;
        h.invested = h.avgPrice * h.quantity;
      }
    } else { // SELL
      if (!h) {
        return res.status(400).json({ error: "No holdings to sell" });
      }
      h.quantity = h.quantity - trade.quantity;
      if (h.quantity <= 0) {
        // remove holding
        p.holdings = p.holdings.filter(x => x.ticker !== tkr);
      } else {
        h.invested = h.avgPrice * h.quantity;
      }
    }

    p.updatedAt = new Date();
    await p.save();

    // Broadcast portfolio update
    io.emit("portfolio:update", p);

    res.json({ trade, portfolio: p });
  } catch (err) {
    console.error("trade error", err);
    res.status(500).json({ error: err.message });
  }
});

// Update current prices (optional endpoint, sometimes used by admin)
// body: { prices: [{ ticker, price }] }
router.post("/update-prices", async (req, res) => {
  try {
    const { prices } = req.body;
    const p = await getPortfolioDoc();
    if (!Array.isArray(prices)) return res.status(400).json({ error: "prices array required" });

    for (const { ticker, price } of prices) {
      const h = p.holdings.find(x => x.ticker === ticker.toUpperCase());
      if (h) {
        h.currentPrice = Number(price);
        h.pnl = h.quantity * (h.currentPrice - h.avgPrice);
      }
    }
    p.updatedAt = new Date();
    await p.save();
    io.emit("portfolio:update", p);
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Watchlist endpoints
router.get("/watchlist", async (req, res) => {
  try {
    let w = await Watchlist.findOne();
    if (!w) {
      w = await Watchlist.create({ tickers: ["AAPL","TSLA"] });
    }
    res.json(w);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/watchlist", async (req, res) => {
  try {
    const { tickers } = req.body;
    let w = await Watchlist.findOne();
    if (!w) w = await Watchlist.create({ tickers: [] });
    w.tickers = Array.from(new Set((tickers || []).map(t => t.toUpperCase())));
    await w.save();
    res.json(w);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/history", async (req, res) => {
  try {
    const trades = await Trade.find().sort({ date: -1 });
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
