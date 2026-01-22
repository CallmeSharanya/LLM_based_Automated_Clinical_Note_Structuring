import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DoctorLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
            <Sidebar userType="doctor" />

            {/* Main Content */}
            <main className="lg:pl-72 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
