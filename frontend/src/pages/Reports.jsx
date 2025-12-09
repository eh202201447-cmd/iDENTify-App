import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useApi from "../hooks/useApi";
import useAppStore from "../store/useAppStore";
import "../styles/pages/Reports.css";

function Reports() {
  const api = useApi();
  const reports = useAppStore((state) => state.reports);
  const { dailySummary, dentistPerformance } = reports || {};
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    // Convert to YYYY-MM-DD for backend
    const dateStr = selectedDate.toISOString().split('T')[0];
    api.loadReports(dateStr).catch(err => console.error("Load reports failed", err));
  }, [selectedDate]);

  const hasData = dailySummary && dentistPerformance;

  const exportToPDF = async () => {
    if (!hasData) return;
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    const dateStr = selectedDate.toLocaleDateString();

    doc.setFontSize(18);
    doc.text(`Clinic Report - ${dateStr}`, 14, 15);

    doc.setFontSize(14);
    doc.text("Daily Summary", 14, 25);

    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value']],
      body: [
        ['Patients Seen', dailySummary.patientsSeen],
        ['Procedures Done', dailySummary.proceduresDone],
        ['New Patients', dailySummary.newPatients],
        ['Avg. Treatment Duration', dailySummary.avgTreatmentDuration],
      ],
    });

    const finalY = (doc).lastAutoTable.finalY || 40;

    doc.text("Dentist Performance", 14, finalY + 15);

    const performanceBody = dentistPerformance.map(d => {
      const distributionStr = Object.entries(d.treatmentDistribution || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      return [
        d.name,
        d.patientsHandled,
        distributionStr || "None",
        `${Math.round(d.avgTimePerPatient || 0)} min`
      ];
    });

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Dentist', 'Patients', 'Procedures', 'Avg Time']],
      body: performanceBody,
    });

    doc.save(`clinic_report_${selectedDate.toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = async () => {
    if (!hasData) return;
    const XLSX = await import("xlsx");

    const summaryData = [
      { Metric: "Date", Value: selectedDate.toLocaleDateString() },
      { Metric: "Patients Seen", Value: dailySummary.patientsSeen },
      { Metric: "Procedures Done", Value: dailySummary.proceduresDone },
      { Metric: "New Patients", Value: dailySummary.newPatients },
      { Metric: "Avg Duration", Value: dailySummary.avgTreatmentDuration },
    ];
    const dailySummaryWs = XLSX.utils.json_to_sheet(summaryData);

    const performanceData = dentistPerformance.map(d => ({
      Dentist: d.name,
      Patients_Handled: d.patientsHandled,
      Avg_Time_Per_Patient: `${Math.round(d.avgTimePerPatient || 0)} min`,
      Treatment_Distribution: Object.entries(d.treatmentDistribution || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    }));

    const dentistPerformanceWs = XLSX.utils.json_to_sheet(performanceData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");
    XLSX.utils.book_append_sheet(wb, dentistPerformanceWs, "Dentist Performance");

    XLSX.writeFile(wb, `clinic_report_${selectedDate.toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="small-label">Select Date</span>
            <DatePicker
              selected={selectedDate}
              onChange={date => setSelectedDate(date)}
              className="datepicker-input"
              dateFormat="MMMM d, yyyy"
            />
          </div>
          <div className="export-buttons" style={{ marginTop: '1.5rem' }}>
            <button onClick={exportToPDF} className="export-btn pdf" disabled={!hasData}>
              Export PDF
            </button>
            <button onClick={exportToExcel} className="export-btn excel" disabled={!hasData}>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {api.loading && <p>Loading reports...</p>}

      {api.error && (
        <div className="error-message" style={{ color: 'red', padding: '1rem', background: '#ffe3e3', borderRadius: '8px' }}>
          <h3>Error loading reports</h3>
          <p>Ensure database schema is updated.</p>
        </div>
      )}

      {!api.loading && hasData && (
        <>
          <div className="report-section">
            <h3 className="report-subtitle">Daily Summary ({selectedDate.toLocaleDateString()})</h3>
            <table id="daily-summary-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Patients Seen (Done)</td>
                  <td>{dailySummary.patientsSeen}</td>
                </tr>
                <tr>
                  <td>Procedures Completed</td>
                  <td>{dailySummary.proceduresDone}</td>
                </tr>
                <tr>
                  <td>New Patients Registered Today</td>
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
                {dentistPerformance.length === 0 && (
                  <tr><td colSpan="4">No performance data recorded for this date.</td></tr>
                )}
                {dentistPerformance.map((dentist) => (
                  <tr key={dentist.id}>
                    <td>{dentist.name}</td>
                    <td>{dentist.patientsHandled}</td>
                    <td>
                      {Object.entries(dentist.treatmentDistribution || {})
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ") || "-"}
                    </td>
                    <td>{Math.round(dentist.avgTimePerPatient || 0)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;