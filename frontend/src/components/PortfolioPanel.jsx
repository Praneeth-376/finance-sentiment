import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PortfolioPanel({ socket, apiBase }) {
  const [portfolio, setPortfolio] = useState({ holdings: [] });
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState({ ticker: "AAPL", type: "BUY", quantity: 1, price: "" });

  useEffect(() => {
    fetchPortfolio();
    fetchTrades();

    if (socket) {
      socket.on("portfolio:update", (p) => {
        setPortfolio(p);
      });

      socket.on("live-price", (data) => {
        // update holdings when live prices come in
        setPortfolio(prev => {
          const copy = { ...prev, holdings: prev.holdings.map(h => {
            if (h.ticker === data.symbol || h.ticker === data.ticker || h.ticker === data.symbol) {
              const current = data.price ?? data.price;
              return {
                ...h,
                currentPrice: Number(current),
                pnl: (Number(current) - h.avgPrice) * h.quantity
              };
            }
            return h;
          })};
          return copy;
        });
      });
    }

    return () => {
      if (socket) {
        socket.off("portfolio:update");
        socket.off("live-price");
      }
    };
  }, [socket]);

  async function fetchPortfolio() {
    try {
      const res = await axios.get(`${apiBase}/api/portfolio`);
      setPortfolio(res.data);
    } catch (err) {
      console.error("fetch portfolio", err);
    }
  }

  async function fetchTrades() {
    try {
      const res = await axios.get(`${apiBase}/api/portfolio/trades`);
      setTrades(res.data);
    } catch (err) {
      console.error("fetch trades", err);
    }
  }

  async function submitTrade(e) {
    e.preventDefault();
    try {
      const price = Number(form.price) || undefined;
      const body = { ...form, ticker: form.ticker.toUpperCase(), price, quantity: Number(form.quantity) };
      const res = await axios.post(`${apiBase}/api/portfolio/trade`, body);
      setPortfolio(res.data.portfolio);
      setTrades(prev => [res.data.trade, ...prev]);
      setForm({ ...form, price: "" });
    } catch (err) {
      console.error("trade error", err);
      alert("Trade failed: " + (err.response?.data?.error || err.message));
    }
  }

  const totalInvested = portfolio.holdings.reduce((s, h) => s + (h.invested || (h.avgPrice*h.quantity)), 0);
  const currentValue = portfolio.holdings.reduce((s, h) => s + ((h.currentPrice || 0) * h.quantity), 0);
  const totalPnl = portfolio.holdings.reduce((s, h) => s + (h.pnl || ((h.currentPrice||0) - h.avgPrice) * h.quantity), 0);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Portfolio</h3>

      <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
        <div>Invested: ${totalInvested.toFixed(2)}</div>
        <div>Value: ${currentValue.toFixed(2)}</div>
        <div>P/L: <span className={totalPnl>=0?"text-emerald-600":"text-rose-600"}>${totalPnl.toFixed(2)}</span></div>
      </div>

      <div className="overflow-auto max-h-48 border rounded p-2 mb-3">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr><th>Ticker</th><th>Qty</th><th>Avg</th><th>Cur</th><th>P/L</th></tr>
          </thead>
          <tbody>
            {portfolio.holdings.map(h => (
              <tr key={h.ticker} className="border-t">
                <td className="py-2 font-medium">{h.ticker}</td>
                <td>{h.quantity}</td>
                <td>${Number(h.avgPrice).toFixed(2)}</td>
                <td>${Number(h.currentPrice || 0).toFixed(2)}</td>
                <td className={((h.pnl||0)>=0) ? "text-emerald-600" : "text-rose-600"}>
                  ${(h.pnl || ((h.currentPrice||0) - h.avgPrice) * h.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
            {portfolio.holdings.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-slate-500 text-center">No holdings yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={submitTrade} className="space-y-2">
        <div className="flex gap-2">
          <input className="w-28 px-2 py-1 border rounded" value={form.ticker} onChange={e=>setForm({...form,ticker:e.target.value})}/>
          <select className="px-2 py-1 border rounded" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <input className="w-20 px-2 py-1 border rounded" type="number" min="1" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
          <input className="w-28 px-2 py-1 border rounded" placeholder="price (optional)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
          <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded">Place</button>
        </div>
      </form>

      <h4 className="mt-4 text-sm font-medium">Recent Trades</h4>
      <div className="max-h-40 overflow-auto mt-2 text-xs">
        {trades.map(t => (
          <div key={t._id} className="flex justify-between py-1 border-b">
            <div>{t.type} {t.ticker} {t.quantity} @ ${Number(t.price).toFixed(2)}</div>
            <div className="text-slate-400">{new Date(t.time).toLocaleString()}</div>
          </div>
        ))}
        {trades.length === 0 && <div className="text-slate-500 py-2">No trades yet</div>}
      </div>
    </div>
  );
}
