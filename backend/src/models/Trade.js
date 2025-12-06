import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  ticker: { type: String, required: true, uppercase: true },
  type: { type: String, enum: ["BUY","SELL"], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  time: { type: Date, default: Date.now }
});

export default mongoose.model("Trade", TradeSchema);
