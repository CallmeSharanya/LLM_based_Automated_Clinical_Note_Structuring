import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    UserGroupIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    PencilSquareIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { intakeAPI, encounterAPI, summaryAPI, soapAPI, appointmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [activeTab, setActiveTab] = useState('queue'); // queue, encounter, summary
    const [editedSoap, setEditedSoap] = useState(null);
    const [validation, setValidation] = useState(null);
    const [patientSummary, setPatientSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load sessions and today's schedule on mount
    useEffect(() => {
        loadSessions();
        loadTodaySchedule();
    }, [user?.id]);

    const loadSessions = async () => {
        try {
            const response = await intakeAPI.listSessions();
            setSessions(response.sessions || []);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    const loadTodaySchedule = async () => {
        if (!user?.id) return;

        try {
            // Load all upcoming appointments (no date filter)
            const response = await appointmentAPI.getDoctorAppointments(user.id);

            if (response.success) {
                setTodaySchedule(response.appointments || []);
            }
        } catch (error) {
            console.error('Failed to load schedule:', error);
        }
    };

    const selectSession = async (session) => {
        setIsLoading(true);
        try {
            const details = await intakeAPI.getSession(session.session_id);
            setSelectedSession(details);

            // Initialize edited SOAP with preliminary SOAP
            if (details.preliminary_soap) {
                setEditedSoap({ ...details.preliminary_soap });
            }

            setActiveTab('encounter');
        } catch (error) {
            toast.error('Failed to load session details');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSoapChange = (section, value) => {
        setEditedSoap(prev => ({
            ...prev,
            [section]: value
        }));
    };

    const validateSoap = async () => {
        if (!editedSoap) return;

        setIsLoading(true);
        try {
            const soapForValidation =
            {
                Subjective: editedSoap.Subjective || editedSoap.subjective || '',
                Objective: editedSoap.Objective || editedSoap.objective || '',
                Assessment: editedSoap.Assessment || editedSoap.assessment || '',
                Plan: editedSoap.Plan || editedSoap.plan || ''
            };

            const result = await soapAPI.validateSoap(
                soapForValidation,
                selectedSession?.symptoms || [],
            );
            setValidation(result);

            if (result.status === 'VALID') {
                toast.success('SOAP note is valid!');
            } else {
                toast.error('SOAP note needs review');
            }
        } catch (error) {
            toast.error('Validation failed');
            console.log(error);
            console.log(error.response);
            console.log(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSoap = async () => {
        if (!editedSoap || !selectedSession) return;

        setIsLoading(true);
        try {
            await intakeAPI.updateSession(selectedSession.session_id, {
                preliminary_soap: editedSoap,
                final_soap: editedSoap
            });
            toast.success('SOAP note saved');
            await validateSoap();
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
            toast.error(`Failed to save SOAP: ${errorMsg}`);
            console.error('Save SOAP Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const generatePatientSummary = async () => {
        if (!editedSoap) return;

        setIsLoading(true);
        try {
            const result = await summaryAPI.generate(
                editedSoap,
                null,
                null,
                selectedSession?.patient_id || 'Patient',
                'Dr. Smith'
            );
            setPatientSummary(result);
            setActiveTab('summary');
            toast.success('Patient summary generated!');
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
            toast.error(`Failed to generate summary: ${errorMsg}`);
            console.error('Generate Summary Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getTriageBadge = (priority) => {
        const styles = {
            red: 'bg-red-100 text-red-700 border-red-200',
            orange: 'bg-orange-100 text-orange-700 border-orange-200',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            green: 'bg-green-100 text-green-700 border-green-200',
        };
        return styles[priority] || 'bg-gray-100 text-gray-700';
    };

    const renderQueue = () => (
        <div className="space-y-6">
            {/* Today's Schedule from Supabase */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Upcoming Appointments</h2>
                        <p className="text-gray-600">Your scheduled appointments</p>
                    </div>
                    <button onClick={loadTodaySchedule} className="btn-secondary text-sm">
                        Refresh
                    </button>
                </div>

                {todaySchedule.length === 0 ? (
                    <div className="card text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <ClockIcon className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No appointments today</h3>
                        <p className="text-gray-500">Your schedule is clear for today</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {todaySchedule.map((apt, index) => (
                            <motion.div
                                key={apt.id || index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="card bg-white border border-gray-200 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                            {apt.patient_name?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{apt.patient_name || 'Patient'}</h4>
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <span>{apt.specialty || 'Consultation'}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{apt.patient_email || apt.patient_phone}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-indigo-600 text-lg">{apt.time || 'TBD'}</p>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            {apt.status}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Patient Queue Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Patient Queue</h2>
                    <p className="text-gray-600">Patients waiting for consultation</p>
                </div>
                <button onClick={loadSessions} className="btn-secondary">
                    Refresh
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="card text-center py-12">
                    <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No patients in queue</h3>
                    <p className="text-gray-500">Patients will appear here after completing intake</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session, index) => (
                        <motion.div
                            key={session.session_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="card-hover cursor-pointer"
                            onClick={() => selectSession(session)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                        <UserGroupIcon className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">
                                            Patient {session.patient_id || session.session_id.slice(0, 8)}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <ClockIcon className="w-4 h-4" />
                                            {new Date(session.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {session.triage_priority && (
                                        <span className={clsx(
                                            'px-3 py-1 rounded-full text-sm font-medium border',
                                            getTriageBadge(session.triage_priority)
                                        )}>
                                            {session.triage_priority.toUpperCase()}
                                        </span>
                                    )}
                                    <span className={clsx(
                                        'badge',
                                        session.stage === 'complete' ? 'badge-green' : 'badge-yellow'
                                    )}>
                                        {session.stage}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderEncounter = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            setSelectedSession(null);
                            setActiveTab('queue');
                        }}
                        className="btn-secondary"
                    >
                        ← Back
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Patient Encounter</h2>
                        <p className="text-gray-600">
                            Session: {selectedSession?.session_id?.slice(0, 8)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={validateSoap} className="btn-secondary" disabled={isLoading}>
                        Validate
                    </button>
                    <button onClick={saveSoap} className="btn-secondary" disabled={isLoading}>
                        Save
                    </button>
                    <button onClick={generatePatientSummary} className="btn-primary" disabled={isLoading}>
                        Generate Summary
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Patient Info & Conversation */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Patient Info */}
                    <div className="card">
                        <h3 className="font-semibold text-gray-900 mb-4">Patient Information</h3>
                        <div className="space-y-3">
                            <div>
                                <span className="text-sm text-gray-500">Symptoms</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedSession?.symptoms?.map((symptom, i) => (
                                        <span key={i} className="badge-blue">{symptom}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500">Triage</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={clsx(
                                        'px-2 py-1 rounded text-sm font-medium',
                                        getTriageBadge(selectedSession?.triage_priority)
                                    )}>
                                        {selectedSession?.triage_priority?.toUpperCase()}
                                    </span>
                                    <span className="text-gray-600">Score: {selectedSession?.triage_score}/10</span>
                                </div>
                            </div>
                            {selectedSession?.allergies?.length > 0 && (
                                <div>
                                    <span className="text-sm text-gray-500">Allergies</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {selectedSession.allergies.map((allergy, i) => (
                                            <span key={i} className="badge-red">{allergy}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conversation History */}
                    <div className="card max-h-96 overflow-y-auto">
                        <h3 className="font-semibold text-gray-900 mb-4">Conversation History</h3>
                        <div className="space-y-3">
                            {selectedSession?.conversation_history?.map((msg, i) => (
                                <div
                                    key={i}
                                    className={clsx(
                                        'p-3 rounded-lg text-sm',
                                        msg.role === 'user'
                                            ? 'bg-primary-50 border-l-4 border-primary-500'
                                            : 'bg-gray-50 border-l-4 border-gray-300'
                                    )}
                                >
                                    <div className="font-medium text-xs text-gray-500 mb-1">
                                        {msg.role === 'user' ? 'Patient' : 'Assistant'}
                                    </div>
                                    <div className="text-gray-700 whitespace-pre-wrap">
                                        {msg.content?.slice(0, 200)}
                                        {msg.content?.length > 200 && '...'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: SOAP Editor & Validation */}
                <div className="lg:col-span-2 space-y-4">
                    {/* SOAP Editor */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5" />
                                SOAP Note
                            </h3>
                            <span className="text-sm text-gray-500">
                                {editedSoap?.is_preliminary && (
                                    <span className="badge-yellow">Preliminary</span>
                                )}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {['Subjective', 'Objective', 'Assessment', 'Plan'].map((section) => (
                                <div key={section}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {section}
                                    </label>
                                    <textarea
                                        value={editedSoap?.[section] || ''}
                                        onChange={(e) => handleSoapChange(section, e.target.value)}
                                        className="input-field min-h-[100px] font-mono text-sm"
                                        placeholder={`Enter ${section.toLowerCase()}...`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Validation Results */}
                    {validation && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Validation Results</h3>
                                <span className={clsx(
                                    'px-3 py-1 rounded-full text-sm font-medium',
                                    validation.status === 'VALID'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                )}>
                                    {validation.status_emoji} {validation.status}
                                </span>
                            </div>

                            {/* Scores */}
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                {Object.entries(validation.scores || {}).map(([key, value]) => (
                                    <div key={key} className="text-center">
                                        <div className="text-2xl font-bold text-primary-600">{value}</div>
                                        <div className="text-xs text-gray-500 capitalize">{key}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Issues */}
                            {validation.issues?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-gray-700">Issues</h4>
                                    {validation.issues.map((issue, i) => (
                                        <div
                                            key={i}
                                            className={clsx(
                                                'p-3 rounded-lg text-sm flex items-start gap-2',
                                                issue.level === 'error'
                                                    ? 'bg-red-50 text-red-700'
                                                    : 'bg-yellow-50 text-yellow-700'
                                            )}
                                        >
                                            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium">[{issue.section}]</span> {issue.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Suggestions */}
                            {validation.suggestions?.length > 0 && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions</h4>
                                    <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
                                        {validation.suggestions.map((suggestion, i) => (
                                            <li key={i}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderSummary = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveTab('encounter')}
                        className="btn-secondary"
                    >
                        ← Back to Encounter
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Patient Summary</h2>
                        <p className="text-gray-600">Patient-friendly documentation</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formatted Summary */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <EyeIcon className="w-5 h-5" />
                        Preview
                    </h3>
                    {patientSummary?.formatted_html && (
                        <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: patientSummary.formatted_html }}
                        />
                    )}
                </div>

                {/* Text Version */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5" />
                        Text Version
                    </h3>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                        {patientSummary?.formatted_text}
                    </pre>
                </div>
            </div>

            {/* Summary Data */}
            {patientSummary?.summary && (
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Summary Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">What We Found</h4>
                            <p className="text-gray-600">{patientSummary.summary.what_we_found}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Important Instructions</h4>
                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                {patientSummary.summary.important_instructions?.map((inst, i) => (
                                    <li key={i}>{inst}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Warning Signs</h4>
                            <div className="space-y-2">
                                {patientSummary.summary.warning_signs?.map((warning, i) => (
                                    <div key={i} className="p-2 bg-red-50 rounded text-sm text-red-700">
                                        🚨 {warning.symptom} → {warning.action}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Next Steps</h4>
                            <div className="text-gray-600">
                                <p>📅 Follow-up: {patientSummary.summary.next_steps?.follow_up}</p>
                                <p>📞 {patientSummary.summary.next_steps?.contact_info}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div>
            {activeTab === 'queue' && renderQueue()}
            {activeTab === 'encounter' && selectedSession && renderEncounter()}
            {activeTab === 'summary' && patientSummary && renderSummary()}
        </div>
    );
}
