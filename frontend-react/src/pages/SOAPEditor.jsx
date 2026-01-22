import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PencilSquareIcon,
    CloudArrowUpIcon,
    SparklesIcon,
    ArrowPathIcon,
    PaperAirplaneIcon,
    UserCircleIcon,
    MicrophoneIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { soapAPI, encounterAPI, multimodalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MultimodalUpload from '../components/MultimodalUpload';
import VoiceInput from '../components/VoiceInput';

export default function SOAPEditor() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('conversation'); // conversation, upload, editor
    const [conversationMessages, setConversationMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showVoiceInput, setShowVoiceInput] = useState(false);

    // SOAP State
    const [draftSoap, setDraftSoap] = useState({
        Subjective: '',
        Objective: '',
        Assessment: '',
        Plan: ''
    });
    const [editedSoap, setEditedSoap] = useState(null);
    const [validation, setValidation] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [patientInfo, setPatientInfo] = useState(null);

    // Handle conversation input
    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        setConversationMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        }]);

        setIsLoading(true);
        try {
            // Simulate AI response for draft SOAP generation
            const response = await multimodalAPI.processConversation(userMessage, conversationMessages);

            setConversationMessages(prev => [...prev, {
                role: 'assistant',
                content: response.message || "I've noted your input. Continue describing the patient's condition.",
                timestamp: new Date()
            }]);

            // If we have enough context, generate draft SOAP
            if (response.draft_soap) {
                setDraftSoap(response.draft_soap);
                toast.success('Draft SOAP generated from conversation');
            }
        } catch (error) {
            toast.error('Failed to process message');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle voice input transcript
    const handleVoiceTranscript = (transcript) => {
        setInputValue(transcript);
    };

    // Handle voice input completion
    const handleVoiceFinalTranscript = async (transcript) => {
        if (transcript.trim()) {
            setInputValue(transcript);
            // Auto-send after voice input is complete
            setTimeout(() => {
                if (transcript.trim()) {
                    handleSendMessage();
                }
            }, 500);
        }
    };

    // Handle multimodal upload completion
    const handleUploadComplete = (result) => {
        if (result.draft_soap) {
            setDraftSoap(result.draft_soap);
            setActiveTab('editor');
            toast.success('Draft SOAP generated from uploaded documents');
        }
        if (result.patient_info) {
            setPatientInfo(result.patient_info);
        }
    };

    // Start editing the draft SOAP
    const startEditing = () => {
        setEditedSoap({ ...draftSoap });
        setActiveTab('editor');
    };

    // Handle SOAP field changes
    const handleSoapChange = (field, value) => {
        setEditedSoap(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Validate SOAP with dual validator agent
    const validateSoap = async () => {
        if (!editedSoap) return;

        setIsValidating(true);
        setValidation(null);

        try {
            const result = await soapAPI.validateSoap(editedSoap, null, null);
            setValidation(result);

            if (result.status === 'VALID') {
                toast.success('SOAP note validated successfully!');
            } else if (result.status === 'NEEDS_REVIEW') {
                toast.error('SOAP note needs corrections');
            } else {
                toast.error('Validation found some issues');
            }
        } catch (error) {
            toast.error('Validation failed');
            console.error(error);
        } finally {
            setIsValidating(false);
        }
    };

    // Auto-fix suggestions
    const applyAutoFix = async () => {
        if (!validation?.auto_corrections) return;

        setEditedSoap(prev => ({
            ...prev,
            ...validation.auto_corrections
        }));
        toast.success('Auto-corrections applied');
        setValidation(null);
    };

    // Finalize and save SOAP
    const finalizeSoap = async () => {
        if (!editedSoap) return;

        // Validate first if not already validated
        if (!validation || validation.status !== 'VALID') {
            toast.error('Please validate the SOAP note first');
            await validateSoap();
            return;
        }

        setIsFinalizing(true);
        try {
            const result = await encounterAPI.finalize(
                patientInfo?.encounter_id || `enc_${Date.now()}`,
                editedSoap,
                true // Generate patient summary
            );

            toast.success('SOAP note saved to database!');

            // Navigate back or show confirmation
            navigate('/doctor/patients');
        } catch (error) {
            toast.error('Failed to save SOAP note');
            console.error(error);
        } finally {
            setIsFinalizing(false);
        }
    };

    // Regenerate SOAP from conversation
    const regenerateSoap = async () => {
        if (conversationMessages.length === 0) {
            toast.error('No conversation to generate from');
            return;
        }

        setIsLoading(true);
        try {
            const response = await multimodalAPI.generateSOAP(conversationMessages);
            if (response.soap) {
                setDraftSoap(response.soap);
                setEditedSoap(response.soap);
                toast.success('SOAP regenerated successfully');
            }
        } catch (error) {
            toast.error('Failed to regenerate SOAP');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SOAP Note Editor</h1>
                    <p className="text-gray-600">Create and validate clinical documentation</p>
                </div>
                <div className="flex items-center gap-3">
                    {editedSoap && (
                        <>
                            <button
                                onClick={validateSoap}
                                disabled={isValidating}
                                className="btn-secondary flex items-center gap-2"
                            >
                                {isValidating ? (
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircleIcon className="w-5 h-5" />
                                )}
                                Validate
                            </button>
                            <button
                                onClick={finalizeSoap}
                                disabled={isFinalizing || !validation || validation.status !== 'VALID'}
                                className="btn-primary flex items-center gap-2"
                            >
                                {isFinalizing ? (
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                ) : (
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                )}
                                Save to Database
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {[
                    { id: 'conversation', label: 'Patient Conversation', icon: UserCircleIcon },
                    { id: 'upload', label: 'Upload Documents', icon: CloudArrowUpIcon },
                    { id: 'editor', label: 'SOAP Editor', icon: PencilSquareIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all',
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                                : 'text-gray-600 hover:bg-gray-100'
                        )}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conversation Tab */}
            {activeTab === 'conversation' && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Chat Interface */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-emerald-600" />
                                Patient Interview
                            </h3>
                            <p className="text-sm text-gray-600">
                                Describe the patient's condition to generate a draft SOAP
                            </p>
                        </div>

                        <div className="h-96 overflow-y-auto p-4 space-y-4">
                            {conversationMessages.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <UserCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>Start documenting the patient encounter</p>
                                    <p className="text-sm">Describe symptoms, observations, and findings</p>
                                </div>
                            )}

                            {conversationMessages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={clsx(
                                        'flex gap-3',
                                        msg.role === 'user' ? 'flex-row-reverse' : ''
                                    )}
                                >
                                    <div className={clsx(
                                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                        msg.role === 'user' ? 'bg-emerald-100' : 'bg-gray-100'
                                    )}>
                                        {msg.role === 'user' ? '👨‍⚕️' : '🤖'}
                                    </div>
                                    <div className={clsx(
                                        'max-w-[80%] rounded-2xl px-4 py-3',
                                        msg.role === 'user'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                    )}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        🤖
                                    </div>
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

                        <div className="p-4 border-t border-gray-100 space-y-3">
                            {/* Voice Input Toggle */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowVoiceInput(!showVoiceInput)}
                                    className={clsx(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                                        showVoiceInput
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700'
                                    )}
                                >
                                    <MicrophoneIcon className="w-4 h-4" />
                                    {showVoiceInput ? 'Hide Voice Input' : 'Use Voice Input'}
                                </button>
                                <span className="text-xs text-gray-400">
                                    Speak to document patient encounters
                                </span>
                            </div>

                            {/* Voice Input Component */}
                            {showVoiceInput && (
                                <VoiceInput
                                    onTranscript={handleVoiceTranscript}
                                    onFinalTranscript={handleVoiceFinalTranscript}
                                    disabled={isLoading}
                                />
                            )}

                            {/* Text Input */}
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Describe patient symptoms, vitals, observations..."
                                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isLoading}
                                    className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Draft SOAP Preview */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                                    Draft SOAP Note
                                </h3>
                                <p className="text-sm text-gray-600">Auto-generated from conversation</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={regenerateSoap}
                                    disabled={isLoading || conversationMessages.length === 0}
                                    className="btn-secondary text-sm"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    Regenerate
                                </button>
                                <button
                                    onClick={startEditing}
                                    disabled={!draftSoap.Subjective}
                                    className="btn-primary text-sm"
                                >
                                    Edit SOAP
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                            {['Subjective', 'Objective', 'Assessment', 'Plan'].map((section) => (
                                <div key={section} className="p-4 bg-gray-50 rounded-xl">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {section}
                                    </label>
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                                        {draftSoap[section] || (
                                            <span className="text-gray-400 italic">
                                                Continue the conversation to generate this section...
                                            </span>
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="max-w-3xl mx-auto">
                    <MultimodalUpload
                        onProcessingComplete={handleUploadComplete}
                        userType="doctor"
                        showSOAPPreview={true}
                    />
                </div>
            )}

            {/* Editor Tab */}
            {activeTab === 'editor' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* SOAP Editor */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <PencilSquareIcon className="w-5 h-5 text-blue-600" />
                                Edit SOAP Note
                            </h3>
                            <p className="text-sm text-gray-600">
                                Review and modify the generated content
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {['Subjective', 'Objective', 'Assessment', 'Plan'].map((section) => (
                                <div key={section}>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {section}
                                        {section === 'Subjective' && (
                                            <span className="text-xs font-normal text-gray-500 ml-2">
                                                (Chief complaint, history of present illness)
                                            </span>
                                        )}
                                        {section === 'Objective' && (
                                            <span className="text-xs font-normal text-gray-500 ml-2">
                                                (Vitals, physical exam, lab results)
                                            </span>
                                        )}
                                        {section === 'Assessment' && (
                                            <span className="text-xs font-normal text-gray-500 ml-2">
                                                (Diagnosis, clinical impression)
                                            </span>
                                        )}
                                        {section === 'Plan' && (
                                            <span className="text-xs font-normal text-gray-500 ml-2">
                                                (Treatment, medications, follow-up)
                                            </span>
                                        )}
                                    </label>
                                    <textarea
                                        value={editedSoap?.[section] || draftSoap[section] || ''}
                                        onChange={(e) => {
                                            if (!editedSoap) {
                                                setEditedSoap({ ...draftSoap });
                                            }
                                            handleSoapChange(section, e.target.value);
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 min-h-[100px] font-mono text-sm resize-y"
                                        placeholder={`Enter ${section.toLowerCase()} information...`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Validation Panel */}
                    <div className="space-y-4">
                        {/* Validation Status */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                Validation Status
                            </h3>

                            {!validation ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <ExclamationTriangleIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 mb-4">SOAP note not validated yet</p>
                                    <button
                                        onClick={validateSoap}
                                        disabled={isValidating || !editedSoap}
                                        className="btn-primary w-full"
                                    >
                                        {isValidating ? 'Validating...' : 'Validate Now'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Status Badge */}
                                    <div className={clsx(
                                        'p-4 rounded-xl text-center',
                                        validation.status === 'VALID' ? 'bg-green-50' : 'bg-yellow-50'
                                    )}>
                                        <span className="text-3xl mb-2 block">
                                            {validation.status_emoji || (validation.status === 'VALID' ? '✅' : '⚠️')}
                                        </span>
                                        <span className={clsx(
                                            'font-bold text-lg',
                                            validation.status === 'VALID' ? 'text-green-700' : 'text-yellow-700'
                                        )}>
                                            {validation.status}
                                        </span>
                                    </div>

                                    {/* Scores */}
                                    {validation.scores && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(validation.scores).map(([key, value]) => (
                                                <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                                                    <div className="text-xl font-bold text-blue-600">{value}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{key}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Issues */}
                                    {validation.issues?.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-gray-700">Issues</h4>
                                            {validation.issues.map((issue, i) => (
                                                <div
                                                    key={i}
                                                    className={clsx(
                                                        'p-3 rounded-lg text-sm',
                                                        issue.level === 'error'
                                                            ? 'bg-red-50 text-red-700'
                                                            : 'bg-yellow-50 text-yellow-700'
                                                    )}
                                                >
                                                    <span className="font-medium">[{issue.section}]</span> {issue.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Auto-fix button */}
                                    {validation.auto_corrections && (
                                        <button
                                            onClick={applyAutoFix}
                                            className="btn-secondary w-full"
                                        >
                                            <SparklesIcon className="w-5 h-5 mr-2" />
                                            Apply Auto-Corrections
                                        </button>
                                    )}

                                    {/* Re-validate */}
                                    <button
                                        onClick={validateSoap}
                                        disabled={isValidating}
                                        className="btn-secondary w-full"
                                    >
                                        {isValidating ? 'Validating...' : 'Re-validate'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Patient Info (if available) */}
                        {patientInfo && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                                <h3 className="font-semibold text-gray-900 mb-4">Patient Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Name</span>
                                        <span className="font-medium">{patientInfo.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Age</span>
                                        <span className="font-medium">{patientInfo.age || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Gender</span>
                                        <span className="font-medium">{patientInfo.gender || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
