import mongoose from "mongoose";

const HoldingSchema = new mongoose.Schema({
  ticker: { type: String, required: true, uppercase: true },
  quantity: { type: Number, required: true },
  avgPrice: { type: Number, required: true }, // average buy price
  invested: { type: Number, required: true }, // quantity * avgPrice
  currentPrice: { type: Number, default: 0 },
  pnl: { type: Number, default: 0 }
}, { _id: false });

const PortfolioSchema = new mongoose.Schema({
  holdings: { type: [HoldingSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Portfolio", PortfolioSchema);
