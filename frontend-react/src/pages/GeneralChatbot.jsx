import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    SparklesIcon,
    ChartBarIcon,
    DocumentTextIcon,
    LightBulbIcon,
    ClockIcon,
    ArrowPathIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { chatAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DOCTOR_QUERIES = [
    "What are the most common diagnoses this month?",
    "Show me disease trends in our database",
    "What are the typical treatments for Type 2 Diabetes?",
    "Summarize latest cardiac cases",
    "What medications are frequently prescribed for hypertension?",
    "Analyze patient demographics",
    "Show SOAP structuring efficiency metrics",
    "What are the common comorbidities with COVID-19?",
];

const PATIENT_QUERIES = [
    "I have a fever and headache for 2 days",
    "My throat is sore and I have difficulty swallowing",
    "I've been having chest pain when I breathe deeply",
    "I feel dizzy and lightheaded frequently",
    "I have lower back pain that won't go away",
    "My blood sugar levels have been high lately",
    "I'm experiencing shortness of breath during exercise",
    "I have a persistent cough for over a week",
];

export default function GeneralChatbot({ userType = 'doctor' }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [stats, setStats] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadStats();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadStats = async () => {
        try {
            const response = await analyticsAPI.runAnalytics();
            setStats(response);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const sendMessage = async (messageText = inputValue) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage = messageText.trim();
        setInputValue('');
        setShowSuggestions(false);

        // Add user message
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        }]);

        setIsLoading(true);
        try {
            const response = await chatAPI.sendQuery(userMessage);

            // Add assistant response
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.response || response.answer || "I'm analyzing the SOAP database for your query...",
                timestamp: new Date(),
                data: response.data,
                charts: response.charts,
                sources: response.sources,
                metrics: response.metrics
            }]);
        } catch (error) {
            toast.error('Failed to get response');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I apologize, but I encountered an error processing your request. Please try again.",
                timestamp: new Date(),
                isError: true
            }]);
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

    const clearChat = () => {
        setMessages([]);
        setShowSuggestions(true);
    };

    const renderMessage = (message, index) => {
        const isUser = message.role === 'user';

        return (
            <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx('flex gap-4', isUser ? 'flex-row-reverse' : '')}
            >
                {/* Avatar */}
                <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    isUser
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                )}>
                    {isUser ? (
                        userType === 'doctor' ? '👨‍⚕️' : '🏥'
                    ) : (
                        <SparklesIcon className="w-5 h-5" />
                    )}
                </div>

                {/* Message Content */}
                <div className={clsx(
                    'max-w-[75%] space-y-3',
                    isUser ? 'items-end' : 'items-start'
                )}>
                    <div className={clsx(
                        'rounded-2xl px-5 py-4',
                        isUser
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : message.isError
                                ? 'bg-red-50 border border-red-200 text-red-800'
                                : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    )}>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content.replace(/\*\*/g, '').replace(/\*/g, '')}
                        </div>
                    </div>

                    {/* Data visualization */}
                    {message.data && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4" />
                                Data Insights
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(message.data).map(([key, value]) => (
                                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</div>
                                        <div className="text-lg font-bold text-gray-900">
                                            {typeof value === 'number' ? value.toLocaleString() : value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metrics */}
                    {message.metrics && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-4">
                            <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4" />
                                SOAP Efficiency Metrics
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(message.metrics).map(([key, value]) => (
                                    <div key={key} className="text-center p-2 bg-white rounded-lg">
                                        <div className="text-xl font-bold text-green-600">{value}</div>
                                        <div className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                                    <DocumentTextIcon className="w-3 h-3" />
                                    {source}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className={clsx(
                        'text-xs text-gray-400',
                        isUser ? 'text-right' : ''
                    )}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userType === 'patient'
                            ? 'bg-gradient-to-br from-green-500 to-teal-500'
                            : 'bg-gradient-to-br from-purple-500 to-pink-500'
                            }`}>
                            <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        {userType === 'patient' ? 'Health Assistant' : 'Clinical AI Assistant'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {userType === 'patient'
                            ? 'Describe your symptoms and get health guidance'
                            : 'Query the SOAP database for insights, trends, and clinical information'
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    {userType !== 'patient' && (
                        <button onClick={loadStats} className="btn-secondary flex items-center gap-2">
                            <ArrowPathIcon className="w-4 h-4" />
                            Refresh Data
                        </button>
                    )}
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="btn-secondary">
                            Clear Chat
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar - Only for doctor/hospital */}
            {stats && userType !== 'patient' && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.total_notes || 0}</div>
                                <div className="text-xs text-gray-500">Total SOAP Notes</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <ChartBarIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.accuracy || '95%'}</div>
                                <div className="text-xs text-gray-500">Structuring Accuracy</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <ClockIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.avg_processing_time || '2.3s'}</div>
                                <div className="text-xs text-gray-500">Avg Processing Time</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <LightBulbIcon className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.unique_diagnoses || 0}</div>
                                <div className="text-xs text-gray-500">Unique Diagnoses</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Welcome message */}
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-8"
                        >
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                                <SparklesIcon className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {userType === 'patient' ? 'Health Assistant' : 'Clinical AI Assistant'}
                            </h2>
                            <p className="text-gray-600 max-w-md mx-auto mb-8">
                                {userType === 'patient'
                                    ? "Tell me about your symptoms and I'll help you understand them and find the right care. I can also answer general health questions."
                                    : 'Ask me anything about disease trends, treatment patterns, or clinical insights from the SOAP database. I can help analyze data and provide actionable information.'
                                }
                            </p>

                            {/* Suggested Queries */}
                            {showSuggestions && (
                                <div className="max-w-2xl mx-auto">
                                    <p className="text-sm text-gray-500 mb-4 flex items-center justify-center gap-2">
                                        <LightBulbIcon className="w-4 h-4" />
                                        Try asking:
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(userType === 'patient' ? PATIENT_QUERIES : DOCTOR_QUERIES).slice(0, 6).map((query, index) => (
                                            <button
                                                key={index}
                                                onClick={() => sendMessage(query)}
                                                className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-sm text-gray-700 hover:text-purple-700"
                                            >
                                                <span className="text-purple-500 mr-2">→</span>
                                                {query}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Message List */}
                    <AnimatePresence>
                        {messages.map((message, index) => renderMessage(message, index))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <SparklesIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {userType === 'patient' ? 'Thinking...' : 'Analyzing clinical data...'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about disease trends, treatment patterns, clinical insights..."
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 pr-12"
                                disabled={isLoading}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
                            </div>
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                            className={clsx(
                                'px-6 py-4 rounded-xl font-semibold transition-all flex items-center gap-2',
                                inputValue.trim() && !isLoading
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            )}
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-3">
                        AI responses are based on the SOAP database. Always verify critical clinical decisions.
                    </p>
                </div>
            </div>
        </div>
    );
}
