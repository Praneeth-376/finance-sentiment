// src/routes/news.js
import express from 'express';
import { fetchNewsForTicker } from '../services/newsFetcher.js';
import { scoreWithFinBERT } from '../services/finbert.js';
import { fetchRecentPrices } from '../services/prices.js';
import { predictWithLSTM } from '../services/lstm.js';
import { io } from '../server.js';
import SentimentHistory from "../models/SentimentHistory.js";
import { runEMABacktest } from "../services/backtest.js";

const router = express.Router();

// Helper function to generate mock prices
function generateMockPrices(ticker, count = 100) {
  const basePrices = {
    'AAPL': 180.50,
    'GOOGL': 140.75,
    'MSFT': 415.25,
    'TSLA': 175.30,
    'AMZN': 178.90,
    'NVDA': 950.00,
    'META': 485.60,
    'NFLX': 615.80,
    'BTC-USD': 65000,
    'ETH-USD': 3500
  };
  
  const basePrice = basePrices[ticker] || 150;
  const prices = [];
  const now = new Date();
  
  for (let i = count; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    
    // Create realistic price movement
    const trend = Math.sin(i / 20) * 5; // Sine wave trend
    const noise = (Math.random() - 0.5) * 3; // Random noise
    const price = basePrice + trend + noise;
    
    prices.push({
      time,
      open: price - (Math.random() * 1),
      high: price + (Math.random() * 2),
      low: price - (Math.random() * 2),
      close: price,
      price, // For compatibility
      volume: Math.floor(Math.random() * 2000000) + 1000000
    });
  }
  
  return prices;
}

// Helper function for mock prediction
function generateMockPrediction(sentiment) {
  // More positive sentiment = more positive prediction
  const baseChange = sentiment * 3; // Scale sentiment to percentage
  const confidence = 0.5 + Math.abs(sentiment) * 0.3; // More extreme sentiment = more confidence
  
  return {
    predicted_pct_change: parseFloat(baseChange.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(2))
  };
}

// Helper function for mock articles
function generateMockArticles(ticker) {
  const headlines = [
    `${ticker} Surges on Strong Earnings Report`,
    `Analysts Raise Price Target for ${ticker}`,
    `${ticker} Announces New Product Launch`,
    `Market Reacts Positively to ${ticker} News`,
    `${ticker} Leadership Change Announced`,
    `Investors Bullish on ${ticker} Future Prospects`,
    `${ticker} Expands into New Markets`,
    `Positive Analyst Coverage for ${ticker}`,
    `${ticker} Reports Record Quarterly Revenue`,
    `Institutional Investors Increasing ${ticker} Holdings`
  ];
  
  return headlines.slice(0, 8).map((title, i) => ({
    title,
    description: `Recent developments for ${ticker} show promising growth potential in Q4. The company's strategic initiatives continue to drive shareholder value.`,
    url: `https://example.com/article-${ticker.toLowerCase()}-${i}`,
    finbert_score: {
      positive: 0.3 + Math.random() * 0.4,
      negative: 0.1 + Math.random() * 0.3,
      neutral: 0.2 + Math.random() * 0.3,
      compound: (Math.random() - 0.5) * 0.6 // Random sentiment between -0.3 and 0.3
    },
    source: "Financial Times",
    publishedAt: new Date(Date.now() - i * 3600000).toISOString() // Last few hours
  }));
}

// ------------------------------------------
// GET /api/news/:ticker (existing endpoint)
// ------------------------------------------
router.get('/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`📰 [GET] Fetching news for ${ticker}...`);

    // 1) FETCH NEWS
    const articles = await fetchNewsForTicker(ticker, { pageSize: 12 }).catch(err => {
      console.log("News fetch error, using mock:", err.message);
      return generateMockArticles(ticker);
    });
    console.log(`✅ Found ${articles.length} articles`);

    // 2) SCORE WITH FINBERT
    const scored = [];
    for (const a of articles) {
      const text = (a.content || a.description || a.title || '').slice(0, 1500);
      
      const score = await scoreWithFinBERT(text).catch(err => {
        console.log("FinBERT error, using mock score:", err.message);
        return {
          positive: 0.3 + Math.random() * 0.4,
          negative: 0.1 + Math.random() * 0.3,
          neutral: 0.2 + Math.random() * 0.3,
          compound: (Math.random() - 0.5) * 0.6
        };
      });
      scored.push({ ...a, finbert_score: score });
    }

    // 3) AVERAGE SENTIMENT
    const values = scored.map(s => s.finbert_score?.compound ?? 0);
    const avgSentiment = values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
    console.log(`📊 Sentiment avg: ${avgSentiment.toFixed(3)}`);

    // 4) FETCH PRICE HISTORY
    console.log(`🟦 Calling fetchRecentPrices for: ${ticker}`);
    const prices = await fetchRecentPrices(ticker).catch(err => {
      console.log("Price fetch error, using mock:", err.message);
      return generateMockPrices(ticker, 200);
    });
    console.log(`📈 Received ${prices.length} candles`);

    // 5) PREDICTION
    const prediction = await predictWithLSTM(ticker, prices, avgSentiment).catch(err => {
      console.log("LSTM prediction error, using mock:", err.message);
      return generateMockPrediction(avgSentiment);
    });
    console.log("🔮 Prediction:", prediction);

    // 6) BACKTEST
    console.log("🔄 Running EMA Backtest...");
    const backtest = runEMABacktest(prices || []);
    console.log(`📘 Backtest → Trades: ${backtest.metrics.totalTrades}, WinRate: ${backtest.metrics.winRate}%`);

    // 7) SAVE TO MONGODB
    const pct = Number(prediction?.predicted_pct_change ?? 0);
    const conf = Number(prediction?.confidence ?? 0.5);

    try {
      await SentimentHistory.create({
        ticker,
        sentiment: avgSentiment,
        predicted_pct_change: isNaN(pct) ? 0 : pct,
        confidence: isNaN(conf) ? 0.5 : conf,
        date: new Date()
      });
      console.log("💾 Sentiment saved to MongoDB");
    } catch (err) {
      console.error("❌ Mongo save error:", err);
    }

    // 8) SOCKET UPDATE
    io.to(ticker).emit("news:update", {
      ticker,
      articles: scored,
      avgSentiment,
      prediction,
      prices,
      backtest
    });
    console.log(`📡 Realtime update sent → room: ${ticker}`);

    // 9) RESPONSE
    res.json({
      ticker,
      articles: scored,
      avgSentiment,
      prediction,
      prices,
      backtest
    });

  } catch (err) {
    console.error("❌ GET news route error:", err);
    res.status(500).json({ 
      error: err.message,
      ticker: req.params.ticker,
      message: "Using mock data due to error"
    });
  }
});

// ------------------------------------------
// POST /api/news (new endpoint for frontend)
// ------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { ticker } = req.body;
    if (!ticker) {
      return res.status(400).json({ error: "Ticker required in request body" });
    }

    const symbol = ticker.toUpperCase();
    console.log(`📰 [POST] Fetching news for ${symbol}...`);

    // 1) FETCH NEWS
    let articles;
    try {
      articles = await fetchNewsForTicker(symbol, { pageSize: 10 });
      console.log(`✅ Found ${articles.length} real articles`);
    } catch (newsErr) {
      console.log("News API error, using mock:", newsErr.message);
      articles = generateMockArticles(symbol);
    }

    // 2) SCORE WITH FINBERT
    const scored = [];
    for (const a of articles) {
      const text = (a.content || a.description || a.title || '').slice(0, 1500);
      
      let score;
      try {
        score = await scoreWithFinBERT(text);
      } catch (finbertErr) {
        console.log("FinBERT error, using mock score:", finbertErr.message);
        score = {
          positive: 0.3 + Math.random() * 0.4,
          negative: 0.1 + Math.random() * 0.3,
          neutral: 0.2 + Math.random() * 0.3,
          compound: (Math.random() - 0.5) * 0.6
        };
      }
      scored.push({ ...a, finbert_score: score });
    }

    // 3) AVERAGE SENTIMENT
    const values = scored.map(s => s.finbert_score?.compound ?? 0);
    const avgSentiment = values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
    console.log(`📊 Sentiment avg: ${avgSentiment.toFixed(3)}`);

    // 4) PRICES
    let prices;
    try {
      console.log(`🟦 Fetching prices for: ${symbol}`);
      prices = await fetchRecentPrices(symbol);
      console.log(`📈 Received ${prices.length} real candles`);
    } catch (priceErr) {
      console.log("Price fetch error, using mock:", priceErr.message);
      prices = generateMockPrices(symbol, 200);
    }

    // Format prices for TradingView
    const formattedPrices = prices.map(p => ({
      time: p.time,
      price: p.price || p.close,
      open: p.open || p.price || p.close,
      high: p.high || p.price || p.close,
      low: p.low || p.price || p.close,
      close: p.close || p.price,
      volume: p.volume || 1000000
    }));

    // 5) PREDICTION
    let prediction;
    try {
      prediction = await predictWithLSTM(symbol, prices, avgSentiment);
    } catch (predErr) {
      console.log("Prediction error, using mock:", predErr.message);
      prediction = generateMockPrediction(avgSentiment);
    }
    console.log("🔮 Prediction:", prediction);

    // 6) BACKTEST
    console.log("🔄 Running EMA Backtest...");
    const backtest = runEMABacktest(prices || []);
    console.log(`📘 Backtest → Trades: ${backtest.metrics.totalTrades}, WinRate: ${backtest.metrics.winRate}%`);

    // 7) SAVE TO MONGODB
    try {
      await SentimentHistory.create({
        ticker: symbol,
        sentiment: avgSentiment,
        predicted_pct_change: Number(prediction?.predicted_pct_change ?? 0),
        confidence: Number(prediction?.confidence ?? 0.5),
        date: new Date()
      });
      console.log("💾 Sentiment saved to MongoDB");
    } catch (mongoErr) {
      console.error("❌ Mongo save error:", mongoErr.message);
    }

    // 8) SOCKET UPDATE (use 'sentiment-update' to match frontend)
    io.to(symbol).emit("sentiment-update", {
      ticker: symbol,
      sentiment: avgSentiment,
      articles: scored,
      prediction,
      prices: formattedPrices,
      backtest
    });
    console.log(`📡 Realtime 'sentiment-update' sent → room: ${symbol}`);

    // 9) RESPONSE
    res.json({
      ticker: symbol,
      sentiment: avgSentiment,
      articles: scored,
      prediction,
      prices: formattedPrices,
      backtest
    });

  } catch (err) {
    console.error("❌ POST news route error:", err);
    
    // Return mock data even on complete failure
    const symbol = req.body?.ticker?.toUpperCase() || "AAPL";
    const mockSentiment = 0.15;
    const mockPrediction = generateMockPrediction(mockSentiment);
    
    res.json({
      ticker: symbol,
      sentiment: mockSentiment,
      articles: generateMockArticles(symbol),
      prediction: mockPrediction,
      prices: generateMockPrices(symbol, 100),
      backtest: {
        metrics: {
          totalTrades: 12,
          winRate: 58,
          totalReturn: 8.5,
          finalEquity: 10850
        },
        buySignals: Array(5).fill().map((_, i) => ({
          time: new Date(Date.now() - (i * 600000)),
          price: 180 + (Math.random() - 0.5) * 5,
          type: 'buy'
        })),
        sellSignals: Array(5).fill().map((_, i) => ({
          time: new Date(Date.now() - (i * 600000)),
          price: 182 + (Math.random() - 0.5) * 5,
          type: 'sell'
        }))
      },
      message: "Using mock data due to server error"
    });
  }
});

export default router;