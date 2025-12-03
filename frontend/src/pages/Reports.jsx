// import React, { useEffect } from "react";
// // Note: heavy libs (jsPDF, XLSX) are imported dynamically inside actions to keep the initial bundle small
// import useApi from "../hooks/useApi";
// import useAppStore from "../store/useAppStore";
// import "../styles/pages/Reports.css";

// function Reports() {
//   const api = useApi();
//   const reports = useAppStore((state) => state.reports);
//   const { dailySummary, dentistPerformance } = reports || {};

//   useEffect(() => {
//     api.loadReports();
//   }, []);

//   const exportToPDF = async () => {
//     const jsPDF = (await import("jspdf")).default;
//     const autoTable = (await import("jspdf-autotable")).default;

//     const doc = new jsPDF();

//     autoTable(doc, {
//       html: "#daily-summary-table",
//     });

//     const finalY = (doc).lastAutoTable.finalY || 10;

//     autoTable(doc, {
//       html: "#dentist-performance-table",
//       startY: finalY + 10,
//     });

//     doc.save("reports.pdf");
//   };

//   const exportToExcel = async () => {
//     if (!dailySummary || !dentistPerformance) {
//       return;
//     }
//     const XLSX = await import("xlsx");
//     const dailySummaryWs = XLSX.utils.json_to_sheet([dailySummary]);
//     const dentistPerformanceWs = XLSX.utils.json_to_sheet(dentistPerformance);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");
//     XLSX.utils.book_append_sheet(
//       wb,
//       dentistPerformanceWs,
//       "Dentist Performance"
//     );
//     XLSX.writeFile(wb, "reports.xlsx");
//   };

//   return (
//     <div className="reports-page">
//       <div className="reports-header">
//         <h2 className="reports-title">Reports</h2>
//         <div className="export-buttons">
//           <button onClick={exportToPDF} className="export-btn pdf" disabled={!reports}>
//             Export to PDF
//           </button>
//           <button onClick={exportToExcel} className="export-btn excel" disabled={!reports}>
//             Export to Excel
//           </button>
//         </div>
//       </div>

//       {api.loading && <p>Loading reports...</p>}
//       {api.error && <p>Error loading reports: {api.error.message}</p>}

//       {!api.loading && !api.error && reports && (
//         <>
//           <div className="report-section">
//             <h3 className="report-subtitle">Daily Summary</h3>
//             <table id="daily-summary-table">
//               <thead>
//                 <tr>
//                   <th>Metric</th>
//                   <th>Value</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 <tr>
//                   <td>Patients Seen</td>
//                   <td>{dailySummary?.patientsSeen}</td>
//                 </tr>
//                 <tr>
//                   <td>Procedures Done</td>
//                   <td>{dailySummary?.proceduresDone}</td>
//                 </tr>
//                 <tr>
//                   <td>New Patients</td>
//                   <td>{dailySummary?.newPatients}</td>
//                 </tr>
//                 <tr>
//                   <td>Average Treatment Duration</td>
//                   <td>{dailySummary?.avgTreatmentDuration}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="report-section">
//             <h3 className="report-subtitle">Dentist Performance</h3>
//             <table id="dentist-performance-table">
//               <thead>
//                 <tr>
//                   <th>Dentist</th>
//                   <th>Patients Handled</th>
//                   <th>Treatment Distribution</th>
//                   <th>Avg. Time per Patient (minutes)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {dentistPerformance?.map((dentist) => (
//                   <tr key={dentist.id}>
//                     <td>{dentist.name}</td>
//                     <td>{dentist.patientsHandled}</td>
//                     <td>
//                       {Object.entries(dentist.treatmentDistribution)
//                         .map(([key, value]) => `${key}: ${value}`)
//                         .join(", ")}
//                     </td>
//                     <td>{dentist.avgTimePerPatient}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// export default Reports;

import React, { useEffect } from "react";
import useApi from "../hooks/useApi";
import useAppStore from "../store/useAppStore";
import "../styles/pages/Reports.css";

function Reports() {
  const api = useApi();
  const reports = useAppStore((state) => state.reports);
  const { dailySummary, dentistPerformance } = reports || {};

  useEffect(() => {
    api.loadReports();
  }, []);

  const hasData = dailySummary && dentistPerformance && dentistPerformance.length > 0;

  const exportToPDF = async () => {
    if (!hasData) return;
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.text("Daily Summary", 14, 15);
    autoTable(doc, {
      html: "#daily-summary-table",
      startY: 20,
    });

    const finalY = (doc).lastAutoTable.finalY || 30;
    
    doc.text("Dentist Performance", 14, finalY + 15);
    autoTable(doc, {
      html: "#dentist-performance-table",
      startY: finalY + 20,
    });

    doc.save("clinic_report.pdf");
  };

  const exportToExcel = async () => {
    if (!hasData) return;
    const XLSX = await import("xlsx");

    // 1. Prepare Daily Summary Sheet
    const dailySummaryWs = XLSX.utils.json_to_sheet([dailySummary]);

    // 2. Prepare Dentist Performance Sheet (Flattening the nested object)
    const flattenedPerformance = dentistPerformance.map(d => ({
      ID: d.id,
      Dentist: d.name,
      Patients_Handled: d.patientsHandled,
      Avg_Time_Per_Patient: d.avgTimePerPatient,
      // Convert the object { "Cleaning": 2 } to string "Cleaning: 2"
      Treatment_Distribution: Object.entries(d.treatmentDistribution || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    }));

    const dentistPerformanceWs = XLSX.utils.json_to_sheet(flattenedPerformance);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");
    XLSX.utils.book_append_sheet(wb, dentistPerformanceWs, "Dentist Performance");
    XLSX.writeFile(wb, "clinic_report.xlsx");
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <div className="export-buttons">
          <button onClick={exportToPDF} className="export-btn pdf" disabled={!hasData}>
            Export to PDF
          </button>
          <button onClick={exportToExcel} className="export-btn excel" disabled={!hasData}>
            Export to Excel
          </button>
        </div>
      </div>

      {api.loading && <p>Loading reports...</p>}
      
      {api.error && (
        <div className="error-message" style={{ color: 'red', padding: '1rem', background: '#ffe3e3', borderRadius: '8px' }}>
          <h3>Error loading reports</h3>
          <p>The server encountered an error (500). Please ensure your database schema is updated.</p>
          <code style={{ display: 'block', marginTop: '10px' }}>{api.error.message}</code>
        </div>
      )}

      {!api.loading && !api.error && hasData && (
        <>
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
                  <td>{dailySummary?.patientsSeen}</td>
                </tr>
                <tr>
                  <td>Procedures Done</td>
                  <td>{dailySummary?.proceduresDone}</td>
                </tr>
                <tr>
                  <td>New Patients</td>
                  <td>{dailySummary?.newPatients}</td>
                </tr>
                <tr>
                  <td>Average Treatment Duration</td>
                  <td>{dailySummary?.avgTreatmentDuration}</td>
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
                  <th>Avg. Time per Patient (min)</th>
                </tr>
              </thead>
              <tbody>
                {dentistPerformance?.map((dentist) => (
                  <tr key={dentist.id}>
                    <td>{dentist.name}</td>
                    <td>{dentist.patientsHandled}</td>
                    <td>
                      {Object.entries(dentist.treatmentDistribution || {})
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ")}
                    </td>
                    <td>{Math.round(dentist.avgTimePerPatient || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      {!api.loading && !api.error && !hasData && (
        <p className="muted-text">No report data available for today.</p>
      )}
    </div>
  );
}

export default Reports;