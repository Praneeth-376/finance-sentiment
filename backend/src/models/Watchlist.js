import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema({
  tickers: { type: [String], default: [] }
});

export default mongoose.model("Watchlist", WatchlistSchema);
