import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ROLES } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';
import PatientSignup from './pages/PatientSignup';

// Patient Pages
import PatientHome from './pages/PatientHome';
import PatientIntake from './pages/PatientIntake';
import PatientPortal from './pages/PatientPortal';

// Doctor Pages
import DoctorDashboardNew from './pages/DoctorDashboardNew';
import DoctorDashboard from './pages/DoctorDashboard';

// Hospital Pages
import HospitalDashboard from './pages/HospitalDashboard';

// Shared/Admin Pages
import Layout from './components/Layout';
import ProcessNotes from './pages/ProcessNotes';
import Analytics from './pages/Analytics';
import ClinicalChat from './pages/ClinicalChat';
import LearningInsights from './pages/LearningInsights';

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } />
                <Route path="/signup/patient" element={
                    <PublicRoute>
                        <PatientSignup />
                    </PublicRoute>
                } />

                {/* Patient Routes */}
                <Route path="/patient/home" element={
                    <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
                        <PatientHome />
                    </ProtectedRoute>
                } />
                <Route path="/patient/intake" element={
                    <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
                        <PatientIntake />
                    </ProtectedRoute>
                } />
                <Route path="/patient/records" element={
                    <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
                        <PatientPortal />
                    </ProtectedRoute>
                } />

                {/* Doctor Routes */}
                <Route path="/doctor/dashboard" element={
                    <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
                        <DoctorDashboardNew />
                    </ProtectedRoute>
                } />
                <Route path="/doctor/patients" element={
                    <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
                        <DoctorDashboard />
                    </ProtectedRoute>
                } />

                {/* Hospital Routes */}
                <Route path="/hospital/dashboard" element={
                    <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>
                        <HospitalDashboard />
                    </ProtectedRoute>
                } />

                {/* Shared Routes (Doctor & Hospital) */}
                <Route path="/" element={
                    <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.HOSPITAL]}>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/login" replace />} />
                    <Route path="patient" element={<PatientPortal />} />
                    <Route path="doctor" element={<DoctorDashboard />} />
                    <Route path="process" element={<ProcessNotes />} />
                    <Route path="chat" element={<ClinicalChat />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="learning" element={<LearningInsights />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
