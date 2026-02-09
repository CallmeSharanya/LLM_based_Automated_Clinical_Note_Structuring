import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MicrophoneIcon,
    StopIcon,
    SpeakerWaveIcon
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

/**
 * VoiceInput Component
 * Provides speech-to-text functionality using Web Speech API
 * 
 * Props:
 * - onTranscript: (text: string) => void - Called when speech is recognized
 * - onFinalTranscript: (text: string) => void - Called when final transcript is ready
 * - disabled: boolean - Disable the voice input
 * - className: string - Additional CSS classes
 * - placeholder: string - Text to show when not recording
 */
export default function VoiceInput({
    onTranscript,
    onFinalTranscript,
    disabled = false,
    className = '',
    placeholder = 'Click to start recording...'
}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(0);

    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        // Initialize speech recognition
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            startAudioAnalysis();
        };

        recognition.onend = () => {
            setIsListening(false);
            stopAudioAnalysis();

            // Send final transcript
            if (transcript && onFinalTranscript) {
                onFinalTranscript(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            stopAudioAnalysis();

            switch (event.error) {
                case 'not-allowed':
                    setError('Microphone access denied. Please allow microphone access.');
                    break;
                case 'no-speech':
                    setError('No speech detected. Please try again.');
                    break;
                case 'audio-capture':
                    setError('No microphone found. Please connect a microphone.');
                    break;
                default:
                    setError(`Error: ${event.error}`);
            }
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript + ' ';
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                const newTranscript = transcript + final;
                setTranscript(newTranscript);
                if (onTranscript) {
                    onTranscript(newTranscript);
                }
            }

            setInterimTranscript(interim);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            stopAudioAnalysis();
        };
    }, [transcript, onTranscript, onFinalTranscript]);

    const startAudioAnalysis = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;

            const updateVolume = () => {
                if (!analyserRef.current) return;

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(average / 255);

                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };

            updateVolume();
        } catch (e) {
            console.error('Audio analysis error:', e);
        }
    };

    const stopAudioAnalysis = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setVolume(0);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setTranscript('');
            setInterimTranscript('');
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Recognition might already be running
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            }
        }
    };

    const clearTranscript = () => {
        setTranscript('');
        setInterimTranscript('');
        if (onTranscript) {
            onTranscript('');
        }
    };

    if (!isSupported) {
        return (
            <div className={clsx('p-4 bg-yellow-50 rounded-xl border border-yellow-200', className)}>
                <p className="text-sm text-yellow-700 flex items-center gap-2">
                    <SpeakerWaveIcon className="w-5 h-5" />
                    {error || 'Voice input not supported in this browser'}
                </p>
            </div>
        );
    }

    return (
        <div className={clsx('space-y-4', className)}>
            {/* Recording Button */}
            <div className="flex items-center gap-4">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleListening}
                    disabled={disabled}
                    className={clsx(
                        'relative flex items-center justify-center w-16 h-16 rounded-full transition-all shadow-lg',
                        isListening
                            ? 'bg-red-500 text-white shadow-red-500/50'
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    {/* Animated rings when listening */}
                    <AnimatePresence>
                        {isListening && (
                            <>
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: 1.5 + volume * 0.5, opacity: 0 }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-red-400"
                                />
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.3 }}
                                    animate={{ scale: 1.3 + volume * 0.3, opacity: 0 }}
                                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                                    className="absolute inset-0 rounded-full bg-red-400"
                                />
                            </>
                        )}
                    </AnimatePresence>

                    {isListening ? (
                        <StopIcon className="w-8 h-8 relative z-10" />
                    ) : (
                        <MicrophoneIcon className="w-8 h-8 relative z-10" />
                    )}
                </motion.button>

                <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                        {isListening ? 'Listening...' : 'Voice Input'}
                    </p>
                    <p className="text-sm text-gray-500">
                        {isListening
                            ? 'Speak clearly into your microphone'
                            : 'Click to start recording your clinical notes'}
                    </p>
                </div>

                {transcript && (
                    <button
                        onClick={clearTranscript}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Volume Indicator */}
            {isListening && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                >
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600"
                            style={{ width: `${Math.min(volume * 100 * 2, 100)}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 w-12">
                        {Math.round(volume * 100)}%
                    </span>
                </motion.div>
            )}

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                    <p className="text-sm text-red-700">{error}</p>
                </motion.div>
            )}

            {/* Transcript Display */}
            {(transcript || interimTranscript) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                        Transcript
                    </label>
                    <p className="text-gray-900">
                        {transcript}
                        <span className="text-gray-400 italic">{interimTranscript}</span>
                    </p>
                </motion.div>
            )}
        </div>
    );
}
