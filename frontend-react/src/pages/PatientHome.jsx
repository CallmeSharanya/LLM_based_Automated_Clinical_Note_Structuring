import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { intakeAPI, doctorAPI, encounterAPI } from '../services/api';

export default function PatientHome() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            // In production, fetch from backend
            // For demo, use mock data
            setAppointments([
                {
                    id: 1,
                    doctor_name: 'Dr. Priya Sharma',
                    specialty: 'Cardiology',
                    date: '2026-01-22',
                    time: '10:00 AM',
                    status: 'confirmed',
                    type: 'Follow-up',
                },
                {
                    id: 2,
                    doctor_name: 'Dr. Ananya Patel',
                    specialty: 'General Medicine',
                    date: '2026-01-25',
                    time: '02:30 PM',
                    status: 'pending',
                    type: 'Consultation',
                },
            ]);
        } catch (error) {
            console.error('Failed to load appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartIntake = () => {
        navigate('/patient/intake');
    };

    const handleEmergency = () => {
        // Show emergency options
        if (confirm('🚨 EMERGENCY\n\nCall Ambulance (108)?')) {
            window.location.href = 'tel:108';
        }
    };

    const quickActions = [
        {
            title: 'Book Appointment',
            icon: '📅',
            color: 'from-blue-500 to-cyan-500',
            onClick: handleStartIntake,
        },
        {
            title: 'View Records',
            icon: '📋',
            color: 'from-purple-500 to-pink-500',
            onClick: () => navigate('/patient/records'),
        },
        {
            title: 'Chat with Doctor',
            icon: '💬',
            color: 'from-green-500 to-emerald-500',
            onClick: () => navigate('/patient/chat'),
        },
        {
            title: 'Emergency SOS',
            icon: '🚨',
            color: 'from-red-500 to-orange-500',
            onClick: handleEmergency,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
            {/* Premium Header */}
            <header className="bg-white/80 backdrop-blur-2xl border-b border-gray-100 sticky top-0 z-50 shadow-soft">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/30 ring-4 ring-white">
                                {user?.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                    Welcome back, {user?.name?.split(' ')[0] || 'Patient'}
                                </h1>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                    {user?.phone || 'Manage your health journey'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {/* Quick Actions */}
                <section className="mb-10">
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {quickActions.map((action, idx) => (
                            <button
                                key={action.title}
                                onClick={action.onClick}
                                className="p-6 bg-white rounded-3xl shadow-soft hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1"
                                style={{ animationDelay: `${idx * 0.1}s` }}
                            >
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg ring-4 ring-white`}>
                                    <span className="text-3xl">{action.icon}</span>
                                </div>
                                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{action.title}</h3>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Health Summary Card */}
                <section className="mb-10">
                    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/25 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold">Your Health Summary</h2>
                            </div>
                            <div className="grid md:grid-cols-3 gap-5">
                                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                                    <p className="text-sm text-white/70 mb-1">Blood Group</p>
                                    <p className="text-3xl font-bold">{user?.blood_group || 'O+'}</p>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                                    <p className="text-sm text-white/70 mb-1">Age</p>
                                    <p className="text-3xl font-bold">{user?.age || 35} <span className="text-lg font-normal">years</span></p>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                                    <p className="text-sm text-white/70 mb-1">Upcoming Appointments</p>
                                    <p className="text-3xl font-bold">{appointments.length}</p>
                                </div>
                            </div>
                            {user?.allergies?.length > 0 && (
                                <div className="mt-5 p-4 bg-red-500/30 backdrop-blur-sm rounded-xl border border-red-300/30 flex items-center gap-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="font-medium">Allergies: {user.allergies.join(', ')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Upcoming Appointments */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Upcoming Appointments
                        </h2>
                        <button
                            onClick={handleStartIntake}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1.5 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Book New
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                            Loading appointments...
                        </div>
                    ) : appointments.length > 0 ? (
                        <div className="space-y-4">
                            {appointments.map((apt, idx) => (
                                <div
                                    key={apt.id}
                                    className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-xl transition-all duration-300 border border-gray-100 flex items-center justify-between hover:-translate-y-0.5"
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner ring-4 ring-white">
                                            <span className="text-3xl">👨‍⚕️</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{apt.doctor_name}</h3>
                                            <p className="text-gray-500 flex items-center gap-2">
                                                <span className="text-indigo-600 font-medium">{apt.specialty}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{apt.type}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 text-lg">{apt.date}</p>
                                        <p className="text-gray-500">{apt.time}</p>
                                        <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 text-xs font-semibold rounded-full ${apt.status === 'confirmed'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${apt.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                            {apt.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-soft">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                                <span className="text-4xl">📅</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-2">No upcoming appointments</h3>
                            <p className="text-gray-500 mb-6">Book an appointment to get started with your care</p>
                            <button
                                onClick={handleStartIntake}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300"
                            >
                                Book Appointment
                            </button>
                        </div>
                    )}
                </section>

                {/* Recent Activity */}
                <section>
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Activity
                    </h2>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-soft divide-y divide-gray-100 overflow-hidden">
                        <div className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center text-emerald-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900">Prescription filled</p>
                                <p className="text-sm text-gray-500">Metformin 500mg - Jan 18, 2026</p>
                            </div>
                            <span className="text-xs text-gray-400">2 days ago</span>
                        </div>
                        <div className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900">Lab results available</p>
                                <p className="text-sm text-gray-500">Complete Blood Count - Jan 15, 2026</p>
                            </div>
                            <span className="text-xs text-gray-400">5 days ago</span>
                        </div>
                        <div className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-purple-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900">Doctor message</p>
                                <p className="text-sm text-gray-500">Dr. Sharma sent you a message - Jan 12, 2026</p>
                            </div>
                            <span className="text-xs text-gray-400">8 days ago</span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
