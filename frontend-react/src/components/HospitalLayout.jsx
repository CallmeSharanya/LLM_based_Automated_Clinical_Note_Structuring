import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function HospitalLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
            <Sidebar userType="hospital" />

            {/* Main Content */}
            <main className="lg:pl-72 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
