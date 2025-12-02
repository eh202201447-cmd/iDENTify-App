import React from "react";
// Note: heavy libs (jsPDF, XLSX) are imported dynamically inside actions to keep the initial bundle small
import { dailySummary } from "../data/reportsData";
import { dentists } from "../data/dentists";
import "../styles/pages/Reports.css";

function Reports() {
  const dentistPerformance = dentists.map((dentist) => ({
    id: dentist.shortName,
    name: dentist.name,
    patientsHandled: Math.floor(Math.random() * 10) + 5,
    treatmentDistribution: {
      cleaning: Math.floor(Math.random() * 5) + 1,
      filling: Math.floor(Math.random() * 3),
      extraction: Math.floor(Math.random() * 2),
    },
    avgTimePerPatient: `${Math.floor(Math.random() * 15) + 25}min`,
  }));
  
  const exportToPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    autoTable(doc, {
      html: "#daily-summary-table",
    });

    const finalY = (doc).lastAutoTable.finalY || 10;

    autoTable(doc, {
      html: "#dentist-performance-table",
      startY: finalY + 10,
    });

    doc.save("reports.pdf");
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const dailySummaryWs = XLSX.utils.json_to_sheet([dailySummary]);
    const dentistPerformanceWs = XLSX.utils.json_to_sheet(dentistPerformance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");
    XLSX.utils.book_append_sheet(
      wb,
      dentistPerformanceWs,
      "Dentist Performance"
    );
    XLSX.writeFile(wb, "reports.xlsx");
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <div className="export-buttons">
          <button onClick={exportToPDF} className="export-btn pdf">
            Export to PDF
          </button>
          <button onClick={exportToExcel} className="export-btn excel">
            Export to Excel
          </button>
        </div>
      </div>

      <div className="report-section">
        <h3 className="report-subtitle">Daily Summary</h3>
        <table id="daily-summary-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Patients Seen</td>
              <td>{dailySummary.patientsSeen}</td>
            </tr>
            <tr>
              <td>Procedures Done</td>
              <td>{dailySummary.proceduresDone}</td>
            </tr>
            <tr>
              <td>New Patients</td>
              <td>{dailySummary.newPatients}</td>
            </tr>
            <tr>
              <td>Average Treatment Duration</td>
              <td>{dailySummary.avgTreatmentDuration}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="report-section">
        <h3 className="report-subtitle">Dentist Performance</h3>
        <table id="dentist-performance-table">
          <thead>
            <tr>
              <th>Dentist</th>
              <th>Patients Handled</th>
              <th>Treatment Distribution</th>
              <th>Avg. Time per Patient</th>
            </tr>
          </thead>
          <tbody>
            {dentistPerformance.map((dentist) => (
              <tr key={dentist.id}>
                <td>{dentist.name}</td>
                <td>{dentist.patientsHandled}</td>
                <td>
                  {Object.entries(dentist.treatmentDistribution)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ")}
                </td>
                <td>{dentist.avgTimePerPatient}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;