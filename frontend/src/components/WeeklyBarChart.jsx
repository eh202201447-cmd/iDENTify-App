import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import "../styles/components/WeeklyBarChart.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function WeeklyBarChart({ chartData = null }) {
  const labels = chartData?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const defaultCheckups = [5, 8, 3, 7, 6, 2, 4];
  const defaultAppointments = [3, 4, 2, 5, 4, 1, 2];

  const data = {
    labels,
    datasets: [
      {
        label: "Check-ups",
        data: chartData?.checkups || defaultCheckups,
        backgroundColor: "rgba(95, 142, 167, 0.85)",
        borderColor: "rgba(95, 142, 167, 1)",
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: "Appointments",
        data: chartData?.appointments || defaultAppointments,
        backgroundColor: "rgba(26, 58, 82, 0.7)",
        borderColor: "rgba(26, 58, 82, 0.9)",
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 14,
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 14,
          },
        },
      },
    },
  };

  return (
    <div className="weekly-chart-container">
      <Bar data={data} options={options} />
    </div>
  );
}

export default WeeklyBarChart;
