import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function PatientLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
            <Sidebar userType="patient" />

            {/* Main Content */}
            <main className="lg:pl-72 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
