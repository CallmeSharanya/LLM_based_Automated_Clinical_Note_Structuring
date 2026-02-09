import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    UserCircleIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { intakeAPI, doctorAPI } from '../services/api';

export default function PatientPortal() {
    const navigate = useNavigate();
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [triageResult, setTriageResult] = useState(null);
    const [doctorMatches, setDoctorMatches] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [stage, setStage] = useState('start'); // start, chat, triage, doctor-select, complete

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const startSession = async () => {
        setIsLoading(true);
        try {
            const response = await intakeAPI.startSession();
            setSessionId(response.session_id);
            setMessages([{
                role: 'assistant',
                content: response.message,
                timestamp: new Date()
            }]);
            setStage('chat');
        } catch (error) {
            toast.error('Failed to start session. Please try again.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        // Add user message to chat
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        }]);

        setIsLoading(true);
        try {
            const response = await intakeAPI.sendMessage(sessionId, userMessage);

            // Add assistant response
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                isEmergency: response.is_emergency
            }]);

            // Check if session is complete
            if (response.session_complete) {
                setSessionComplete(true);
                setTriageResult(response.triage);
                setStage('triage');

                // Fetch doctor matches
                if (response.suggested_specialties?.length > 0) {
                    const matches = await doctorAPI.matchDoctors(
                        response.triage?.specialties || ['General Medicine'],
                        response.triage?.priority || 'green'
                    );
                    setDoctorMatches(matches);
                }
            }
        } catch (error) {
            toast.error('Failed to send message. Please try again.');
            console.error(error);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const selectDoctor = async (doctor, slot) => {
        setIsLoading(true);
        try {
            const response = await doctorAPI.assignDoctor(sessionId, doctor.id, slot);
            if (response.success) {
                setSelectedDoctor({ ...doctor, slot, reasoning: response.assignment?.reasoning });
                setStage('complete');
                toast.success('Appointment booked successfully!');
            }
        } catch (error) {
            toast.error('Failed to book appointment. Please try again.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getTriageBadgeColor = (priority) => {
        switch (priority) {
            case 'red': return 'bg-red-500 text-white';
            case 'orange': return 'bg-orange-500 text-white';
            case 'yellow': return 'bg-yellow-500 text-gray-900';
            case 'green': return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const renderStartScreen = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[600px] text-center px-4"
        >
            <div className="w-24 h-24 rounded-full gradient-medical flex items-center justify-center mb-6">
                <span className="text-5xl">👋</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Patient Portal
            </h1>
            <p className="text-gray-600 max-w-md mb-8">
                I'm your virtual health assistant. I'll help you describe your symptoms
                and connect you with the right doctor.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl">
                <div className="card text-left">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                        <SparklesIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900">AI-Powered</h3>
                    <p className="text-sm text-gray-500">Smart symptom analysis</p>
                </div>
                <div className="card text-left">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-medium text-gray-900">Quick Triage</h3>
                    <p className="text-sm text-gray-500">Priority assessment</p>
                </div>
                <div className="card text-left">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                        <ClockIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-gray-900">Instant Match</h3>
                    <p className="text-sm text-gray-500">Find the right doctor</p>
                </div>
            </div>

            <button
                onClick={startSession}
                disabled={isLoading}
                className="btn-primary text-lg px-8 py-3 flex items-center gap-2"
            >
                {isLoading ? (
                    <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Starting...
                    </>
                ) : (
                    <>
                        Start Health Assessment
                        <SparklesIcon className="w-5 h-5" />
                    </>
                )}
            </button>

            <p className="text-xs text-gray-400 mt-4 max-w-md">
                ⚠️ This is not an emergency service. If you're experiencing a life-threatening
                emergency, please call 108 or 112 immediately.
            </p>
        </motion.div>
    );

    const renderChat = () => (
        <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
            {/* Chat header */}
            <div className="flex items-center justify-between pb-4 border-b mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-medical flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">Health Assistant</h2>
                        <p className="text-sm text-gray-500">
                            {sessionComplete ? 'Assessment Complete' : 'Gathering Information'}
                        </p>
                    </div>
                </div>
                {triageResult && (
                    <span className={clsx(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        getTriageBadgeColor(triageResult.priority)
                    )}>
                        {triageResult.priority?.toUpperCase()} Priority
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={clsx(
                                'flex gap-3',
                                message.role === 'user' ? 'flex-row-reverse' : ''
                            )}
                        >
                            <div className={clsx(
                                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                message.role === 'user'
                                    ? 'bg-primary-100'
                                    : message.isEmergency
                                        ? 'bg-red-100'
                                        : 'bg-gray-100'
                            )}>
                                {message.role === 'user' ? (
                                    <UserCircleIcon className="w-5 h-5 text-primary-600" />
                                ) : message.isEmergency ? (
                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                                ) : (
                                    <SparklesIcon className="w-5 h-5 text-gray-600" />
                                )}
                            </div>
                            <div className={clsx(
                                'max-w-[75%] rounded-2xl px-4 py-3',
                                message.role === 'user'
                                    ? 'bg-primary-600 text-white'
                                    : message.isEmergency
                                        ? 'bg-red-50 border border-red-200 text-gray-900'
                                        : 'bg-white border border-gray-200 text-gray-900'
                            )}>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {message.content}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <SparklesIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {!sessionComplete && (
                <div className="border-t pt-4">
                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your response..."
                            className="input-field flex-1"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="btn-primary px-4"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Show doctor selection button when complete */}
            {sessionComplete && stage === 'triage' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t pt-4"
                >
                    <button
                        onClick={() => setStage('doctor-select')}
                        className="btn-primary w-full py-3"
                    >
                        Find Available Doctors
                    </button>
                </motion.div>
            )}
        </div>
    );

    const renderDoctorSelection = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Select a Doctor</h2>
                    <p className="text-gray-600">Based on your symptoms, we recommend these specialists</p>
                </div>
                <button
                    onClick={() => setStage('triage')}
                    className="btn-secondary"
                >
                    Back to Chat
                </button>
            </div>

            {doctorMatches?.recommended_doctor && (
                <div className="card border-2 border-primary-500 relative">
                    <div className="absolute -top-3 left-4 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Best Match
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl">
                            👨‍⚕️
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {doctorMatches.recommended_doctor.name}
                            </h3>
                            <p className="text-primary-600 font-medium">
                                {doctorMatches.recommended_doctor.specialty}
                                {doctorMatches.recommended_doctor.subspecialty &&
                                    ` • ${doctorMatches.recommended_doctor.subspecialty}`}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span>⭐ {doctorMatches.recommended_doctor.rating}</span>
                                <span>📅 {doctorMatches.recommended_doctor.experience_years} years exp</span>
                                <span>💰 ₹{doctorMatches.recommended_doctor.consultation_fee}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {doctorMatches.recommended_doctor.languages?.map((lang, i) => (
                                    <span key={i} className="badge-blue">{lang}</span>
                                ))}
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Available Slots:</p>
                                <div className="flex flex-wrap gap-2">
                                    {doctorMatches.available_slots?.map((slot, i) => (
                                        <button
                                            key={i}
                                            onClick={() => selectDoctor(doctorMatches.recommended_doctor, slot)}
                                            disabled={isLoading}
                                            className="px-3 py-1.5 text-sm bg-primary-50 text-primary-700 
                               rounded-lg hover:bg-primary-100 transition-colors"
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary-600">
                                {doctorMatches.match_score}%
                            </div>
                            <div className="text-xs text-gray-500">Match Score</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alternative doctors */}
            {doctorMatches?.alternative_doctors?.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Other Available Doctors</h3>
                    <div className="grid gap-4">
                        {doctorMatches.alternative_doctors.map((doctor, i) => (
                            <div key={i} className="card-hover">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                                            👨‍⚕️
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{doctor.name}</h4>
                                            <p className="text-sm text-gray-600">{doctor.specialty}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-gray-500">⭐ {doctor.rating}</span>
                                        <span className="badge-blue">{doctor.match_score}%</span>
                                        <button
                                            onClick={() => selectDoctor(doctor, doctor.available_slots?.[0] || 'First Available')}
                                            disabled={isLoading}
                                            className="btn-secondary text-sm"
                                        >
                                            Select
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );

    const renderComplete = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[500px] text-center px-4"
        >
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-16 h-16 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Appointment Confirmed!
            </h1>
            <p className="text-gray-600 max-w-md mb-8">
                Your appointment has been scheduled successfully.
            </p>

            <div className="card max-w-md w-full text-left mb-8">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl">
                        👨‍⚕️
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{selectedDoctor?.name}</h3>
                        <p className="text-primary-600">{selectedDoctor?.specialty}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Appointment</span>
                        <span className="font-medium">{selectedDoctor?.slot}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Consultation Fee</span>
                        <span className="font-medium">₹{selectedDoctor?.consultation_fee}</span>
                    </div>
                    {triageResult && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Priority</span>
                            <span className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                getTriageBadgeColor(triageResult.priority)
                            )}>
                                {triageResult.priority?.toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={() => navigate('/patient/home', { state: { refreshAppointments: true } })}
                    className="btn-primary px-8"
                >
                    View My Appointments
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary px-8 block mt-3"
                >
                    Book Another Appointment
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            {stage === 'start' && renderStartScreen()}
            {(stage === 'chat' || stage === 'triage') && renderChat()}
            {stage === 'doctor-select' && renderDoctorSelection()}
            {stage === 'complete' && renderComplete()}
        </div>
    );
}
