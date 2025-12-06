import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Watchlist({ socket, apiBase, onSelectTicker }) {
  const [watch, setWatch] = useState({ tickers: [] });
  const [input, setInput] = useState("");

  useEffect(() => {
    fetchWatchlist();

    if (socket) {
      socket.on("live-price", (d) => {
        // optional: update small badges for prices
        setWatch(prev => {
          if (!prev.tickers.includes(d.symbol)) return prev;
          return { ...prev }; // you can expand to include live prices per ticker if needed
        });
      });
    }
    return () => socket?.off("live-price");
  }, []);

  async function fetchWatchlist() {
    try {
      const res = await axios.get(`${apiBase}/api/portfolio/watchlist`);
      setWatch(res.data);
    } catch (err) { console.error(err); }
  }

  async function save() {
    try {
      await axios.post(`${apiBase}/api/portfolio/watchlist`, { tickers: watch.tickers });
      alert("Watchlist saved");
    } catch (err) { console.error(err); alert("Save failed"); }
  }

  function addTicker() {
    const t = input.trim().toUpperCase();
    if (!t) return;
    setWatch(prev => ({ tickers: Array.from(new Set([t, ...prev.tickers])) }));
    setInput("");
  }

  function removeTicker(t) {
    setWatch(prev => ({ tickers: prev.tickers.filter(x => x!==t) }));
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Watchlist</h4>
        <button onClick={save} className="text-xs px-2 py-1 bg-slate-100 rounded">Save</button>
      </div>

      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 px-2 py-1 border rounded"/>
        <button onClick={addTicker} className="px-3 py-1 bg-indigo-600 text-white rounded">Add</button>
      </div>

      <div className="space-y-1">
        {watch.tickers.map(t => (
          <div key={t} className="flex justify-between items-center border rounded p-2">
            <div className="cursor-pointer font-medium" onClick={()=> onSelectTicker?.(t)}>{t}</div>
            <div className="flex gap-2">
              <button onClick={()=>removeTicker(t)} className="text-xs px-2 py-1 bg-rose-100 rounded">Remove</button>
            </div>
          </div>
        ))}
        {watch.tickers.length === 0 && <div className="text-slate-500">No tickers</div>}
      </div>
    </div>
  );
}
