import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ROLES } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Layouts
import PatientLayout from './components/PatientLayout';
import DoctorLayout from './components/DoctorLayout';
import HospitalLayout from './components/HospitalLayout';
import Layout from './components/Layout';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import PatientSignup from './pages/PatientSignup';

// Patient Pages
import PatientHome from './pages/PatientHome';
import PatientIntake from './pages/PatientIntake';
import PatientPortal from './pages/PatientPortal';
import PatientRecords from './pages/PatientRecords';
import PatientUpload from './pages/PatientUpload';
import HealthSummary from './pages/HealthSummary';

// Doctor Pages
import DoctorDashboardNew from './pages/DoctorDashboardNew';
import DoctorDashboard from './pages/DoctorDashboard';
import SOAPEditor from './pages/SOAPEditor';
import GeneralChatbot from './pages/GeneralChatbot';

// Hospital Pages
import HospitalDashboard from './pages/HospitalDashboard';

// Shared Pages
import ProcessNotes from './pages/ProcessNotes';
import Analytics from './pages/Analytics';
import ClinicalChat from './pages/ClinicalChat';
import LearningInsights from './pages/LearningInsights';

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
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

                {/* Patient Routes with Sidebar Layout */}
                <Route path="/patient" element={
                    <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
                        <PatientLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/patient/home" replace />} />
                    <Route path="home" element={<PatientHome />} />
                    <Route path="intake" element={<PatientIntake />} />
                    <Route path="records" element={<PatientRecords />} />
                    <Route path="upload" element={<PatientUpload />} />
                    <Route path="chat" element={<GeneralChatbot userType="patient" />} />
                    <Route path="health" element={<HealthSummary />} />
                    <Route path="profile" element={<PatientHome />} />
                    <Route path="settings" element={<PatientHome />} />
                </Route>

                {/* Doctor Routes with Sidebar Layout */}
                <Route path="/doctor" element={
                    <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
                        <DoctorLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/doctor/dashboard" replace />} />
                    <Route path="dashboard" element={<DoctorDashboardNew />} />
                    <Route path="patients" element={<DoctorDashboard />} />
                    <Route path="soap-editor" element={<SOAPEditor />} />
                    <Route path="upload" element={<SOAPEditor />} />
                    <Route path="chat" element={<GeneralChatbot userType="doctor" />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="profile" element={<DoctorDashboardNew />} />
                    <Route path="settings" element={<DoctorDashboardNew />} />
                </Route>

                {/* Hospital Routes with Sidebar Layout */}
                <Route path="/hospital" element={
                    <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>
                        <HospitalLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/hospital/dashboard" replace />} />
                    <Route path="dashboard" element={<HospitalDashboard />} />
                    <Route path="appointments" element={<HospitalDashboard />} />
                    <Route path="doctors" element={<HospitalDashboard />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="disease-stats" element={<HospitalDashboard />} />
                    <Route path="chat" element={<GeneralChatbot userType="hospital" />} />
                    <Route path="profile" element={<HospitalDashboard />} />
                    <Route path="settings" element={<HospitalDashboard />} />
                </Route>

                {/* Legacy Shared Routes (Doctor & Hospital) */}
                <Route path="/shared" element={
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
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
