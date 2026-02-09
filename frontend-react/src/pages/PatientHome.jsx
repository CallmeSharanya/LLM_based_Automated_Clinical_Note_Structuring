import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { intakeAPI, doctorAPI, encounterAPI, appointmentAPI } from '../services/api';

export default function PatientHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Refresh appointments when navigating to this page or after booking
    useEffect(() => {
        loadAppointments();
    }, [user?.id, refreshKey, location.key]);

    // Force refresh when coming from booking
    useEffect(() => {
        if (location.state?.refreshAppointments) {
            setRefreshKey(prev => prev + 1);
            // Clear the state to prevent repeated refreshes
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const loadAppointments = async () => {
        // Use email to fetch appointments (patient_id in table is email)
        const patientEmail = user?.email || user?.id;
        if (!patientEmail) {
            setLoading(false);
            return;
        }

        try {
            // Fetch real appointments from Supabase using email
            const response = await appointmentAPI.getPatientAppointments(patientEmail);

            if (response.success && response.appointments) {
                // Transform appointments for display
                const formattedAppointments = response.appointments.map(apt => ({
                    id: apt.id,
                    doctor_name: apt.doctor_name || 'Doctor',
                    specialty: apt.specialty || 'General Medicine',
                    date: apt.date,
                    time: apt.time?.split('-')[0] || apt.time, // Show start time only
                    status: apt.status || 'confirmed',
                    type: apt.type || 'Consultation',
                    consultation_fee: apt.consultation_fee
                }));
                setAppointments(formattedAppointments);
            } else {
                // No appointments found
                setAppointments([]);
            }
        } catch (error) {
            console.error('Failed to load appointments:', error);
            setAppointments([]);
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
            title: 'Upload Documents',
            icon: '📤',
            color: 'from-green-500 to-emerald-500',
            onClick: () => navigate('/patient/upload'),
        },
        {
            title: 'Emergency SOS',
            icon: '🚨',
            color: 'from-red-500 to-orange-500',
            onClick: handleEmergency,
        },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/25">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl ring-4 ring-white/30">
                        {user?.name?.charAt(0) || '👋'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">
                            Welcome back, {user?.name?.split(' ')[0] || 'Patient'}!
                        </h1>
                        <p className="text-blue-100 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            {user?.phone || 'Your health journey starts here'}
                        </p>
                    </div>
                </div>
            </div>
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
                                <p className="text-3xl font-bold">{user?.age ? `${user.age}` : '--'} <span className="text-lg font-normal">years</span></p>
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
                        {user?.current_medications?.length > 0 && (
                            <div className="mt-3 p-4 bg-blue-500/30 backdrop-blur-sm rounded-xl border border-blue-300/30 flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                <p className="font-medium">Medications: {user.current_medications.join(', ')}</p>
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
                    {appointments.length > 0 ? (
                        appointments.slice(0, 3).map((apt, idx) => (
                            <div key={apt.id || idx} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center text-emerald-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">Appointment booked</p>
                                    <p className="text-sm text-gray-500">{apt.doctor_name} - {apt.specialty} on {apt.date}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${apt.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {apt.status}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-slate-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-gray-500">No recent activity</p>
                            <p className="text-sm text-gray-400 mt-1">Book an appointment to get started</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
