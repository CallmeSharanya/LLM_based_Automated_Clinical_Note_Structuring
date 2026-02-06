import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { encounterAPI, appointmentAPI } from '../services/api';
import {
    DocumentTextIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    HeartIcon,
    BeakerIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function PatientRecords() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('visits');
    const [expandedVisit, setExpandedVisit] = useState(null);

    const [pastAppointments, setPastAppointments] = useState([]);
    const [medicalHistory, setMedicalHistory] = useState({
        conditions: [],
        allergies: [],
        medications: []
    });

    useEffect(() => {
        loadRecords();
    }, [user]);

    const loadRecords = async () => {
        setLoading(true);
        try {
            // Load past appointments
            const patientEmail = user?.email || user?.id;
            const response = await appointmentAPI.getPatientAppointments(patientEmail);

            if (response.success && response.appointments) {
                // Filter to show completed/past appointments
                const today = new Date().toISOString().split('T')[0];
                const past = response.appointments.filter(apt =>
                    apt.status === 'completed' || apt.date < today
                );
                setPastAppointments(past);
            }

            // Load medical history from user data (stored at root level, not nested)
            setMedicalHistory({
                conditions: user?.chronic_conditions || [],
                allergies: user?.allergies || [],
                medications: user?.current_medications || []
            });
        } catch (error) {
            console.error('Error loading records:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'visits', name: 'Past Visits', icon: CalendarDaysIcon },
        { id: 'conditions', name: 'Conditions', icon: HeartIcon },
        { id: 'medications', name: 'Medications', icon: BeakerIcon },
        { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
    ];

    const renderVisits = () => {
        const visits = pastAppointments;

        return (
            <div className="space-y-4">
                {visits.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <ClipboardDocumentListIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">No Past Visits</h3>
                        <p className="text-gray-400 mt-1">Your visit history will appear here</p>
                    </div>
                ) : (
                    visits.map((visit) => (
                        <div
                            key={visit.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div
                                className="p-4 cursor-pointer flex items-center justify-between"
                                onClick={() => setExpandedVisit(expandedVisit === visit.id ? null : visit.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                        <UserCircleIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{visit.doctor_name}</h3>
                                        <p className="text-sm text-gray-500">{visit.specialty}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-800">{visit.date}</p>
                                        {visit.diagnosis && (
                                            <p className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                {visit.diagnosis}
                                            </p>
                                        )}
                                    </div>
                                    {expandedVisit === visit.id ? (
                                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {expandedVisit === visit.id && (
                                <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                                    {visit.notes && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Doctor's Notes</h4>
                                            <p className="text-sm text-gray-600">{visit.notes}</p>
                                        </div>
                                    )}
                                    {visit.medications && visit.medications.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Prescribed Medications</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {visit.medications.map((med, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                                        {med}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        );
    };

    const renderConditions = () => {
        const conditions = medicalHistory.conditions.length > 0
            ? medicalHistory.conditions
            : ['No conditions recorded'];
        const allergies = medicalHistory.allergies.length > 0
            ? medicalHistory.allergies
            : ['No known allergies'];

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <HeartIcon className="w-5 h-5 text-red-500" />
                        Medical Conditions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {conditions.map((condition, idx) => (
                            <span key={idx} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                                {condition}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        Allergies
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {allergies.map((allergy, idx) => (
                            <span key={idx} className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                                {allergy}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderMedications = () => {
        const medications = medicalHistory.medications.length > 0
            ? medicalHistory.medications
            : [
                { name: 'No medications', dosage: '', frequency: '' }
            ];

        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Current Medications</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {medications.map((med, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <BeakerIcon className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">{med.name || med}</p>
                                    {med.dosage && <p className="text-sm text-gray-500">{med.dosage}</p>}
                                </div>
                            </div>
                            {med.frequency && (
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {med.frequency}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDocuments = () => {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Documents Uploaded</h3>
                <p className="text-gray-400 mt-1 mb-4">Upload your medical reports and documents</p>
                <button
                    onClick={() => navigate('/patient/upload')}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                >
                    Upload Documents
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">My Medical Records</h1>
                    <p className="text-gray-500 mt-1">View your health history, conditions, and documents</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'visits' && renderVisits()}
                        {activeTab === 'conditions' && renderConditions()}
                        {activeTab === 'medications' && renderMedications()}
                        {activeTab === 'documents' && renderDocuments()}
                    </>
                )}
            </div>
        </div>
    );
}
