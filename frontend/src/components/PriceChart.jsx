import React, { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement,
  CategoryScale,
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement,
  CategoryScale,
  zoomPlugin
);

// ===== INDICATOR CALCULATIONS =====

function calculateEMA(data, period) {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  let ema = new Array(data.length).fill(null);
  ema[period - 1] = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calculateRSI(data, period = 14) {
  if (!data || data.length < period + 1) return [];
  
  let rsi = new Array(data.length).fill(null);
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

function calculateMACD(data) {
  if (!data || data.length < 26) return { macdLine: [], signal: [], histogram: [] };
  
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  
  let macdLine = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine[i] = ema12[i] - ema26[i];
    }
  }

  const macdValues = macdLine.filter(v => v !== null);
  const signalLine = calculateEMA(macdValues, 9);
  
  let signal = new Array(data.length).fill(null);
  let signalIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signalIdx < signalLine.length) {
      signal[i] = signalLine[signalIdx];
      signalIdx++;
    }
  }

  let histogram = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signal[i] !== null) {
      histogram[i] = macdLine[i] - signal[i];
    }
  }

  return { macdLine, signal, histogram };
}

// ===== MAIN COMPONENT =====

export default function PriceChart({ 
  prices = [], 
  prediction = null, 
  showIndicators = {},
  backtest = null,
  darkMode = false,
  timeframe = "1m",
  compareData = {},
  normalizeView = false,
  symbol = "STOCK"
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  
  const [activeTimeframe, setActiveTimeframe] = useState(timeframe);

  useEffect(() => {
    if (!prices || prices.length < 2) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const ctx = canvasRef.current.getContext("2d");

    // Filter prices based on timeframe
    let filteredPrices = [...prices];
    const now = Date.now();
    
    switch(activeTimeframe) {
      case "1m":
        filteredPrices = prices.filter(p => now - new Date(p.time).getTime() < 60 * 60 * 1000);
        break;
      case "5m":
        filteredPrices = prices.filter(p => now - new Date(p.time).getTime() < 5 * 60 * 60 * 1000);
        break;
      case "1h":
        filteredPrices = prices.filter(p => now - new Date(p.time).getTime() < 24 * 60 * 60 * 1000);
        break;
      case "1d":
        // Show all data
        break;
    }

    if (filteredPrices.length < 2) filteredPrices = prices;

    // Extract price values
    const lineData = filteredPrices.map((p) => ({
      x: new Date(p.time),
      y: Number(p.price || p.close),
    }));

    const priceArr = filteredPrices.map((p) => Number(p.price || p.close));
    const volumeArr = filteredPrices.map((p) => p.volume || Math.random() * 1000000);

    // Calculate indicators
    const ema20 = calculateEMA(priceArr, 20);
    const ema50 = calculateEMA(priceArr, 50);
    const rsi = calculateRSI(priceArr, 14);
    const macd = calculateMACD(priceArr);

    const ema20Data = ema20
      .map((v, i) => (v != null ? { x: new Date(filteredPrices[i].time), y: v } : null))
      .filter(Boolean);

    const ema50Data = ema50
      .map((v, i) => (v != null ? { x: new Date(filteredPrices[i].time), y: v } : null))
      .filter(Boolean);

    const rsiData = rsi
      .map((v, i) => (v != null ? { x: new Date(filteredPrices[i].time), y: v } : null))
      .filter(Boolean);

    const macdData = macd.macdLine
      .map((v, i) => (v != null ? { x: new Date(filteredPrices[i].time), y: v } : null))
      .filter(Boolean);

    const signalData = macd.signal
      .map((v, i) => (v != null ? { x: new Date(filteredPrices[i].time), y: v } : null))
      .filter(Boolean);

    const histogramData = macd.histogram
      .map((v, i) => (v != null ? { x: new Date(filteredPrices[i].time), y: v } : null))
      .filter(Boolean);

    const volumeData = volumeArr.map((v, i) => ({
      x: new Date(filteredPrices[i].time),
      y: v,
    }));

    // Local BUY / SELL SIGNALS
    const localBuy = [];
    const localSell = [];
    for (let i = 1; i < ema20.length; i++) {
      if (!ema20[i] || !ema50[i]) continue;

      const prev20 = ema20[i - 1], prev50 = ema50[i - 1];
      const cur20 = ema20[i], cur50 = ema50[i];

      if (prev20 < prev50 && cur20 > cur50) {
        localBuy.push({ x: new Date(filteredPrices[i].time), y: priceArr[i] });
      }

      if (prev20 > prev50 && cur20 < cur50) {
        localSell.push({ x: new Date(filteredPrices[i].time), y: priceArr[i] });
      }
    }

    // BACKTEST OVERLAY
    let backtestBuys = [];
    let backtestSells = [];
    
    if (backtest && showIndicators.backtest) {
      backtestBuys = (backtest.buySignals || [])
        .map(s => ({ x: new Date(s.x || s.timestamp || s.time), y: Number(s.y || s.price) }))
        .filter(s => !isNaN(s.x.getTime()) && !isNaN(s.y));
      
      backtestSells = (backtest.sellSignals || [])
        .map(s => ({ x: new Date(s.x || s.timestamp || s.time), y: Number(s.y || s.price) }))
        .filter(s => !isNaN(s.x.getTime()) && !isNaN(s.y));
    }

    // ================================
    // 🔮 PREDICTION CONE
    // ================================
    let predictionUpper = [];
    let predictionLower = [];
    let predictionMid = [];

    if (prediction && showIndicators.prediction && filteredPrices.length > 0) {
      const lastPrice = priceArr[priceArr.length - 1];
      const lastTime = new Date(filteredPrices[filteredPrices.length - 1].time);
      
      const pctChange = (prediction.predicted_pct_change || 0) / 100;
      const confidence = prediction.confidence || 0.5;
      
      const futureSteps = 10;
      
      for (let i = 1; i <= futureSteps; i++) {
        const futureTime = new Date(lastTime.getTime() + i * 60000);
        const timeMultiplier = i / futureSteps;
        
        const midPrice = lastPrice * (1 + pctChange * timeMultiplier);
        const upperPrice = lastPrice * (1 + pctChange * (1 + confidence) * timeMultiplier);
        const lowerPrice = lastPrice * (1 + pctChange * (1 - confidence) * timeMultiplier);
        
        predictionMid.push({ x: futureTime, y: midPrice });
        predictionUpper.push({ x: futureTime, y: upperPrice });
        predictionLower.push({ x: futureTime, y: lowerPrice });
      }
    }

    // Theme colors
    const theme = darkMode ? {
      bg: '#1e293b',
      grid: '#334155',
      text: '#e2e8f0',
      priceColor: '#f87171',
      ema20Color: '#fbbf24',
      ema50Color: '#60a5fa',
      volumeColor: 'rgba(148, 163, 184, 0.3)',
      rsiColor: '#a78bfa',
      macdColor: '#34d399',
      signalColor: '#fb923c',
      predictionFill: 'rgba(99, 102, 241, 0.15)',
      predictionBorder: 'rgba(99, 102, 241, 0.6)',
    } : {
      bg: '#ffffff',
      grid: '#e2e8f0',
      text: '#1e293b',
      priceColor: '#dc2626',
      ema20Color: '#eab308',
      ema50Color: '#3b82f6',
      volumeColor: 'rgba(148, 163, 184, 0.4)',
      rsiColor: '#8b5cf6',
      macdColor: '#10b981',
      signalColor: '#f59e0b',
      predictionFill: 'rgba(99, 102, 241, 0.2)',
      predictionBorder: 'rgba(99, 102, 241, 0.8)',
    };

    // Colors for compare stocks
    const compareColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

    // ================================
    // NORMALIZE FUNCTION FOR % VIEW
    // ================================
    const normalizeData = (data) => {
      if (!data || data.length === 0) return [];
      const firstPrice = data[0].y;
      return data.map(d => ({
        x: d.x,
        y: ((d.y - firstPrice) / firstPrice) * 100
      }));
    };

    // ================================
    // PROCESS COMPARE STOCKS
    // ================================
    const compareDatasets = [];
    
    if (Object.keys(compareData).length > 0) {
      Object.entries(compareData).forEach(([ticker, stockPrices], index) => {
        if (!stockPrices || stockPrices.length < 2) return;

        let compareLineData = stockPrices.map(p => ({
          x: new Date(p.time),
          y: Number(p.price || p.close)
        }));

        // Apply normalization if enabled
        if (normalizeView) {
          compareLineData = normalizeData(compareLineData);
        }

        compareDatasets.push({
          label: `${ticker}${normalizeView ? ' (%)' : ''}`,
          data: compareLineData,
          borderColor: compareColors[index % compareColors.length],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          yAxisID: normalizeView ? 'y-percent' : 'y',
          order: 5 + index,
        });
      });
    }

    // Process main price data (normalize if needed)
    let mainLineData = lineData;
    if (normalizeView && lineData.length > 0) {
      mainLineData = normalizeData(lineData);
    }

    // ================================
    // SMOOTH UPDATE OR CREATE CHART
    // ================================
    
    if (!chartRef.current) {
      // INITIAL CHART CREATION
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: { datasets: [] },
        options: {
          animation: false, // Disable animation for smooth updates
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              type: "time",
              time: { 
                unit: activeTimeframe === '1d' ? 'hour' : 'minute',
                displayFormats: { minute: 'HH:mm', hour: 'MMM dd HH:mm' }
              },
              grid: { color: theme.grid },
              ticks: { color: theme.text },
            },
            y: {
              type: 'linear',
              position: 'left',
              grid: { color: theme.grid },
              ticks: { color: theme.text },
            },
          },
          plugins: {
            legend: { 
              display: true,
              labels: { color: theme.text, usePointStyle: true, padding: 15, font: { size: 11 } }
            },
            tooltip: {
              backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              titleColor: theme.text,
              bodyColor: theme.text,
              borderColor: theme.grid,
              borderWidth: 1,
              padding: 12,
            },
            zoom: {
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
              pan: { enabled: true, mode: "x" },
            },
          },
        },
      });
    }

    const chart = chartRef.current;

    // UPDATE DATASETS
    chart.data.datasets = [
      // MAIN PRICE LINE
      { 
        label: `${symbol}${normalizeView ? ' (%)' : ''}`, 
        data: mainLineData, 
        borderColor: theme.priceColor, 
        borderWidth: 2, 
        pointRadius: 0, 
        tension: 0.25, 
        yAxisID: normalizeView ? 'y-percent' : 'y', 
        order: 1 
      },
      // COMPARE STOCKS
      ...compareDatasets,
      showIndicators.ema20 && { label: "EMA 20", data: ema20Data, borderColor: theme.ema20Color, borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: 'y', order: 2 },
      showIndicators.ema50 && { label: "EMA 50", data: ema50Data, borderColor: theme.ema50Color, borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: 'y', order: 3 },
      showIndicators.signals && { label: "BUY Signal", data: localBuy, showLine: false, pointRadius: 7, pointStyle: 'triangle', pointBackgroundColor: '#22c55e', pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y', order: 10 },
      showIndicators.signals && { label: "SELL Signal", data: localSell, showLine: false, pointRadius: 7, pointStyle: 'triangle', rotation: 180, pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y', order: 11 },
      showIndicators.backtest && backtestBuys.length > 0 && { label: "Backtest BUY", data: backtestBuys, showLine: false, pointRadius: 8, pointStyle: 'rectRot', pointBackgroundColor: '#06b6d4', pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y', order: 12 },
      showIndicators.backtest && backtestSells.length > 0 && { label: "Backtest SELL", data: backtestSells, showLine: false, pointRadius: 8, pointStyle: 'rectRot', pointBackgroundColor: '#f97316', pointBorderColor: '#fff', pointBorderWidth: 2, yAxisID: 'y', order: 13 },
      showIndicators.prediction && predictionUpper.length > 0 && { label: "Prediction Upper", data: predictionUpper, borderColor: theme.predictionBorder, borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.3, yAxisID: 'y', fill: '+1', backgroundColor: theme.predictionFill, order: 14 },
      showIndicators.prediction && predictionLower.length > 0 && { label: "Prediction Lower", data: predictionLower, borderColor: theme.predictionBorder, borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.3, yAxisID: 'y', fill: false, order: 15 },
      showIndicators.prediction && predictionMid.length > 0 && { label: "Prediction", data: predictionMid, borderColor: prediction?.predicted_pct_change > 0 ? "#16a34a" : "#dc2626", borderWidth: 2, borderDash: [8, 4], pointRadius: 0, tension: 0.3, yAxisID: 'y', order: 16 },
      showIndicators.rsi && rsiData.length > 0 && { label: "RSI", data: rsiData, borderColor: theme.rsiColor, borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: 'rsi', order: 20 },
      showIndicators.macd && macdData.length > 0 && { label: "MACD", data: macdData, borderColor: theme.macdColor, borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: 'macd', order: 21 },
      showIndicators.macd && signalData.length > 0 && { label: "Signal", data: signalData, borderColor: theme.signalColor, borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: 'macd', order: 22 },
      showIndicators.macd && histogramData.length > 0 && { type: 'bar', label: "Histogram", data: histogramData, backgroundColor: histogramData.map(d => d.y > 0 ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)'), yAxisID: 'macd', barThickness: 3, order: 23 },
      showIndicators.volume && { type: 'bar', label: "Volume", data: volumeData, backgroundColor: theme.volumeColor, yAxisID: 'volume', barThickness: 2, order: 30 },
    ].filter(Boolean);

    // UPDATE SCALES
    chart.options.scales = {
      x: {
        type: "time",
        time: { 
          unit: activeTimeframe === '1d' ? 'hour' : 'minute',
          displayFormats: { minute: 'HH:mm', hour: 'MMM dd HH:mm' }
        },
        grid: { color: theme.grid },
        ticks: { color: theme.text },
      },
      ...(normalizeView ? {
        'y-percent': {
          type: 'linear',
          position: 'left',
          grid: { color: theme.grid },
          ticks: { 
            color: theme.text,
            callback: (value) => value.toFixed(2) + '%'
          },
        }
      } : {
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: theme.grid },
          ticks: { color: theme.text },
        }
      }),
      ...(showIndicators.rsi && rsiData.length > 0 ? {
        rsi: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: theme.text } }
      } : {}),
      ...(showIndicators.macd && macdData.length > 0 ? {
        macd: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: theme.text } }
      } : {}),
      ...(showIndicators.volume ? {
        volume: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: theme.text, callback: (v) => (v / 1000000).toFixed(1) + 'M' } }
      } : {}),
    };

    // SMOOTH UPDATE (no animation)
    chart.update('none');

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [prices, showIndicators, prediction, backtest, darkMode, activeTimeframe, compareData, normalizeView, symbol]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {['1m', '5m', '1h', '1d'].map(tf => (
          <button
            key={tf}
            onClick={() => setActiveTimeframe(tf)}
            className={`px-2 py-1 text-xs rounded transition-all ${
              activeTimeframe === tf
                ? 'bg-indigo-600 text-white shadow-lg'
                : darkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full rounded-xl"
        style={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff' }}
      />
    </div>
  );
}