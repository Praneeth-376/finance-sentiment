import React from 'react';

export default function ArticlesList({ articles = [] }) {
  const sentimentClass = (s) => {
    if (s > 0.2) return 'text-emerald-600 bg-emerald-50';
    if (s < -0.2) return 'text-rose-600 bg-rose-50';
    return 'text-slate-600 bg-slate-100';
  };

  return (
    <div className="space-y-3">
      {articles.length === 0 && <div className="text-sm text-slate-500">No recent articles.</div>}
      <ul className="space-y-3">
        {articles.map((a, idx) => {
          const score = a.finbert_score?.compound ?? 0;
          return (
            <li key={idx} className="p-3 rounded-xl border border-slate-100 bg-white hover:shadow transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <a href={a.url} target="_blank" rel="noreferrer" className="font-medium text-slate-800 hover:underline">
                    {a.title || 'Untitled'}
                  </a>
                  <div className="text-xs text-slate-400 mt-1">
                    {a.source?.name || 'Unknown'} • {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : '—'}
                  </div>
                  <div className="text-sm text-slate-700 mt-2">{a.description || ''}</div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${sentimentClass(score)}`}>
                    {score.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 max-w-[120px] text-right">{a.author || ''}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
