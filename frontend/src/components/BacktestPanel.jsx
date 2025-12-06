import React, { useState } from "react";
import axios from "axios";
import BacktestChart from "./BacktestChart";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function BacktestPanel({ ticker }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runBacktest() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/backtest/${ticker}`);
      setData(res.data);
    } catch (e) {
      alert("Error running backtest");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Backtest — {ticker}</h2>
        <button
          onClick={runBacktest}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
        >
          {loading ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {!data && (
        <p className="text-slate-500 text-sm">Click the button to run backtest.</p>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <h3 className="text-sm text-slate-500">Final Equity</h3>
              <div className="text-xl font-bold">${data.equity.toFixed(2)}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border">
              <h3 className="text-sm text-slate-500">Win Rate</h3>
              <div className="text-xl font-bold">
                {data.winRate.toFixed(2)}%
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border">
              <h3 className="text-sm text-slate-500">Total Trades</h3>
              <div className="text-xl font-bold">{data.trades}</div>
            </div>
          </div>

          <BacktestChart candles={data.candles} buys={data.buys} sells={data.sells} />
        </div>
      )}
    </div>
  );
}
