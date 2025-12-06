// src/services/prices.js
import yahooFinance from "yahoo-finance2";

/**
 * Fetch realistic price candles for charting.
 * Since Yahoo no longer provides intraday (1m) free data,
 * we simulate intraday candles from daily data.
 */
export async function fetchRecentPrices(ticker) {
  console.log("🟦 fetchRecentPrices →", ticker);

  try {
    // ===============================
    // 1) Get current market quote
    // ===============================
    const quote = await yahooFinance.quote(ticker);
    const marketPrice =
      quote?.regularMarketPrice ??
      quote?.price?.regularMarketPrice ??
      null;

    console.log("📊 CurrentMarketPrice =", marketPrice);

    // ===============================
    // 2) Fetch daily historical OHLC
    // ===============================
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const historical = await yahooFinance.historical(ticker, {
      period1: start,
      period2: end,
      interval: "1d", // only supported interval
    });

    if (!historical || !historical.length) {
      console.warn("⚠ No historical data — using fallback");
      return generateMockPrices(ticker);
    }

    console.log("📈 Historical days:", historical.length);

    // ==========================================
    // 3) Use last daily close as base for intraday
    // ==========================================
    const last = historical[historical.length - 1];
    const base = Number(last.close || marketPrice || 100);

    // generate 200 minutes (3–4 hours of “intraday”)
    const intradayCandles = [];
    const now = Date.now();

    for (let i = 200; i >= 0; i--) {
      const time = new Date(now - i * 60000);

      // smooth variation (better than random spikes)
      const wave = Math.sin(i / 12) * 0.8;
      const trend = i * -0.003; // gentle downward slope
      const noise = (Math.random() - 0.5) * 0.3;

      const price = base + wave + trend + noise;

      intradayCandles.push({
        time,
        open: price - 0.1,
        high: price + 0.2,
        low: price - 0.2,
        close: price,
        price,
        volume: Math.floor(Math.random() * 1_000_000) + 500_000,
      });
    }

    return intradayCandles;
  } catch (err) {
    console.error("🔥 Price fetch error:", err.message);
    return generateMockPrices(ticker);
  }
}

/**
 * Completely mock intraday series when Yahoo fails.
 */
function generateMockPrices(ticker) {
  console.log("📈 Generating mock prices for:", ticker);

  const candles = [];
  const now = Date.now();

  // set approximate base price
  const base =
    ticker === "AAPL"
      ? 180
      : ticker === "GOOGL"
      ? 140
      : ticker === "TSLA"
      ? 200
      : 150;

  for (let i = 200; i >= 0; i--) {
    const time = new Date(now - i * 60000);

    const wave = Math.sin(i / 15) * 1.5;
    const smallTrend = i * -0.002;
    const noise = (Math.random() - 0.5) * 0.5;

    const price = base + wave + smallTrend + noise;

    candles.push({
      time,
      open: price - 0.1,
      high: price + 0.2,
      low: price - 0.2,
      close: price,
      price,
      volume: Math.floor(Math.random() * 800_000) + 200_000,
    });
  }

  console.log("📈 Mock candles created:", candles.length);
  return candles;
}
