import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PatientPortal from './pages/PatientPortal';
import DoctorDashboard from './pages/DoctorDashboard';
import ProcessNotes from './pages/ProcessNotes';
import Analytics from './pages/Analytics';
import ClinicalChat from './pages/ClinicalChat';
import LearningInsights from './pages/LearningInsights';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/patient" replace />} />
                <Route path="patient" element={<PatientPortal />} />
                <Route path="doctor" element={<DoctorDashboard />} />
                <Route path="process" element={<ProcessNotes />} />
                <Route path="chat" element={<ClinicalChat />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="learning" element={<LearningInsights />} />
            </Route>
        </Routes>
    );
}

export default App;
