import React, { Suspense, lazy, useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import AppLayout from "./layout/AppLayout.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Appointments = lazy(() => import("./pages/Appointments.jsx"));
const Queue = lazy(() => import("./pages/Queue.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Dentists = lazy(() => import("./pages/Dentists.jsx"));
const PatientForm = lazy(() => import("./pages/PatientForm.jsx"));
const Patients = lazy(() => import("./pages/Patients.jsx"));

function ProtectedRoute({ isLoggedIn, children }) {
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const savedState = localStorage.getItem("isLoggedIn");
    return savedState || false;
  });

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("isLoggedIn", isLoggedIn);
    } else {
      localStorage.removeItem("isLoggedIn");
    }
  }, [isLoggedIn]);

  return (
    <Routes>
      <Route path="/" element={<Login setIsLoggedIn={setIsLoggedIn} />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AppLayout setIsLoggedIn={setIsLoggedIn} />
          </ProtectedRoute>
        }
      >
        {/* DEFAULT PAGE → DASHBOARD */}
        <Route index element={<Suspense fallback={<div>Loading…</div>}><Dashboard /></Suspense>} />

        {/* APP PAGES */}
        <Route path="appointments" element={<Suspense fallback={<div>Loading appointments…</div>}><Appointments /></Suspense>} />
        <Route path="queue" element={<Suspense fallback={<div>Loading queue…</div>}><Queue /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<div>Loading reports…</div>}><Reports /></Suspense>} />
        <Route path="dentists" element={<Suspense fallback={<div>Loading dentists…</div>}><Dentists /></Suspense>} />
        <Route path="patients" element={<Suspense fallback={<div>Loading patients…</div>}><Patients /></Suspense>} />

        <Route path="patient/:id" element={<Suspense fallback={<div>Loading patient…</div>}><PatientForm /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;