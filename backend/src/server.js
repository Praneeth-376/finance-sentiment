// src/server.js
import express from "express";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import newsRouter from "./routes/news.js";
import compareRoute from "./routes/compare.js";
import historyRoute from "./routes/history.js";
import backtestRoute from "./routes/backtest.js";
import portfolioRoute from "./routes/portfolio.js";
dotenv.config();
console.log("Loaded NEWS_API_KEY:", process.env.NEWS_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------
//  MONGO CONNECT
// -----------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// -----------------------------------
//  ROUTES
// -----------------------------------
app.use("/api/history", historyRoute);
app.use("/api/backtest", backtestRoute);
app.use("/api/news", newsRouter);
app.use("/api/compare", compareRoute);
app.use("/api/portfolio", portfolioRoute);
// -----------------------------------
//  CREATE SERVER + SOCKET.IO
// -----------------------------------
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Simple mock price function (since Yahoo Finance is failing)
const getMockPrice = (ticker) => {
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
  const change = (Math.random() - 0.5) * 2; // ±$1
  const price = basePrice + change;
  const volume = Math.floor(Math.random() * 5000000) + 1000000;
  
  return {
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
    volume,
    time: new Date()
  };
};

// -----------------------------------
// SOCKET HANDLERS
// -----------------------------------
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("subscribe-stock", async (ticker) => {
    console.log(socket.id, "subscribed", ticker);

    // Emit live price every 5 seconds
    const interval = setInterval(async () => {
      try {
        // Use mock data instead of Yahoo Finance
        const priceData = getMockPrice(ticker);
        
        const priceObj = {
          symbol: ticker,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          volume: priceData.volume,
          time: priceData.time,
        };

        socket.emit("live-price", priceObj);
      } catch (err) {
        console.log("Live price error:", err.message);
        
        // Fallback to basic mock data
        socket.emit("live-price", {
          symbol: ticker,
          price: 150 + (Math.random() - 0.5) * 5,
          change: (Math.random() - 0.5) * 2,
          changePercent: (Math.random() - 0.5) * 1.5,
          volume: Math.floor(Math.random() * 5000000) + 1000000,
          time: new Date()
        });
      }
    }, 5000);

    // Store interval ID for cleanup
    socket.data.interval = interval;
    
    socket.on("disconnect", () => {
      console.log("socket disconnected", socket.id);
      if (socket.data.interval) {
        clearInterval(socket.data.interval);
      }
    });
  });

  // Add unsubscribe handler
  socket.on("unsubscribe-stock", (ticker) => {
    console.log(socket.id, "unsubscribed", ticker);
    if (socket.data.interval) {
      clearInterval(socket.data.interval);
      socket.data.interval = null;
    }
  });
});

// -----------------------------------
//  START SERVER
// -----------------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));