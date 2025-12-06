import React, { useEffect, useRef } from "react";
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
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";

// REGISTER CHART COMPONENTS
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export default function BacktestChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || !data.candles) return;

    const ctx = canvasRef.current.getContext("2d");

    const prices = data.candles.map(c => ({
      x: new Date(c.date),
      y: c.close
    }));

    const buyPoints = data.buySignals?.map(s => ({
      x: new Date(s.x),
      y: s.y
    })) || [];

    const sellPoints = data.sellSignals?.map(s => ({
      x: new Date(s.x),
      y: s.y
    })) || [];

    // Destroy previous chart
    if (chartRef.current) chartRef.current.destroy();

    // New Chart
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Price",
            data: prices,
            borderColor: "#2563eb",
            borderWidth: 1.8,
            pointRadius: 0,
            fill: false,
            tension: 0.25,
          },

          {
            label: "BUY",
            data: buyPoints,
            pointRadius: 6,
            pointBackgroundColor: "#16a34a",
            showLine: false,
          },

          {
            label: "SELL",
            data: sellPoints,
            pointRadius: 6,
            pointBackgroundColor: "#dc2626",
            showLine: false,
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: "nearest",
          intersect: false,
        },

        scales: {
          x: {
            type: "time",
            time: { unit: "day" },
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280" },
          },
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280" },
          },
        },

        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              boxWidth: 8,
            },
          },

          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.label === "Price") {
                  return `Price: $${ctx.raw.y.toFixed(2)}`;
                }
                return `${ctx.dataset.label} @ $${ctx.raw.y.toFixed(2)}`;
              },
            },
          },

          zoom: {
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: "xy",
            },
            pan: {
              enabled: true,
              mode: "xy",
            },
          },
        },
      },
    });
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-xl bg-white"
    />
  );
}
