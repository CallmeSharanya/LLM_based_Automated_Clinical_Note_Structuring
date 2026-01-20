import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';

export default function HospitalDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('week');

    // Stats
    const [stats, setStats] = useState({
        totalPatients: 1247,
        todayVisits: 86,
        activeDoctors: 24,
        emergencyCases: 5,
        avgWaitTime: '18 min',
        bedOccupancy: 78,
    });

    // Appointments
    const [allAppointments, setAllAppointments] = useState([]);

    // Doctor stats
    const [doctorStats, setDoctorStats] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, [dateRange]);

    const loadDashboardData = async () => {
        try {
            // In production, fetch from backend
            // Demo data
            setAllAppointments([
                { id: 1, patient: 'John Doe', doctor: 'Dr. Priya Sharma', specialty: 'Cardiology', time: '09:00', status: 'completed' },
                { id: 2, patient: 'Sarah Smith', doctor: 'Dr. Ananya Patel', specialty: 'General Medicine', time: '09:30', status: 'in-progress' },
                { id: 3, patient: 'Raj Kumar', doctor: 'Dr. Mohammed Ali', specialty: 'Pulmonology', time: '10:00', status: 'waiting' },
                { id: 4, patient: 'Priya Menon', doctor: 'Dr. Rajesh Kumar', specialty: 'Orthopedics', time: '10:30', status: 'scheduled' },
                { id: 5, patient: 'Amit Patel', doctor: 'Dr. Sneha Reddy', specialty: 'Neurology', time: '11:00', status: 'scheduled' },
                { id: 6, patient: 'Deepa Singh', doctor: 'Dr. Priya Sharma', specialty: 'Cardiology', time: '11:30', status: 'scheduled' },
                { id: 7, patient: 'Vikram Rao', doctor: 'Dr. Ananya Patel', specialty: 'General Medicine', time: '14:00', status: 'scheduled' },
                { id: 8, patient: 'Meera Nair', doctor: 'Dr. Mohammed Ali', specialty: 'Pulmonology', time: '14:30', status: 'scheduled' },
            ]);

            setDoctorStats([
                { name: 'Dr. Priya Sharma', specialty: 'Cardiology', patientsToday: 12, completed: 8, rating: 4.8, status: 'online' },
                { name: 'Dr. Ananya Patel', specialty: 'General Medicine', patientsToday: 15, completed: 10, rating: 4.7, status: 'online' },
                { name: 'Dr. Mohammed Ali', specialty: 'Pulmonology', patientsToday: 10, completed: 6, rating: 4.9, status: 'online' },
                { name: 'Dr. Rajesh Kumar', specialty: 'Orthopedics', patientsToday: 8, completed: 5, rating: 4.6, status: 'busy' },
                { name: 'Dr. Sneha Reddy', specialty: 'Neurology', patientsToday: 9, completed: 7, rating: 4.7, status: 'offline' },
            ]);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
            'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
            waiting: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
            scheduled: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
        };
        return badges[status] || badges.scheduled;
    };

    const getDoctorStatusColor = (status) => {
        return status === 'online' ? 'bg-green-500' : status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                                🏥
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">
                                    {user?.hospital_name || 'City General Hospital'}
                                </h1>
                                <p className="text-sm text-white/80">
                                    Hospital Administration Dashboard
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none"
                            >
                                <option value="today" className="text-gray-900">Today</option>
                                <option value="week" className="text-gray-900">This Week</option>
                                <option value="month" className="text-gray-900">This Month</option>
                            </select>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Total Patients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalPatients.toLocaleString()}</p>
                        <p className="text-xs text-green-600">+12% this month</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Today's Visits</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.todayVisits}</p>
                        <p className="text-xs text-gray-500">32 completed</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Active Doctors</p>
                        <p className="text-2xl font-bold text-green-600">{stats.activeDoctors}</p>
                        <p className="text-xs text-gray-500">of 35 total</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Emergency Cases</p>
                        <p className="text-2xl font-bold text-red-600">{stats.emergencyCases}</p>
                        <p className="text-xs text-red-500">2 critical</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Avg Wait Time</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.avgWaitTime}</p>
                        <p className="text-xs text-green-600">-5 min vs yesterday</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Bed Occupancy</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.bedOccupancy}%</p>
                        <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.bedOccupancy}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['overview', 'appointments', 'doctors', 'analytics'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${activeTab === tab
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Live Activity Feed */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Live Activity</h2>
                                <span className="flex items-center gap-1 text-sm text-green-600">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Live
                                </span>
                            </div>
                            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                {[
                                    { time: '10:32 AM', event: 'Patient Sarah Smith checked in', type: 'checkin', icon: '✅' },
                                    { time: '10:28 AM', event: 'Dr. Priya Sharma completed consultation with John Doe', type: 'complete', icon: '👨‍⚕️' },
                                    { time: '10:25 AM', event: 'New appointment booked: Amit Patel → Dr. Sneha Reddy', type: 'booking', icon: '📅' },
                                    { time: '10:20 AM', event: 'Lab results ready for Raj Kumar', type: 'lab', icon: '🔬' },
                                    { time: '10:15 AM', event: 'Emergency patient admitted: Chest pain', type: 'emergency', icon: '🚨' },
                                    { time: '10:10 AM', event: 'Prescription sent to pharmacy for Meera Nair', type: 'prescription', icon: '💊' },
                                    { time: '10:05 AM', event: 'Dr. Mohammed Ali started consultation', type: 'start', icon: '▶️' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                        <span className="text-xl">{item.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">{item.event}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Department Stats */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="p-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-900">Department Load</h2>
                            </div>
                            <div className="p-4 space-y-4">
                                {[
                                    { name: 'General Medicine', load: 85, color: 'bg-blue-500' },
                                    { name: 'Cardiology', load: 72, color: 'bg-red-500' },
                                    { name: 'Orthopedics', load: 65, color: 'bg-green-500' },
                                    { name: 'Pulmonology', load: 58, color: 'bg-purple-500' },
                                    { name: 'Neurology', load: 45, color: 'bg-yellow-500' },
                                    { name: 'Emergency', load: 90, color: 'bg-pink-500' },
                                ].map((dept) => (
                                    <div key={dept.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-700">{dept.name}</span>
                                            <span className="font-medium text-gray-900">{dept.load}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${dept.color} transition-all`}
                                                style={{ width: `${dept.load}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">All Appointments Today</h2>
                            <div className="flex gap-2">
                                {['all', 'scheduled', 'in-progress', 'completed'].map((filter) => (
                                    <button
                                        key={filter}
                                        className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 capitalize"
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allAppointments.map((apt) => {
                                        const badge = getStatusBadge(apt.status);
                                        return (
                                            <tr key={apt.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{apt.time}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{apt.patient}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{apt.doctor}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{apt.specialty}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                                        {apt.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Doctors Tab */}
                {activeTab === 'doctors' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doctorStats.map((doc, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                                            {doc.name.split(' ')[1]?.charAt(0) || 'D'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                                            <p className="text-sm text-gray-500">{doc.specialty}</p>
                                        </div>
                                    </div>
                                    <span className={`w-3 h-3 rounded-full ${getDoctorStatusColor(doc.status)}`}></span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xl font-bold text-gray-900">{doc.patientsToday}</p>
                                        <p className="text-xs text-gray-500">Today</p>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-green-600">{doc.completed}</p>
                                        <p className="text-xs text-gray-500">Completed</p>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-yellow-600">⭐ {doc.rating}</p>
                                        <p className="text-xs text-gray-500">Rating</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Disease Trends */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Disease Trends (This Month)</h3>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Respiratory Infections', count: 156, change: '+12%', color: 'bg-blue-500' },
                                        { name: 'Cardiovascular', count: 142, change: '+8%', color: 'bg-red-500' },
                                        { name: 'Diabetes Management', count: 128, change: '+5%', color: 'bg-purple-500' },
                                        { name: 'Orthopedic Issues', count: 98, change: '-3%', color: 'bg-green-500' },
                                        { name: 'Mental Health', count: 87, change: '+15%', color: 'bg-yellow-500' },
                                    ].map((item) => (
                                        <div key={item.name} className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                            <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                                            <span className="font-medium text-gray-900">{item.count}</span>
                                            <span className={`text-xs ${item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.change}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Revenue */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Revenue Overview</h3>
                                <div className="text-center mb-6">
                                    <p className="text-3xl font-bold text-gray-900">₹24,56,000</p>
                                    <p className="text-sm text-green-600">+18% vs last month</p>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Consultations', amount: '₹12,40,000', percent: 50 },
                                        { name: 'Procedures', amount: '₹6,80,000', percent: 28 },
                                        { name: 'Lab & Diagnostics', amount: '₹3,20,000', percent: 13 },
                                        { name: 'Pharmacy', amount: '₹2,16,000', percent: 9 },
                                    ].map((item) => (
                                        <div key={item.name}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-700">{item.name}</span>
                                                <span className="font-medium text-gray-900">{item.amount}</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                    style={{ width: `${item.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ICD Codes Analytics */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Top ICD-10 Codes Distribution</h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { code: 'J06.9', desc: 'Upper respiratory infection', count: 89, color: 'border-blue-500' },
                                    { code: 'I10', desc: 'Essential hypertension', count: 76, color: 'border-red-500' },
                                    { code: 'E11.9', desc: 'Type 2 diabetes', count: 68, color: 'border-purple-500' },
                                    { code: 'M54.5', desc: 'Low back pain', count: 54, color: 'border-green-500' },
                                    { code: 'K21.0', desc: 'GERD with esophagitis', count: 45, color: 'border-yellow-500' },
                                    { code: 'F41.1', desc: 'Generalized anxiety', count: 42, color: 'border-pink-500' },
                                    { code: 'J18.9', desc: 'Pneumonia', count: 38, color: 'border-indigo-500' },
                                    { code: 'N39.0', desc: 'Urinary tract infection', count: 35, color: 'border-orange-500' },
                                ].map((icd) => (
                                    <div key={icd.code} className={`p-4 border-l-4 ${icd.color} bg-gray-50 rounded-r-lg`}>
                                        <p className="font-mono font-semibold text-gray-900">{icd.code}</p>
                                        <p className="text-sm text-gray-600 mb-2">{icd.desc}</p>
                                        <p className="text-lg font-bold text-gray-900">{icd.count} <span className="text-sm font-normal text-gray-500">cases</span></p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Patient Satisfaction */}
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                                <p className="text-sm text-white/80">Patient Satisfaction</p>
                                <p className="text-4xl font-bold mt-2">4.6/5</p>
                                <p className="text-sm text-white/80 mt-2">Based on 856 reviews</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
                                <p className="text-sm text-white/80">Avg Consultation Time</p>
                                <p className="text-4xl font-bold mt-2">22 min</p>
                                <p className="text-sm text-white/80 mt-2">-3 min vs last month</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                                <p className="text-sm text-white/80">AI SOAP Accuracy</p>
                                <p className="text-4xl font-bold mt-2">94.2%</p>
                                <p className="text-sm text-white/80 mt-2">Doctor approval rate</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
