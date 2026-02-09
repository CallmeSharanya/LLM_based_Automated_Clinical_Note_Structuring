import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentAPI } from '../services/api';

export default function HealthSummary() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [healthData, setHealthData] = useState({
        appointments: [],
    });

    // Editable fields with localStorage persistence
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadHealthData();
        // Load saved height/weight from localStorage
        const savedHeight = localStorage.getItem(`health_height_${user?.id || user?.email}`);
        const savedWeight = localStorage.getItem(`health_weight_${user?.id || user?.email}`);
        if (savedHeight) setHeight(savedHeight);
        if (savedWeight) setWeight(savedWeight);
    }, [user?.id, user?.email]);

    const loadHealthData = async () => {
        try {
            const patientEmail = user?.email || user?.id;
            if (!patientEmail) {
                setLoading(false);
                return;
            }

            // Fetch appointments
            const apptResponse = await appointmentAPI.getPatientAppointments(patientEmail);
            if (apptResponse.success) {
                setHealthData(prev => ({
                    ...prev,
                    appointments: apptResponse.appointments || []
                }));
            }
        } catch (error) {
            console.error('Failed to load health data:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveHeightWeight = () => {
        const key = user?.id || user?.email;
        if (height) localStorage.setItem(`health_height_${key}`, height);
        if (weight) localStorage.setItem(`health_weight_${key}`, weight);
        setIsEditing(false);
    };

    const healthMetrics = [
        {
            label: 'Blood Group',
            value: user?.blood_group || user?.bloodGroup || 'Not recorded',
            icon: '🩸',
            color: 'from-red-500 to-pink-500',
            source: 'signup'
        },
        {
            label: 'Age',
            value: user?.age ? `${user.age} years` : (user?.dob ? calculateAge(user.dob) : 'Not recorded'),
            icon: '🎂',
            color: 'from-blue-500 to-cyan-500',
            source: 'signup'
        },
        {
            label: 'Weight',
            value: weight ? `${weight} kg` : 'Not recorded',
            icon: '⚖️',
            color: 'from-green-500 to-emerald-500',
            editable: true
        },
        {
            label: 'Height',
            value: height ? `${height} cm` : 'Not recorded',
            icon: '📏',
            color: 'from-purple-500 to-indigo-500',
            editable: true
        },
    ];

    function calculateAge(dob) {
        if (!dob) return 'Not recorded';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} years`;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-500/25">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl ring-4 ring-white/30">
                        ❤️
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Health Summary</h1>
                        <p className="text-emerald-100">Your complete health profile at a glance</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    <span className="text-sm text-emerald-100">Last updated: Today</span>
                </div>
            </div>

            {/* Health Metrics */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Basic Health Metrics
                    </h2>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                            ✏️ Edit Height/Weight
                        </button>
                    ) : (
                        <button
                            onClick={saveHeightWeight}
                            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            💾 Save
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {healthMetrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center mb-4 shadow-lg`}>
                                <span className="text-xl">{metric.icon}</span>
                            </div>
                            <p className="text-sm text-gray-500 mb-1">{metric.label}</p>

                            {isEditing && metric.editable ? (
                                <input
                                    type="number"
                                    value={metric.label === 'Height' ? height : weight}
                                    onChange={(e) => metric.label === 'Height' ? setHeight(e.target.value) : setWeight(e.target.value)}
                                    placeholder={metric.label === 'Height' ? 'cm' : 'kg'}
                                    className="w-full text-xl font-bold text-gray-900 border-b-2 border-emerald-300 focus:border-emerald-500 outline-none bg-transparent"
                                />
                            ) : (
                                <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Allergies & Medications */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Allergies */}
                <section className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        Known Allergies
                    </h3>
                    <div className="space-y-2">
                        {(user?.allergies?.length > 0 ? user.allergies : ['None recorded']).map((allergy, idx) => (
                            <div
                                key={idx}
                                className={`px-4 py-2 rounded-xl ${allergy === 'None recorded' ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-700 border border-red-200'}`}
                            >
                                {allergy}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Medications */}
                <section className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">💊</span>
                        Current Medications
                    </h3>
                    <div className="space-y-2">
                        {(user?.current_medications?.length > 0 ? user.current_medications : ['None recorded']).map((med, idx) => (
                            <div
                                key={idx}
                                className={`px-4 py-2 rounded-xl ${med === 'None recorded' ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}
                            >
                                {med}
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Medical History Timeline */}
            <section>
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent Medical Activity
                </h2>
                <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
                    {healthData.appointments.length > 0 ? (
                        <div className="space-y-4">
                            {healthData.appointments.slice(0, 5).map((apt, idx) => (
                                <div key={apt.id || idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                        <span className="text-xl">📋</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{apt.doctor_name || 'Doctor Visit'}</p>
                                        <p className="text-sm text-gray-500">{apt.specialty} • {apt.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {apt.status || 'Scheduled'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📝</span>
                            </div>
                            <p className="text-gray-500">No recent medical activity</p>
                            <p className="text-sm text-gray-400 mt-1">Your appointment history will appear here</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Health Tips */}
            <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    Health Tips
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="font-medium text-gray-900 mb-1">Stay Hydrated</p>
                        <p className="text-sm text-gray-500">Drink at least 8 glasses of water daily</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="font-medium text-gray-900 mb-1">Regular Exercise</p>
                        <p className="text-sm text-gray-500">30 minutes of activity 5 days a week</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="font-medium text-gray-900 mb-1">Adequate Sleep</p>
                        <p className="text-sm text-gray-500">Aim for 7-9 hours of quality sleep</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

