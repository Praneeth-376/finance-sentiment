import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/portfolio/history");
      setTrades(res.data);
      setLoading(false);
    } catch (err) {
      console.error("History fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Trade History</h1>

      {loading ? (
        <p className="text-slate-300">Loading trades...</p>
      ) : trades.length === 0 ? (
        <p className="text-slate-400">No trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700">
                <th className="p-3">Type</th>
                <th className="p-3">Symbol</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Price</th>
                <th className="p-3">Total</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {trades.map((t) => (
                <tr key={t._id} className="border-b border-slate-700">
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        t.type === "BUY"
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>

                  <td className="p-3">{t.symbol}</td>

                  <td className="p-3">{t.quantity}</td>

                  <td className="p-3">${t.price.toFixed(2)}</td>

                  <td className="p-3 font-semibold">
                    ${(t.quantity * t.price).toFixed(2)}
                  </td>

                  <td className="p-3">
                    {new Date(t.date).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
