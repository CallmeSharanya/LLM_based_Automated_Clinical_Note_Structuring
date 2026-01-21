import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { intakeAPI, doctorAPI, appointmentAPI } from '../services/api';

export default function PatientIntake() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEmergency = searchParams.get('emergency') === 'true';
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [triageResult, setTriageResult] = useState(null);
    const [matchedDoctors, setMatchedDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showDoctors, setShowDoctors] = useState(false);
    const [bookingConfirmed, setBookingConfirmed] = useState(false);

    // Dynamic chat tracking
    const [turnCount, setTurnCount] = useState(0);
    const [maxTurns, setMaxTurns] = useState(8);
    const [soapNote, setSoapNote] = useState(null);

    // Voice recording state (using Web Speech API)
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Prevent double initialization (React StrictMode)
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            startSession();
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startSession = async () => {
        try {
            const response = await intakeAPI.startSession(user?.id);
            setSessionId(response.session_id);
            // Use backend greeting if provided, otherwise use default
            if (response.message) {
                addAssistantMessage(response.message);
            } else {
                addAssistantMessage(
                    isEmergency
                        ? `🚨 Emergency Mode Active\n\nI understand this is urgent. Let me help you quickly.\n\n**What brings you in today? What's your main health concern?**`
                        : `Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋\n\nI'm your AI health assistant. I'll ask you some questions about your symptoms.\n\n🎤 **You can type or use the microphone button to speak your symptoms.**\n\n**What brings you in today? What's your main health concern?**`
                );
            }
        } catch (error) {
            setSessionId(`session-${Date.now()}`);
            addAssistantMessage(
                `Hello! 👋\n\nI'm your AI health assistant. I'll ask you some questions about your symptoms.\n\n🎤 **You can type or use the microphone button to speak your symptoms.**\n\n**What brings you in today? What's your main health concern?**`
            );
        }
    };

    const addAssistantMessage = (content) => {
        setMessages(prev => [...prev, {
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
        }]);
    };

    // Voice Recognition using Web Speech API (works in Chrome, Edge)
    const recognitionRef = useRef(null);

    const startRecording = () => {
        // Check if Web Speech API is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        try {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setIsRecording(true);
                setIsTranscribing(false);
            };

            recognitionRef.current.onresult = (event) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setInputMessage(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
                // Auto-send if we have text
                if (inputMessage.trim()) {
                    setTimeout(() => {
                        sendMessageWithText(inputMessage);
                    }, 300);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
                if (event.error === 'not-allowed') {
                    alert('Microphone access denied. Please allow microphone permissions.');
                }
            };

            recognitionRef.current.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            alert('Could not start voice recognition. Please try again.');
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendMessageWithText = async (text) => {
        if (!text.trim() || loading) return;

        const userMessage = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setLoading(true);

        try {
            const response = await intakeAPI.sendMessage(sessionId, text, user?.id);

            if (response.turn_count) setTurnCount(response.turn_count);
            if (response.max_turns) setMaxTurns(response.max_turns);

            if (response.session_complete) {
                handleSessionComplete(response);
            } else if (response.is_emergency) {
                addAssistantMessage(response.message);
                setTriageResult({ priority: 'red', score: 10 });
            } else {
                addAssistantMessage(response.message);
            }
        } catch (error) {
            addAssistantMessage('I apologize, I had trouble processing that. Could you please try again?');
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const sendMessage = () => sendMessageWithText(inputMessage);

    const handleSessionComplete = (response) => {
        if (response.triage) {
            setTriageResult({
                priority: response.triage.priority,
                score: response.triage.score,
                specialty: response.suggested_specialties?.[0] || 'General Medicine'
            });
        }

        if (response.preliminary_soap) {
            setSoapNote(response.preliminary_soap);
        }

        setSessionComplete(true);
        addAssistantMessage(response.message);
    };

    const handleUserConfirmation = () => {
        if (!inputMessage.trim() || loading) return;

        const userResponse = inputMessage.toLowerCase().trim();

        setMessages(prev => [...prev, {
            role: 'user',
            content: inputMessage,
            timestamp: new Date().toISOString(),
        }]);
        setInputMessage('');

        if (userResponse === 'yes' || userResponse === 'y' || userResponse.includes('yes')) {
            setShowDoctors(true);
            matchDoctors(triageResult?.specialty || 'General Medicine', triageResult?.priority);
            addAssistantMessage('Finding the best available doctors for you...');
        } else {
            addAssistantMessage('No problem! Please share any additional information about your symptoms.');
            setSessionComplete(false);
        }
    };

    const matchDoctors = async (specialty, priority) => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Fetch doctors from Supabase with real availability
            const response = await appointmentAPI.getDoctors(specialty);

            if (response.success && response.doctors?.length > 0) {
                // Transform doctors data for display
                const doctors = response.doctors.map((doc, index) => ({
                    id: doc.id,
                    name: doc.name,
                    specialty: doc.specialty || 'General Medicine',
                    subspecialty: doc.subspecialty,
                    rating: doc.rating || 4.5,
                    reviews: doc.reviews || 100,
                    experience_years: doc.experience_years || 5,
                    available_slots: doc.available_slots || [], // Parsed from availability JSONB
                    consultation_fee: doc.consultation_fee || 500,
                    languages: doc.languages || ['English', 'Hindi'],
                    nextAvailable: doc.available_slots?.[0]?.display || 'Check availability',
                    current_load: doc.current_load || 0,
                    max_load: doc.max_load || 20
                }));
                setMatchedDoctors(doctors);
            } else {
                // Fallback to doctor matching agent if Supabase returns no results
                const matchResponse = await doctorAPI.matchDoctors(['symptoms'], priority || 'yellow');
                const doctors = matchResponse.alternative_doctors || [];
                if (matchResponse.recommended_doctor) {
                    doctors.unshift(matchResponse.recommended_doctor);
                }
                setMatchedDoctors(doctors);
            }
        } catch (error) {
            console.error('Error fetching doctors:', error);
            // Fallback to mock data
            setMatchedDoctors([
                {
                    id: 'doc-001',
                    name: 'Dr. Ananya Patel',
                    specialty: specialty || 'General Medicine',
                    subspecialty: 'Internal Medicine',
                    rating: 4.9,
                    reviews: 284,
                    experience_years: 12,
                    available_slots: [
                        { date: new Date().toISOString().split('T')[0], day: 'Today', time: '14:00-15:00', display: 'Today at 14:00' },
                        { date: new Date().toISOString().split('T')[0], day: 'Today', time: '17:00-18:00', display: 'Today at 17:00' }
                    ],
                    consultation_fee: 800,
                    languages: ['English', 'Hindi', 'Kannada'],
                    nextAvailable: 'Today at 14:00',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async () => {
        if (!selectedDoctor || !selectedSlot) return;
        setLoading(true);

        try {
            // Book appointment using new Supabase-backed API
            const bookingResult = await appointmentAPI.book(
                user?.id || 'guest',
                selectedDoctor.id,
                selectedSlot.date,
                selectedSlot.time,
                selectedDoctor.specialty,
                sessionId,
                'Consultation'
            );

            if (bookingResult.success) {
                addAssistantMessage(`🎉 **Appointment Confirmed!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Doctor:** ${selectedDoctor.name}
**Specialty:** ${selectedDoctor.specialty}
**Date:** ${selectedSlot.date}
**Time:** ${selectedSlot.time}
**Fee:** ₹${selectedDoctor.consultation_fee}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Your preliminary assessment has been shared with the doctor.
📧 You'll receive a confirmation email shortly.
📱 Reminder will be sent 1 hour before the appointment.

Redirecting to your dashboard...`);

                setTimeout(() => {
                    navigate('/patient/home', {
                        state: {
                            message: 'Appointment booked successfully!',
                            appointment: { doctor: selectedDoctor, slot: selectedSlot }
                        }
                    });
                }, 3000);
            } else {
                addAssistantMessage(`❌ **Booking Failed**\n\nSorry, we couldn't book this appointment. ${bookingResult.error || 'Please try again.'}`);
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            // Fallback to old method
            try {
                await doctorAPI.assignDoctor(sessionId, selectedDoctor.id, selectedSlot.display || selectedSlot);
            } catch (e) {
                // Ignore
            }

            addAssistantMessage(`🎉 **Appointment Confirmed!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Doctor:** ${selectedDoctor.name}
**Specialty:** ${selectedDoctor.specialty}
**Time:** ${selectedSlot.display || selectedSlot}
**Fee:** ₹${selectedDoctor.consultation_fee}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Your preliminary assessment has been shared with the doctor.
📧 You'll receive a confirmation email shortly.
📱 Reminder will be sent 1 hour before the appointment.

Redirecting to your dashboard...`);

            setTimeout(() => {
                navigate('/patient/home', {
                    state: {
                        message: 'Appointment booked successfully!',
                        appointment: { doctor: selectedDoctor, slot: selectedSlot }
                    }
                });
            }, 3000);
        }

        setLoading(false);
    };

    const getPriorityConfig = (priority) => {
        const configs = {
            red: { badge: 'bg-red-100 text-red-700 border-red-200', label: 'Emergency', icon: '🔴' },
            orange: { badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Urgent', icon: '🟠' },
            yellow: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Semi-Urgent', icon: '🟡' },
            green: { badge: 'bg-green-100 text-green-700 border-green-200', label: 'Routine', icon: '🟢' },
        };
        return configs[priority] || configs.green;
    };

    const renderMessage = (content) => {
        return content.split('\n').map((line, i) => {
            let formattedLine = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
            );
            if (line.includes('━━━')) {
                return <div key={i} className="border-t border-gray-200 my-3"></div>;
            }
            return <div key={i} className={line.trim() === '' ? 'h-2' : ''}>{formattedLine}</div>;
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
            {/* Premium Header */}
            <header className={`${isEmergency
                ? 'bg-gradient-to-r from-red-600 to-red-700'
                : 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50'} 
                sticky top-0 z-50 shadow-sm`}>
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/patient/home')}
                                className={`p-2 rounded-xl transition-all duration-200 ${isEmergency
                                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div>
                                <h1 className={`text-lg font-semibold ${isEmergency ? 'text-white' : 'text-gray-900'}`}>
                                    {isEmergency ? '🚨 Emergency Assessment' : 'AI Health Assistant'}
                                </h1>
                                <p className={`text-sm ${isEmergency ? 'text-white/70' : 'text-gray-500'}`}>
                                    {sessionComplete ? 'Assessment Complete' : turnCount > 0 ? `Turn ${turnCount} of ~${maxTurns}` : 'Starting conversation...'}
                                </p>
                            </div>
                        </div>
                        {triageResult && (
                            <div className={`px-4 py-2 rounded-full text-sm font-medium border backdrop-blur-sm ${getPriorityConfig(triageResult.priority).badge}`}>
                                {getPriorityConfig(triageResult.priority).icon} {getPriorityConfig(triageResult.priority).label}
                            </div>
                        )}
                    </div>
                    {!sessionComplete && turnCount > 0 && (
                        <div className="mt-4">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min((turnCount / maxTurns) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <div className="space-y-6">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg mr-3 shadow-lg shadow-blue-500/20">
                                        🤖
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-blue-500/25'
                                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-lg shadow-gray-200/50 border border-gray-100'
                                        } px-5 py-4`}
                                >
                                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                                        {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                                    </div>
                                    <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg ml-3">
                                        {user?.name?.[0]?.toUpperCase() || '👤'}
                                    </div>
                                )}
                            </div>
                        ))}

                        {(loading || isTranscribing) && (
                            <div className="flex justify-start animate-fadeIn">
                                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg mr-3">
                                    🤖
                                </div>
                                <div className="bg-white rounded-2xl rounded-bl-md px-5 py-4 shadow-lg shadow-gray-200/50 border border-gray-100">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                        <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                        {isTranscribing && <span className="ml-2 text-sm text-gray-500">Transcribing...</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Doctor Selection Cards */}
                    {showDoctors && matchedDoctors.length > 0 && (
                        <div className="mt-10 animate-fadeIn">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Available Specialists</h2>
                                    <p className="text-gray-500 text-sm">Select a doctor and appointment time</p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {matchedDoctors.map((doc, index) => (
                                    <div
                                        key={doc.id}
                                        onClick={() => {
                                            setSelectedDoctor(doc);
                                            setSelectedSlot(null);
                                        }}
                                        className={`group relative bg-white rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${selectedDoctor?.id === doc.id
                                            ? 'border-indigo-500 shadow-2xl shadow-indigo-500/15 scale-[1.01] ring-4 ring-indigo-500/10'
                                            : 'border-gray-100 hover:border-gray-200 hover:shadow-xl'
                                            }`}
                                    >
                                        {index === 0 && (
                                            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-xl">
                                                ⭐ Best Match
                                            </div>
                                        )}
                                        <div className="p-6">
                                            <div className="flex items-start gap-5">
                                                <div className="flex-shrink-0">
                                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-3xl">
                                                        👨‍⚕️
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                {doc.name}
                                                            </h3>
                                                            <p className="text-blue-600 font-medium text-sm mt-0.5">
                                                                {doc.specialty}
                                                                {doc.subspecialty && <span className="text-gray-400"> • {doc.subspecialty}</span>}
                                                            </p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1 rounded-full">
                                                                <span className="text-yellow-500">★</span>
                                                                <span className="font-bold text-gray-900">{doc.rating}</span>
                                                                <span className="text-gray-400 text-sm">({doc.reviews})</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            {doc.experience_years} years exp
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-green-600 font-medium">Next: {doc.nextAvailable}</span>
                                                        </span>
                                                    </div>
                                                    <div className="mt-3">
                                                        <span className="text-2xl font-bold text-gray-900">₹{doc.consultation_fee}</span>
                                                        <span className="text-gray-400 text-sm ml-1">consultation</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedDoctor?.id === doc.id && (
                                                <div className="mt-6 pt-6 border-t border-gray-100 animate-fadeIn">
                                                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Select Appointment Time
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        {doc.available_slots?.slice(0, 8).map((slot, idx) => {
                                                            // Handle both object format and string format
                                                            const slotDisplay = typeof slot === 'object' ? slot.display : slot;
                                                            const slotDay = typeof slot === 'object' ? slot.day : (slot?.includes('Today') ? 'Today' : slot?.includes('Tomorrow') ? 'Tomorrow' : '');
                                                            const slotTime = typeof slot === 'object' ? slot.time?.split('-')[0] : (slot?.split(', ')[1] || slot);
                                                            const isSelected = selectedSlot === slot || (selectedSlot?.time === slot?.time && selectedSlot?.date === slot?.date);

                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSlot(slot);
                                                                    }}
                                                                    className={`px-4 py-3.5 text-sm font-semibold rounded-xl border-2 transition-all duration-200 ${isSelected
                                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-500/30 scale-105'
                                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md'
                                                                        }`}
                                                                >
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                                                            📅 {slotDay}
                                                                        </span>
                                                                        <span>{slotTime}</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {selectedSlot && (
                                                        <div className="mt-5 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 animate-fadeIn">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-gray-600">Selected Appointment</p>
                                                                        <p className="font-bold text-gray-900">
                                                                            {typeof selectedSlot === 'object'
                                                                                ? `${selectedSlot.day}, ${selectedSlot.date} at ${selectedSlot.time?.split('-')[0]}`
                                                                                : selectedSlot
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm text-gray-600">Consultation Fee</p>
                                                                    <p className="font-bold text-xl text-indigo-600">₹{doc.consultation_fee}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedDoctor && selectedSlot && (
                                <div className="mt-10 animate-fadeIn">
                                    <button
                                        onClick={handleBookAppointment}
                                        disabled={loading}
                                        className="w-full py-5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-green-500/30 hover:shadow-3xl hover:shadow-green-500/40 hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                        {loading ? (
                                            <>
                                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Confirming your appointment...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Confirm Appointment with {selectedDoctor.name}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Input Area with Voice Button */}
            {!showDoctors && (
                <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 px-6 py-4 shadow-lg">
                    <div className="max-w-4xl mx-auto">
                        {!sessionComplete && (
                            <p className="text-xs text-gray-400 mb-2 ml-1">
                                💡 Share details about your symptoms - type or use 🎤 to speak
                            </p>
                        )}
                        <div className="flex gap-3">
                            {/* Microphone Button */}
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={loading || isTranscribing}
                                className={`px-4 py-4 rounded-2xl transition-all duration-200 ${isRecording
                                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={isRecording ? 'Stop recording' : 'Start voice input'}
                            >
                                {isTranscribing ? (
                                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : isRecording ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                )}
                            </button>

                            <div className="flex-1 relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (sessionComplete && !showDoctors ? handleUserConfirmation() : sendMessage())}
                                    placeholder={isRecording ? '🎤 Recording...' : sessionComplete ? 'Type Yes to find doctors or No to add more info...' : 'Type or speak your symptoms...'}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-400"
                                    disabled={loading || isRecording}
                                />
                            </div>
                            <button
                                onClick={sessionComplete && !showDoctors ? handleUserConfirmation : sendMessage}
                                disabled={loading || !inputMessage.trim() || isRecording}
                                className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {isRecording && (
                            <p className="text-center text-red-500 text-sm mt-2 animate-pulse">
                                🎤 Recording... Click the microphone button to stop
                            </p>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}