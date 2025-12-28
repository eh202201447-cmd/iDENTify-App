import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/pages/History.css";
import StatusBadge from "../components/StatusBadge";
import ConfirmationModal from "../components/ConfirmationModal";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";

function History() {
    const navigate = useNavigate();
    const api = useApi();
    const queue = useAppStore((state) => state.queue);
    const patients = useAppStore((state) => state.patients);
    const dentists = useAppStore((state) => state.dentists);
    const appointments = useAppStore((state) => state.appointments);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // --- PAGINATION STATES ---
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([
                    api.loadQueue(),
                    api.loadDentists(),
                    api.loadPatients(),
                    api.loadAppointments()
                ]);
            } catch (e) {
                console.error("Failed to load history data", e);
            }
        };
        loadData();
    }, []);

    // Filter, Map, and SORT "Done" items
    const historyList = useMemo(
        () =>
            queue
                .filter((item) => item.status === "Done")
                .map((item, index) => {
                    // [FIX] Use String() for safe ID comparison
                    const patient = patients.find((p) => String(p.id) === String(item.patient_id));
                    const patientName = patient ? (patient.full_name || patient.name) : (item.full_name || "Unknown");

                    const dentist = dentists.find((d) => String(d.id) === String(item.dentist_id));
                    const dentistName = dentist ? dentist.name : (item.dentist_name || "Unassigned");

                    // Resolve Procedure/Reason
                    let procedureInfo = item.notes || "-";
                    if (item.appointment_id) {
                        const linkedAppt = appointments.find(a => String(a.id) === String(item.appointment_id));
                        if (linkedAppt) {
                            // [FIX] Check both 'procedure' and 'reason' fields
                            procedureInfo = linkedAppt.procedure || linkedAppt.reason || item.notes || "-";
                        }
                    } else if (item.source === 'walk-in' && item.notes) {
                        procedureInfo = item.notes;
                    }

                    // Normalize date for sorting
                    const dateObj = new Date(item.time_added || item.checkedInTime || 0);

                    return {
                        ...item,
                        rawDate: dateObj,
                        name: patientName,
                        assignedDentist: dentistName,
                        procedureDisplay: procedureInfo
                    };
                })
                // SORT: Latest date first (Descending)
                .sort((a, b) => b.rawDate - a.rawDate)
                // Re-assign row numbers based on sorted order
                .map((item, i) => ({ ...item, number: i + 1 })),
        [queue, patients, dentists, appointments]
    );

    // --- PAGINATION LOGIC ---
    const indexOfLastItem = currentPage * rowsPerPage;
    const indexOfFirstItem = indexOfLastItem - rowsPerPage;
    const currentItems = historyList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(historyList.length / rowsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset to page 1
    };

    // -------------------------

    const handleUpdate = (queueItem) => {
        // [FIX] Use String() for safe ID comparison to ensure we find the patient object
        const fullPatientData = patients.find(p => String(p.id) === String(queueItem.patient_id));

        const appointmentPayload = {
            ...queueItem,
            dentist_id: queueItem.dentist_id,
            procedure: queueItem.procedureDisplay,
            timeStart: queueItem.time_added ? new Date(queueItem.time_added).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
        };

        navigate(`/app/patient/${queueItem.patient_id}/`, {
            state: {
                dentistId: queueItem.dentist_id,
                status: queueItem.status,
                patientData: fullPatientData, // This carries the Vitals to the next screen
                appointment: appointmentPayload
            }
        });
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.deleteQueue(itemToDelete.id);
            toast.success("Removed record from history");
        } catch (err) {
            console.error("Failed to delete history item", err);
            toast.error("Failed to delete");
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const formatDate = (dateObj) => {
        if (!dateObj) return "-";
        return dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="history-page">
            <div className="history-header">
                <h2 className="history-title">Patient History (Done)</h2>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                message={`Are you sure you want to delete the history record for ${itemToDelete?.name || 'this patient'}?`}
            />

            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date/Time Added</th>
                            <th>Patient</th>
                            <th>Status</th>
                            <th>Assigned Dentist</th>
                            <th>Procedure / Reason</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No history records found.</td></tr>
                        ) : (
                            currentItems.map((item) => (
                                <tr key={item.id} className="history-row">
                                    <td>{item.number}</td>
                                    <td>{formatDate(item.rawDate)}</td>
                                    <td>{item.name}</td>
                                    <td>
                                        <StatusBadge status="Done" />
                                    </td>
                                    <td>{item.assignedDentist}</td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: '#334155' }}>
                                            {item.procedureDisplay}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="action-btn update-btn"
                                            onClick={() => handleUpdate(item)}
                                        >
                                            View / Update
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => handleDeleteClick(item)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* --- PAGINATION CONTROLS --- */}
                {historyList.length > 0 && (
                    <div className="pagination-container">
                        <div className="rows-selector">
                            <span>Rows per page:</span>
                            <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="page-controls">
                            <button
                                className="page-btn"
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                Prev
                            </button>
                            <span className="page-info">
                                Page {currentPage} of {totalPages || 1}
                            </span>
                            <button
                                className="page-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default History;