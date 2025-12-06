import mongoose from "mongoose";

const SentimentHistorySchema = new mongoose.Schema({
  ticker: { type: String, required: true },
  sentiment: { type: Number, required: true },
  predicted_pct_change: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("SentimentHistory", SentimentHistorySchema);
