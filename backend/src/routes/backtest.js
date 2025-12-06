// src/routes/backtest.js
// Optional standalone route for getting backtest results

import express from 'express';
import { fetchRecentPrices } from '../services/prices.js';
import { runEMABacktest } from '../services/backtest.js'; // << UPDATED IMPORT

const router = express.Router();

// GET /api/backtest/:ticker
router.get('/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`🔄 Running backtest for ${ticker}...`);

    // Fetch historical prices
    const prices = await fetchRecentPrices(ticker);
    
    if (!prices || prices.length === 0) {
      return res.status(404).json({ 
        error: 'No price data available for backtest',
        ticker 
      });
    }

    // Run the backtest using your existing function
    const backtest = runEMABacktest(prices);

    console.log(`✅ Backtest complete for ${ticker}:`);
    console.log(`   Total Trades: ${backtest.metrics.totalTrades}`);
    console.log(`   Wins: ${backtest.metrics.wins} | Losses: ${backtest.metrics.losses}`);
    console.log(`   Win Rate: ${backtest.metrics.winRate}%`);
    console.log(`   Total Profit: $${backtest.metrics.totalProfit}`);
    console.log(`   Final Equity: $${backtest.metrics.finalEquity}`);
    console.log(`   Total Return: ${backtest.metrics.totalReturn}%`);

    res.json({
      ticker,
      ...backtest,
      priceDataPoints: prices.length,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ backtest route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;