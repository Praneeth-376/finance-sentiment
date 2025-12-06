import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function SentimentHistoryChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500">No sentiment history yet.</div>;
  }

  const labels = data.map(item => new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}));
  const values = data.map(item => item.sentiment);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Sentiment",
        data: values,
        borderWidth: 2,
        tension: 0.25,
        fill: true,
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderColor: 'rgb(59,130,246)'
      }
    ]
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 mb-3">Sentiment Trend</h3>
      <div className="h-48">
        <Line data={chartData} />
      </div>
    </div>
  );
}
