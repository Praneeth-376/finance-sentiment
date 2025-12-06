import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

import SentimentGauge from "./components/SentimentGauge";
import ArticlesList from "./components/ArticlesList";
import PriceChart from "./components/PriceChart";
import SentimentHistoryChart from "./components/SentimentHistoryChart";
import BacktestChart from "./components/BacktestChart";
import BacktestAnalytics from "./components/BacktestAnalytics";
import PortfolioPanel from './components/PortfolioPanel';
import Watchlist from './components/Watchlist';
import TradeHistory from "./components/TradeHistory";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const socket = io(API_BASE);

export default function App() {
  const [ticker, setTicker] = useState("AAPL");
  const [searchInput, setSearchInput] = useState("AAPL");
  const [activePage, setActivePage] = useState("dashboard"); // "dashboard" or "history"

  const [articles, setArticles] = useState([]);
  const [avgSentiment, setAvgSentiment] = useState(0);
  const [prediction, setPrediction] = useState(null);

  const [prices, setPrices] = useState([]);
  const [history, setHistory] = useState([]);

  const [livePrice, setLivePrice] = useState(null);
  const [priceTime, setPriceTime] = useState(null);

  const [backtest, setBacktest] = useState(null);

  // ===== COMPARE STOCKS FEATURE =====
  const [compareStocks, setCompareStocks] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [normalizeView, setNormalizeView] = useState(false);

  // ===== ENHANCED INDICATOR TOGGLES =====
  const [showIndicators, setShowIndicators] = useState({
    ema20: true,
    ema50: true,
    signals: true,
    prediction: true,
    rsi: false,
    macd: false,
    volume: false,
    backtest: true,
    vwap: false,
  });

  // ===== DARK MODE STATE =====
  const [darkMode, setDarkMode] = useState(false);

  // ===== TIMEFRAME STATE =====
  const [timeframe, setTimeframe] = useState("1m");

  // ===== LOADING STATE =====
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // ===== FAVORITES & RECENT SEARCHES =====
  const [favorites, setFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  // ===========================
  // LOAD FAVORITES & RECENT SEARCHES FROM LOCALSTORAGE
  // ===========================
  useEffect(() => {
    const fav = JSON.parse(localStorage.getItem("favorites") || "[]");
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");

    setFavorites(fav);
    setRecentSearches(recent);
  }, []);

  // ===========================
  // TOGGLE FAVORITE FUNCTION
  // ===========================
  function toggleFavorite(symbol) {
    const sym = symbol.toUpperCase();
    let updatedFav = [];

    if (favorites.includes(sym)) {
      updatedFav = favorites.filter(f => f !== sym);
    } else {
      updatedFav = [...favorites, sym];
    }

    setFavorites(updatedFav);
    localStorage.setItem("favorites", JSON.stringify(updatedFav));
  }

  // ===========================
  // SOCKET CONNECTION
  // ===========================
  useEffect(() => {
    socket.on("connect", () => console.log("✅ Socket connected"));

    socket.on("live-price", (data) => {
      setLivePrice(data.price);
      setPriceTime(data.time);

      setPrices(prev => {
        if (prev.length === 0) return prev;
        
        const updated = [...prev, { 
          time: data.time,
          price: data.price,
          open: data.price,
          high: data.price,
          low: data.price,
          close: data.price,
          volume: data.volume || 1000000
        }];

        return updated.slice(-300);
      });
    });

    socket.on("sentiment-update", (payload) => {
      if (payload?.ticker !== ticker.toUpperCase()) return;

      setArticles(payload.articles || []);
      setAvgSentiment(payload.sentiment ?? 0);
      setPrediction(payload.prediction ?? null);

      if (payload.prices?.length > 0) {
        const formattedPrices = payload.prices.map(p => ({
          time: p.time,
          price: p.price,
          open: p.open || p.price,
          high: p.high || p.price,
          low: p.low || p.price,
          close: p.close || p.price,
          volume: p.volume || 1000000
        }));
        setPrices(formattedPrices);
      }

      if (payload.backtest) {
        setBacktest(payload.backtest);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("live-price");
      socket.off("sentiment-update");
    };
  }, [ticker]);

  // ===========================
  // SUBSCRIBE TO STOCK ROOM
  // ===========================
  useEffect(() => {
    const t = ticker.toUpperCase();
    socket.emit("subscribe-stock", t);

    return () => {
      socket.emit("unsubscribe-stock", t);
    };
  }, [ticker]);

  // ===========================
  // FETCH COMPARE DATA
  // ===========================
  useEffect(() => {
    if (compareStocks.length === 0) {
      setCompareData({});
      return;
    }

    async function fetchCompareData() {
      try {
        setIsComparing(true);
        console.log(`📊 Fetching compare data for: ${compareStocks.join(", ")}`);
        
        const res = await axios.post(`${API_BASE}/api/compare`, {
          tickers: compareStocks
        });

        setCompareData(res.data);
        console.log("✅ Compare data loaded:", Object.keys(res.data));
      } catch (err) {
        console.error("❌ Compare fetch error:", err);
      } finally {
        setIsComparing(false);
      }
    }

    fetchCompareData();
  }, [compareStocks, timeframe]);

  // ===========================
  // SEARCH HANDLER
  // ===========================
  async function handleSearch(e) {
    e.preventDefault();
    const symbol = searchInput.trim().toUpperCase();
    if (!symbol) return;

    setIsLoading(true);
    setTicker(symbol);

    // Update recent searches
    let updatedRecent = [symbol, ...recentSearches.filter(s => s !== symbol)];
    updatedRecent = updatedRecent.slice(0, 10); // limit to 10 stocks

    setRecentSearches(updatedRecent);
    localStorage.setItem("recentSearches", JSON.stringify(updatedRecent));

    try {
      console.log(`🔍 Searching for ${symbol}...`);
      
      const res = await axios.get(`${API_BASE}/api/news/${symbol}`);
      const { articles, avgSentiment, prediction, prices, backtest } = res.data;

      setArticles(articles || []);
      setAvgSentiment(avgSentiment || 0);
      setPrediction(prediction || null);

      if (prices?.length > 0) {
        const formattedPrices = prices.map(p => ({
          time: p.time,
          price: p.price,
          open: p.open || p.price,
          high: p.high || p.price,
          low: p.low || p.price,
          close: p.close || p.price,
          volume: p.volume || 1000000
        }));
        setPrices(formattedPrices);
      }
      
      if (backtest) {
        setBacktest(backtest);
      }

      // Sentiment history
      try {
        const hist = await axios.get(`${API_BASE}/api/history/${symbol}`);
        setHistory(hist.data || []);
      } catch (histErr) {
        console.log("History fetch error:", histErr.message);
        setHistory([]);
      }

    } catch (err) {
      console.error("❌ Search error:", err);
      alert("Error fetching data. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  }

  // ADD TO COMPARE
  function handleAddToCompare() {
    const symbol = searchInput.trim().toUpperCase();
    if (!symbol) return;

    if (compareStocks.includes(symbol)) {
      alert(`${symbol} is already in compare list`);
      return;
    }

    if (compareStocks.length >= 5) {
      alert("Maximum 5 stocks for comparison");
      return;
    }

    setCompareStocks([...compareStocks, symbol]);
    console.log(`➕ Added ${symbol} to compare`);
  }

  // REMOVE FROM COMPARE
  function handleRemoveFromCompare(symbol) {
    setCompareStocks(compareStocks.filter(s => s !== symbol));
    console.log(`➖ Removed ${symbol} from compare`);
  }

  // Timeframe options
  const timeframeOptions = [
    { value: '1m', label: '1M', icon: '🕐' },
    { value: '5m', label: '5M', icon: '🕐' },
    { value: '15m', label: '15M', icon: '🕒' },
    { value: '1h', label: '1H', icon: '🕔' },
    { value: '4h', label: '4H', icon: '🕕' },
    { value: '1d', label: '1D', icon: '📅' },
  ];

  // If TradeHistory page is active, show only that
  if (activePage === "history") {
    return <TradeHistory />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-50 to-slate-100'} p-6 transition-colors`}>
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Real-Time News Sentiment
            </h1>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              AI-driven finance signals • Live Auto-Refresh 🔴
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* TRADE HISTORY BUTTON */}
            <button
              onClick={() => setActivePage("history")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                darkMode 
                  ? 'bg-purple-700 text-white hover:bg-purple-600' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              📋 Trade History
            </button>

            {/* DARK MODE TOGGLE */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg transition-all ${
                darkMode 
                  ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>

            {/* LIVE PRICE */}
            <div className={`flex items-center gap-3 ${
              darkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white/70'
            } border rounded-full px-4 py-2 shadow-sm`}>
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                LIVE
              </span>
              <span className="text-lg font-semibold text-emerald-600">
                {livePrice ? `$${livePrice.toFixed(2)}` : "—"}
              </span>
              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {priceTime ? new Date(priceTime).toLocaleTimeString() : ""}
              </span>
              <span className="ml-2 w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            </div>

            {/* SEARCH INPUT */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`px-3 py-2 border rounded-lg shadow-sm w-36 text-sm ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-white border-slate-200'
                }`}
                placeholder="Enter ticker..."
              />
              
              {/* FAVORITE BUTTON */}
              <button
                type="button"
                onClick={() => toggleFavorite(searchInput.trim().toUpperCase())}
                className={`text-xl px-2 ${darkMode ? 'hover:text-yellow-300' : 'hover:text-yellow-500'}`}
              >
                {favorites.includes(searchInput.trim().toUpperCase()) ? "⭐" : "☆"}
              </button>
              
              <button 
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isLoading 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </>
                ) : 'Search'}
              </button>
              
              {/* COMPARE BUTTON */}
              <button
                type="button"
                onClick={handleAddToCompare}
                disabled={isComparing}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  isComparing
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white text-sm`}
              >
                📊 Compare +
              </button>
            </form>
          </div>
        </header>

        {/* MAIN GRID - DASHBOARD */}
        <main className="grid grid-cols-12 gap-6">
          {/* LEFT PANEL */}
          <section className="col-span-8 space-y-4">
            {/* COMPARE STOCKS PANEL */}
            {compareStocks.length > 0 && (
              <div className={`mb-4 p-4 rounded-xl ${
                darkMode ? 'bg-slate-800' : 'bg-white'
              } shadow-md`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    📊 Comparing Stocks ({compareStocks.length}/5)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNormalizeView(!normalizeView)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all ${
                        normalizeView
                          ? 'bg-green-600 text-white'
                          : darkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {normalizeView ? '📈 % View' : '💲 Price View'}
                    </button>
                    <button
                      onClick={() => setCompareStocks([])}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {compareStocks.map((stock, idx) => (
                    <div
                      key={stock}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-100'
                      }`}
                      style={{
                        borderLeft: `4px solid ${
                          ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'][idx % 5]
                        }`
                      }}
                    >
                      <span className={`font-semibold text-sm ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {stock}
                      </span>
                      <button
                        onClick={() => handleRemoveFromCompare(stock)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                
                {isComparing && (
                  <div className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Loading compare data...
                  </div>
                )}
              </div>
            )}

            {/* TIME FRAME SELECTOR */}
            <div className={`mb-4 p-4 rounded-xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            } shadow-md`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-semibold ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  ⏰ Chart Time Frame
                </h3>
                <div className="flex gap-1">
                  {timeframeOptions.map(tf => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                        timeframe === tf.value
                          ? "bg-indigo-600 text-white shadow-lg"
                          : darkMode
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {tf.icon} {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* INDICATOR CONTROL PANEL */}
            <div className={`p-4 rounded-xl mb-4 ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            } shadow-md`}>
              <h3 className={`text-sm font-semibold mb-3 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                📊 Chart Indicators & Features
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "ema20", label: "EMA 20", icon: "📈" },
                  { key: "ema50", label: "EMA 50", icon: "📊" },
                  { key: "vwap", label: "VWAP", icon: "⚖️" },
                  { key: "volume", label: "Volume", icon: "📊" },
                  { key: "signals", label: "Buy/Sell Signals", icon: "🎯" },
                  { key: "prediction", label: "Prediction", icon: "🔮" },
                  { key: "backtest", label: "Backtest", icon: "⏮️" },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() =>
                      setShowIndicators((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      showIndicators[key]
                        ? "bg-indigo-600 text-white shadow-lg scale-105"
                        : darkMode
                        ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN CHART */}
            <div className={`${
              darkMode ? 'bg-slate-800' : 'bg-white'
            } p-4 rounded-2xl shadow-md`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  💹 {ticker} Live Price Chart
                  {compareStocks.length > 0 && (
                    <span className={`ml-2 text-sm font-normal ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      + {compareStocks.length} compared
                    </span>
                  )}
                </h2>
                <div className={`flex items-center gap-2 text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span>{prices.length} candles</span>
                  <span>•</span>
                  <span>{timeframe}</span>
                  {backtest && (
                    <>
                      <span>•</span>
                      <span>{backtest.metrics?.totalTrades || 0} trades</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="h-[500px]">
                <PriceChart
                  symbol={ticker}
                  prices={prices}
                  prediction={prediction}
                  showIndicators={showIndicators}
                  backtest={backtest}
                  darkMode={darkMode}
                  timeframe={timeframe}
                  compareData={compareData}
                  normalizeView={normalizeView}
                />
              </div>
            </div>

            {/* BACKTEST ANALYTICS PANEL - ENHANCED VERSION */}
            {backtest && backtest.metrics && showIndicators.backtest && (
              <BacktestAnalytics metrics={backtest.metrics} darkMode={darkMode} />
            )}

            {backtest && (
              <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl shadow-md`}>
                <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  📈 Backtest Details
                </h2>
                <BacktestChart data={backtest} darkMode={darkMode} />
              </div>
            )}

            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl shadow-md`}>
              <SentimentHistoryChart data={history} darkMode={darkMode} />
            </div>
          </section>

          {/* RIGHT PANEL */}
          <aside className="col-span-4 space-y-4">
            {/* PORTFOLIO PANEL */}
            <PortfolioPanel socket={socket} apiBase={API_BASE} darkMode={darkMode} />
            
            {/* WATCHLIST PANEL */}
            <Watchlist socket={socket} apiBase={API_BASE} onSelectTicker={(t) => {
              setTicker(t);
              setSearchInput(t);
            }} darkMode={darkMode} />

            {/* FAVORITES PANEL */}
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl shadow-sm border ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>⭐ Favorites</h3>
              
              <div className="mt-2 space-y-1">
                {favorites.map(fav => (
                  <div
                    key={fav}
                    onClick={() => {
                      setTicker(fav);
                      setSearchInput(fav);
                    }}
                    className={`cursor-pointer ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'} hover:underline py-1 px-2 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                  >
                    {fav}
                  </div>
                ))}

                {favorites.length === 0 && (
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No favorites yet.</p>
                )}
              </div>
            </div>

            {/* RECENT SEARCHES PANEL */}
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl shadow-sm border ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>🕘 Recent Searches</h3>
              
              <div className="mt-2 space-y-1">
                {recentSearches.map(sym => (
                  <div
                    key={sym}
                    onClick={() => {
                      setTicker(sym);
                      setSearchInput(sym);
                    }}
                    className={`cursor-pointer ${darkMode ? 'text-slate-300 hover:text-indigo-300' : 'text-slate-700 hover:text-indigo-600'} py-1 px-2 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                  >
                    {sym}
                  </div>
                ))}

                {recentSearches.length === 0 && (
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No searches yet.</p>
                )}
              </div>
            </div>

            {/* SENTIMENT PANEL */}
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl shadow-md`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Sentiment Analysis
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  avgSentiment > 0.2 ? 'bg-green-100 text-green-800' :
                  avgSentiment < -0.2 ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {avgSentiment > 0.2 ? 'Bullish' : 
                   avgSentiment < -0.2 ? 'Bearish' : 'Neutral'}
                </span>
              </div>
              <SentimentGauge value={avgSentiment} darkMode={darkMode} />
              
              {prediction && (
                <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    AI Prediction
                  </div>
                  <div className={`text-lg font-bold ${
                    prediction.predicted_pct_change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {prediction.predicted_pct_change > 0 ? '+' : ''}{prediction.predicted_pct_change || 0}%
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Confidence: {((prediction.confidence || 0.5) * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>

            {/* ARTICLES PANEL */}
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-2xl shadow-md`}>
              <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Latest Articles ({articles.length})
              </h3>
              <ArticlesList articles={articles} darkMode={darkMode} />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
