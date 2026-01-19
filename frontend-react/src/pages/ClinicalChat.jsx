import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PaperAirplaneIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    DocumentMagnifyingGlassIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { chatAPI } from '../services/api';

export default function ClinicalChat() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: 'Hello! I\'m your Clinical AI Assistant. I can help you query patient records, find information about conditions, medications, and treatment plans. How can I assist you today?',
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const suggestedQueries = [
        'Show me patients with diabetes',
        'What are the common symptoms of hypertension?',
        'Find records with ICD code I10',
        'Summarize last 5 cardiology encounters',
        'What medications are prescribed for heart failure?'
    ];

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async (text = input) => {
        if (!text.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatAPI.send(text.trim(), sessionId);

            if (!sessionId && response.session_id) {
                setSessionId(response.session_id);
            }

            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.response,
                sources: response.sources || [],
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Failed to get response');
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please try again.',
                isError: true,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = async () => {
        if (sessionId) {
            try {
                await chatAPI.clearHistory(sessionId);
            } catch (error) {
                console.error('Failed to clear server history');
            }
        }

        setMessages([{
            id: Date.now(),
            role: 'assistant',
            content: 'Chat cleared. How can I help you?',
            timestamp: new Date().toISOString()
        }]);
        setSessionId(null);
        toast.success('Chat history cleared');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="w-7 h-7 text-primary-600" />
                        Clinical Assistant
                    </h1>
                    <p className="text-gray-600">AI-powered clinical data queries</p>
                </div>
                <button onClick={clearChat} className="btn-secondary text-sm">
                    Clear Chat
                </button>
            </div>

            {/* Chat Container */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={clsx(
                                    'flex',
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                <div
                                    className={clsx(
                                        'max-w-[75%] rounded-2xl px-4 py-3',
                                        message.role === 'user'
                                            ? 'bg-primary-600 text-white'
                                            : message.isError
                                                ? 'bg-red-50 text-red-800 border border-red-200'
                                                : 'bg-gray-100 text-gray-800'
                                    )}
                                >
                                    {message.role === 'assistant' && !message.isError && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <SparklesIcon className="w-4 h-4 text-primary-600" />
                                            <span className="text-xs font-medium text-primary-600">AI Assistant</span>
                                        </div>
                                    )}
                                    <p className="whitespace-pre-wrap">{message.content}</p>

                                    {/* Sources */}
                                    {message.sources?.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                                <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                                                Sources
                                            </p>
                                            <div className="space-y-1">
                                                {message.sources.map((source, i) => (
                                                    <div key={i} className="text-xs text-gray-600 bg-white rounded px-2 py-1">
                                                        {source.title || source.document || `Source ${i + 1}`}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className={clsx(
                                        'text-xs mt-2',
                                        message.role === 'user' ? 'text-primary-200' : 'text-gray-400'
                                    )}>
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-sm text-gray-500">Thinking...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Queries */}
                {messages.length <= 2 && (
                    <div className="px-4 pb-2">
                        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <BookOpenIcon className="w-4 h-4" />
                            Try asking:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQueries.map((query, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(query)}
                                    className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-primary-100 text-gray-700 hover:text-primary-700 rounded-full transition-colors"
                                >
                                    {query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about patient data, conditions, or treatments..."
                            className="flex-1 input-field"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="btn-primary px-4"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        Clinical AI uses RAG to search through patient records securely
                    </p>
                </div>
            </div>
        </div>
    );
}
