import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { encounterAPI, analyticsAPI, chatAPI, appointmentAPI } from '../services/api';

export default function DoctorDashboardNew() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('appointments');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    // Chat state
    const [chatQuery, setChatQuery] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        todayPatients: 0,
        pendingReviews: 0,
        completedToday: 0,
        upcomingWeek: 0,
    });

    useEffect(() => {
        loadAppointments();
    }, [user?.id]);

    const loadAppointments = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];

            // Fetch real appointments from Supabase for this doctor
            const response = await appointmentAPI.getDoctorAppointments(user.id, today);

            if (response.success && response.appointments) {
                const formattedAppointments = response.appointments.map(apt => ({
                    id: apt.id,
                    patient_name: apt.patient_name || 'Patient',
                    patient_email: apt.patient_email,
                    patient_phone: apt.patient_phone,
                    patient_age: apt.patient_age || '-',
                    patient_gender: apt.patient_gender || '-',
                    time: apt.time || 'TBD',
                    date: apt.date,
                    type: apt.type || 'Consultation',
                    status: apt.status || 'scheduled',
                    chief_complaint: apt.specialty || 'General Consultation',
                    triage_priority: 'green',
                }));

                setAppointments(formattedAppointments);

                // Update stats
                setStats({
                    todayPatients: formattedAppointments.length,
                    pendingReviews: formattedAppointments.filter(a => a.status === 'waiting').length,
                    completedToday: formattedAppointments.filter(a => a.status === 'completed').length,
                    upcomingWeek: formattedAppointments.length,
                });
            } else {
                setAppointments([]);
            }
        } catch (error) {
            console.error('Failed to load appointments:', error);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChatSubmit = async () => {
        if (!chatQuery.trim() || chatLoading) return;

        const userMessage = { role: 'user', content: chatQuery };
        setChatMessages(prev => [...prev, userMessage]);
        setChatQuery('');
        setChatLoading(true);

        try {
            const response = await chatAPI.query(chatQuery);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: response.answer,
            }]);
        } catch (error) {
            // Demo responses
            const demoResponses = {
                'disease': 'Based on recent clinical data, the most commonly reported conditions this month are:\n\n1. **Upper Respiratory Infections** (32 cases)\n2. **Type 2 Diabetes follow-ups** (28 cases)\n3. **Hypertension management** (25 cases)\n4. **Gastroenteritis** (18 cases)\n5. **Anxiety/Stress disorders** (15 cases)',
                'medication': 'Recent medication patterns for common conditions:\n\n**For Respiratory Infections:**\n- Amoxicillin 500mg TID (most common)\n- Azithromycin 500mg for 3 days\n\n**For Diabetes:**\n- Metformin 500-1000mg (first-line)\n- Glimepiride 1-2mg (add-on)\n\n**For Hypertension:**\n- Amlodipine 5mg OD\n- Telmisartan 40mg OD',
                'default': 'I can help you query clinical data. Try asking about:\n- Recent disease patterns\n- Common medications for conditions\n- Patient statistics\n- Treatment outcomes',
            };

            const key = chatQuery.toLowerCase().includes('disease') ? 'disease'
                : chatQuery.toLowerCase().includes('medication') ? 'medication'
                    : 'default';

            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: demoResponses[key],
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'in-progress': 'bg-blue-100 text-blue-700',
            'waiting': 'bg-yellow-100 text-yellow-700',
            'scheduled': 'bg-gray-100 text-gray-700',
            'completed': 'bg-green-100 text-green-700',
        };
        return badges[status] || badges.scheduled;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            red: 'bg-red-500',
            orange: 'bg-orange-500',
            yellow: 'bg-yellow-500',
            green: 'bg-green-500',
        };
        return colors[priority] || colors.green;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xl">
                                👨‍⚕️
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    {user?.name || 'Dr. Smith'}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {user?.specialty || 'General Medicine'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Today's Patients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.todayPatients}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Pending Reviews</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.pendingReviews}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">Completed Today</p>
                        <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500">This Week</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.upcomingWeek}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['appointments', 'chat', 'analytics'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${activeTab === tab
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {tab === 'chat' ? '💬 Clinical Chat' : tab === 'analytics' ? '📊 Analytics' : '📅 Appointments'}
                        </button>
                    ))}
                </div>

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Appointment List */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Loading...</div>
                            ) : (
                                <div className="space-y-3">
                                    {appointments.map((apt) => (
                                        <div
                                            key={apt.id}
                                            onClick={() => setSelectedAppointment(apt)}
                                            className={`bg-white rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all ${selectedAppointment?.id === apt.id
                                                ? 'border-green-500'
                                                : 'border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(apt.triage_priority)}`}></div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{apt.patient_name}</h3>
                                                        <p className="text-sm text-gray-500">
                                                            {apt.patient_age}y, {apt.patient_gender} • {apt.type}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {apt.chief_complaint}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-gray-900">{apt.time}</p>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getStatusBadge(apt.status)}`}>
                                                        {apt.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Patient Details Panel */}
                        <div className="lg:col-span-1">
                            {selectedAppointment ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-4">
                                    <div className="p-4 border-b border-gray-100">
                                        <h2 className="font-semibold text-gray-900">Patient Details</h2>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Patient</p>
                                            <p className="font-medium text-gray-900">{selectedAppointment.patient_name}</p>
                                            <p className="text-sm text-gray-600">
                                                {selectedAppointment.patient_age} years, {selectedAppointment.patient_gender}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Chief Complaint</p>
                                            <p className="text-gray-900">{selectedAppointment.chief_complaint}</p>
                                        </div>

                                        {selectedAppointment.preliminary_soap && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <p className="text-sm font-medium text-gray-700 mb-2">AI-Generated SOAP</p>
                                                {Object.entries(selectedAppointment.preliminary_soap).map(([key, value]) => (
                                                    <div key={key} className="mb-2">
                                                        <p className="text-xs font-medium text-gray-500">{key}</p>
                                                        <p className="text-sm text-gray-700">{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                            Start Consultation
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                                    <span className="text-4xl mb-4 block">👈</span>
                                    <p className="text-gray-500">Select a patient to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Clinical Data Assistant</h2>
                            <p className="text-sm text-gray-500">
                                Ask about diseases, medications, patient trends, and more
                            </p>
                        </div>

                        {/* Chat Messages */}
                        <div className="h-96 overflow-y-auto p-4 space-y-4">
                            {chatMessages.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <span className="text-4xl mb-4 block">💬</span>
                                    <p className="font-medium">Ask me anything about clinical data</p>
                                    <div className="mt-4 space-y-2">
                                        <button
                                            onClick={() => {
                                                setChatQuery('What diseases were recently reported?');
                                                handleChatSubmit();
                                            }}
                                            className="block mx-auto px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                                        >
                                            "What diseases were recently reported?"
                                        </button>
                                        <button
                                            onClick={() => setChatQuery('What medication is commonly given for diabetes?')}
                                            className="block mx-auto px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                                        >
                                            "What medication for diabetes?"
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                                }`}
                                        >
                                            <div className="whitespace-pre-wrap text-sm">
                                                {msg.content.split('**').map((part, i) =>
                                                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={chatQuery}
                                    onChange={(e) => setChatQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                                    placeholder="Ask about diseases, medications, trends..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    onClick={handleChatSubmit}
                                    disabled={chatLoading || !chatQuery.trim()}
                                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Disease Distribution */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Disease Distribution (This Month)</h3>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Respiratory Infections', count: 32, color: 'bg-blue-500' },
                                        { name: 'Diabetes', count: 28, color: 'bg-purple-500' },
                                        { name: 'Hypertension', count: 25, color: 'bg-red-500' },
                                        { name: 'Gastroenteritis', count: 18, color: 'bg-yellow-500' },
                                        { name: 'Anxiety Disorders', count: 15, color: 'bg-green-500' },
                                    ].map((item) => (
                                        <div key={item.name} className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                            <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                                            <span className="font-medium text-gray-900">{item.count}</span>
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${item.color}`}
                                                    style={{ width: `${(item.count / 32) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Patient Volume */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Weekly Patient Volume</h3>
                                <div className="flex items-end justify-between h-40 gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                        const heights = [60, 80, 70, 90, 85, 40, 20];
                                        return (
                                            <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                                <div
                                                    className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t"
                                                    style={{ height: `${heights[idx]}%` }}
                                                ></div>
                                                <span className="text-xs text-gray-500">{day}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent ICD Codes */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Top ICD-10 Codes</h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { code: 'J06.9', desc: 'Acute upper respiratory infection', count: 18 },
                                    { code: 'E11.9', desc: 'Type 2 diabetes mellitus', count: 15 },
                                    { code: 'I10', desc: 'Essential hypertension', count: 14 },
                                    { code: 'K52.9', desc: 'Noninfective gastroenteritis', count: 10 },
                                    { code: 'F41.1', desc: 'Generalized anxiety disorder', count: 8 },
                                    { code: 'M54.5', desc: 'Low back pain', count: 7 },
                                ].map((icd) => (
                                    <div key={icd.code} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono font-semibold text-green-600">{icd.code}</span>
                                            <span className="text-sm text-gray-500">{icd.count} cases</span>
                                        </div>
                                        <p className="text-sm text-gray-700">{icd.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
