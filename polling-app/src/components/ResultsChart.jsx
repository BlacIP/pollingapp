import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ResultsChart({ poll }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: poll.options.map(o=>o.text),
        datasets: [{ label: "Votes", data: poll.votes }]
      },
      options: { responsive: true, animation: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
    return () => chart.destroy();
  }, [poll]);
  return <canvas ref={ref} />;
}