export function ema(data, period) {
  if (data.length < period) return [];
  const k = 2 / (period + 1);

  let ema = new Array(data.length).fill(null);
  ema[period - 1] = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// Calculate comprehensive backtest metrics
export function calculateBacktestMetrics(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalReturn: 0,
      avgReturn: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      buyCount: 0,
      sellCount: 0,
      totalProfit: 0,
      finalEquity: 10000
    };
  }

  // Filter only SELL trades (completed trades)
  const completedTrades = trades.filter(t => t.type === "SELL" && t.profitPct !== undefined);
  
  if (completedTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalReturn: 0,
      avgReturn: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      buyCount: trades.filter(t => t.type === "BUY").length,
      sellCount: trades.filter(t => t.type === "SELL").length,
      totalProfit: 0,
      finalEquity: 10000
    };
  }

  let wins = 0;
  let losses = 0;
  let pnlList = [];
  let equity = 1.0; // Starting with 1 unit
  let peak = 1.0;
  let maxDD = 0;
  let cumulativeReturns = [0];
  let totalInvestment = 0;
  let totalReturn = 0;

  // Calculate using profit percentages
  completedTrades.forEach(t => {
    const ret = t.profitPct || 0; // % return
    pnlList.push(ret);

    if (ret > 0) wins++;
    else losses++;

    // For equity curve (assuming 1 unit invested per trade)
    equity *= (1 + ret / 100);
    peak = Math.max(peak, equity);
    const drawdown = (equity - peak) / peak;
    maxDD = Math.min(maxDD, drawdown);
    
    cumulativeReturns.push(equity - 1);
  });

  const winRate = (wins / completedTrades.length) * 100;
  const avgReturn = pnlList.reduce((a, b) => a + b, 0) / pnlList.length;
  totalReturn = (equity - 1) * 100;

  // Profit factor
  const grossProfit = pnlList.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(pnlList.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

  // Sharpe Ratio (simplified - using average return vs standard deviation)
  const mean = avgReturn;
  const std = pnlList.length > 1 
    ? Math.sqrt(pnlList.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / (pnlList.length - 1))
    : 0;
  const sharpe = std === 0 ? 0 : mean / std;

  // Count buy/sell signals
  const buySignals = trades.filter(t => t.type === "BUY").length;
  const sellSignals = trades.filter(t => t.type === "SELL").length;

  // Calculate total profit in dollars (from original profit field)
  const totalProfitDollars = completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);

  return {
    totalTrades: completedTrades.length,
    winRate: Number(winRate.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
    avgReturn: Number(avgReturn.toFixed(2)),
    maxDrawdown: Number(maxDD * 100).toFixed(2),
    profitFactor: Number(profitFactor.toFixed(2)),
    sharpeRatio: Number(sharpe.toFixed(2)),
    buyCount: buySignals,
    sellCount: sellSignals,
    totalProfit: Number(totalProfitDollars.toFixed(2)),
    finalEquity: Number((10000 + totalProfitDollars).toFixed(2))
  };
}

export function runEMABacktest(prices) {
  if (!Array.isArray(prices) || prices.length === 0) {
    return {
      buySignals: [],
      sellSignals: [],
      metrics: calculateBacktestMetrics([]),
      trades: []
    };
  }

  const closes = prices.map(p => p.close || p.price);

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  let trades = [];
  let buySignals = [];
  let sellSignals = [];
  let position = null;
  let entryPrice = null;
  const startingEquity = 10000;
  let equity = startingEquity;

  for (let i = 1; i < closes.length; i++) {
    if (!ema20[i] || !ema50[i]) continue;

    const prev20 = ema20[i - 1], prev50 = ema50[i - 1];
    const curr20 = ema20[i], curr50 = ema50[i];

    // BUY signal: EMA20 crosses above EMA50
    if (prev20 < prev50 && curr20 > curr50 && !position) {
      position = "LONG";
      entryPrice = closes[i];
      
      const buyPoint = {
        x: new Date(prices[i].time).toISOString(),
        y: closes[i],
        timestamp: prices[i].time
      };
      
      buySignals.push(buyPoint);
      trades.push({ 
        type: "BUY", 
        price: entryPrice, 
        time: prices[i].time,
        timestamp: prices[i].time
      });
    }

    // SELL signal: EMA20 crosses below EMA50
    if (prev20 > prev50 && curr20 < curr50 && position === "LONG") {
      const exit = closes[i];
      const profit = exit - entryPrice;
      const profitPct = (profit / entryPrice) * 100;
      
      equity += profit;
      
      const sellPoint = {
        x: new Date(prices[i].time).toISOString(),
        y: exit,
        timestamp: prices[i].time,
        profit: profit,
        profitPct: profitPct
      };
      
      sellSignals.push(sellPoint);
      trades.push({
        type: "SELL",
        price: exit,
        time: prices[i].time,
        timestamp: prices[i].time,
        profit: profit,
        profitPct: profitPct,
        return: profitPct  // For compatibility with metrics calculation
      });
      
      position = null;
      entryPrice = null;
    }
  }

  // Close open position at end if any
  if (position === "LONG" && entryPrice) {
    const lastPrice = closes[closes.length - 1];
    const profit = lastPrice - entryPrice;
    const profitPct = (profit / entryPrice) * 100;
    
    equity += profit;
    
    sellSignals.push({
      x: new Date(prices[prices.length - 1].time).toISOString(),
      y: lastPrice,
      timestamp: prices[prices.length - 1].time,
      profit: profit,
      profitPct: profitPct
    });
    
    trades.push({
      type: "SELL",
      price: lastPrice,
      time: prices[prices.length - 1].time,
      timestamp: prices[prices.length - 1].time,
      profit: profit,
      profitPct: profitPct,
      return: profitPct,  // For compatibility with metrics calculation
      note: "Position closed at end"
    });
  }

  // Calculate comprehensive metrics
  const metrics = calculateBacktestMetrics(trades);

  // Add equity to metrics
  metrics.finalEquity = Number(equity.toFixed(2));
  metrics.startingEquity = startingEquity;

  return {
    buySignals,
    sellSignals,
    metrics,
    trades,
    tradeHistory: trades // Alias for compatibility
  };
}

// Default export for compatibility
export default runEMABacktest;