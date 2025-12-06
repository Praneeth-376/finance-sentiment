export async function predictWithLSTM(ticker, prices, avgSentiment) {
  try {
    // Simple demo prediction logic (since you don’t have a real LSTM model)
    const lastPrice = prices?.[prices.length - 1]?.price || 0;

    if (!lastPrice || isNaN(lastPrice)) {
      return {
        predicted_pct_change: 0,
        confidence: 0.5
      };
    }

    // Fake prediction logic
    const predictedChange =
      (avgSentiment || 0) * 0.02 + (Math.random() - 0.5) * 0.01;

    return {
      predicted_pct_change: Number(predictedChange.toFixed(4)),
      confidence: Number((0.6 + Math.random() * 0.3).toFixed(3)) // 0.6–0.9
    };

  } catch (err) {
    console.error("LSTM error:", err);

    return {
      predicted_pct_change: 0,
      confidence: 0.5
    };
  }
}
